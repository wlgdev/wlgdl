import { Hono } from "@hono/hono";
import { streamText } from "@hono/hono/streaming";
import { parseArgs } from "@std/cli";
import { join, normalize } from "@std/path";
import { type Spinner } from "@std/cli/unstable-spinner";
import { promptSelect } from "@std/cli/unstable-prompt-select";
import { green, red } from "@std/fmt/colors";
import { Twitch, TwtichHLSSourceFormat, Vk, VkHLSSourceFormat } from "@shevernitskiy/scraperator";
import { Api } from "@grammyjs/grammy";
import { downloadLiveHLSAudio } from "./ffmpeg.ts";
import { exist, generateFilename, getDateString, message, spinnerStart, spinnerStop, table } from "./utils.ts";

const args = parseArgs<Record<string, string>>(Deno.args);

const ffmpeg_defaults: Record<string, string> = {
  "VIDEO COPY":
    '-loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 10 -user_agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" -seg_max_retry 5 -i {url} -c copy {file}',
  "AUDIO COPY":
    "-loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 10 -i {url} -seg_max_retry 5 -map 0:a:0 -c:a copy -copyts {file}",
  "AUDIO TRANSCODING":
    "-loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 10 -i {url} -seg_max_retry 5 -map 0:a:0 -af asetpts=PTS-STARTPTS -c:a aac -q:a 5 -avoid_negative_ts make_zero -fflags +genpts {file}",
};

let choosed_ffmpeg = args.ffmpeg || ffmpeg_defaults["VIDEO COPY"];
let ext = args.ext || "mp4";

if (!choosed_ffmpeg) {
  const select = promptSelect("select ffmpeg mode", Object.keys(ffmpeg_defaults), { clear: true });
  if (select === null) {
    Deno.exit(1);
  } else {
    choosed_ffmpeg = ffmpeg_defaults[select];
    if (!ext && select.startsWith("AUDIO")) {
      ext = "aac";
    }
    if (!ext && select.startsWith("VIDEO")) {
      ext = "mp4";
    }
  }
}

export const config = {
  device_id: args.device_id || Deno.env.get("DEVICE_ID") || "",
  channel: args.channel || "welovegames",
  bin: args.bin
    ? normalize(args.bin)
    : normalize(Deno.build.os === "windows" ? join(Deno.cwd(), "./ffmpeg.exe") : "ffmpeg"),
  ffmpeg: choosed_ffmpeg,
  format: args.format || "1080p60",
  dir: args.dir ? join(Deno.cwd(), args.dir) : Deno.cwd(),
  ext: ext,
  os: Deno.build.os,
  tg_token: args.tg_token || Deno.env.get("TELEGRAM_TOKEN") || "",
  tg_id: (args.tg_id || "").toString(),
  ip: args.ip || "0.0.0.0",
  port: args.port || "16969",
  http_delay: parseInt(args.http_delay) || 500,
  vk_token: args.vk_token || undefined,
};

if (Deno.build.os === "windows" && !(await exist(config.bin))) {
  console.error(red(`ffmpeg not found at ${config.bin}`));
  Deno.exit(1);
}
if (!(await exist(config.dir))) {
  console.error(red(`output directory ${config.dir} not exists`));
  Deno.exit(1);
}
if (!config.ffmpeg.includes("{url}") || !config.ffmpeg.includes("{file}")) {
  console.error(red(`ffmpeg command is not valid, {url} or {file} not found as source`));
  Deno.exit(1);
}
if (!config.ffmpeg || !config.ext) {
  console.error(red(`ffmpeg or ext not found`));
  Deno.exit(1);
}

export const app: {
  state: "SCAN" | "DOWNLOAD" | "CHECK";
  spinner?: Spinner;
  tg: Api;
  shutdown: boolean;
  child?: Deno.ChildProcess;
} = {
  state: "SCAN",
  tg: new Api(config.tg_token),
  shutdown: false,
};

async function handleExitSignal() {
  if (app.shutdown) return;
  app.shutdown = true;
  spinnerStop();
  console.log(`${green("√")} ${getDateString()} | exit signal received, shutting down gracefully...`);

  if (app.child) {
    try {
      const stdinWriter = app.child.stdin.getWriter();
      await stdinWriter.write(new TextEncoder().encode("q"));
      await stdinWriter.close();
    } catch (e) {
      if (!(e instanceof Deno.errors.BrokenPipe)) {
        console.error("failed to send 'q' to FFmpeg.", e);
      }
    }
  }
}

Deno.addSignalListener("SIGINT", handleExitSignal);
if (Deno.build.os === "linux") {
  Deno.addSignalListener("SIGTERM", handleExitSignal);
}

table(config);
spinnerStart("stream offline | waiting...", "yellow");

async function checkStreamStatus(): Promise<void> {
  if (app.state !== "SCAN" || app.shutdown) return;

  app.state = "CHECK";
  spinnerStart("stream offline | checking...", "yellow");
  const twitch = new Twitch(config.channel);
  const twitchStream = await twitch.streamInfo().catch(() => {
    spinnerStart("stream offline | error on twitch request", "red");
  });

  const vk = new Vk(config.channel, {
    accessToken: config.vk_token,
  });
  const vkStream = await vk.streamInfo().catch(() => {
    spinnerStart("stream offline | error on vk request", "red");
  });

  if (app.shutdown) {
    spinnerStop();
    return;
  }

  let master: TwtichHLSSourceFormat[] | VkHLSSourceFormat[] | undefined;

  if (!twitchStream?.online && !vkStream?.online) {
    spinnerStart("stream offline | waiting...", "yellow");
    return;
  }

  if (vkStream?.online && vkStream.hls) {
    master = await vk.liveHLSMetadata(vkStream.hls).catch(() => {
      spinnerStart("stream online | error on vk hls request", "red");
      return undefined;
    });
  } else if (twitchStream?.online) {
    master = await twitch.liveHLSMetadata(config.device_id).catch(() => {
      spinnerStart("stream online | error on twitch hls request", "red");
      return undefined;
    });
  }

  if (!master || app.shutdown) {
    spinnerStop();
    return;
  }

  let format = master.find((f) => f.resolution === config.format || f.video === config.format);
  if (!format) {
    spinnerStart(`stream online | stream has no quality ${config.format}, getting best avaible`, "red");
    format = master.at(0);
  }
  if (!format) {
    spinnerStart("stream online | stream has no playlist, stopping", "red");
    return;
  }

  const filename = normalize(
    join(
      config.dir,
      generateFilename(
        twitchStream?.online ? "twitch" : vkStream?.online ? "vk" : "unknown",
        twitchStream?.start_time || vkStream?.start_time,
      ),
    ),
  );
  spinnerStop();
  message(
    `${getDateString()} | stream online | platform: ${twitchStream?.online ? "twitch" : "vk"}, dest: ${filename}`,
    green("√"),
  );
  app.state = "DOWNLOAD";

  // console.log(format.url);

  const { child, statusPromise, metadata } = downloadLiveHLSAudio(format.url, filename);
  app.child = child;
  const status = await statusPromise;
  app.child = undefined;

  message(
    `${getDateString()} | downloading stopped | status: ${status.success}, code: ${status.code}, size: ${
      metadata.total_size
    }, duration: ${metadata.total_time}, signal: ${status.signal}`,
    green("√"),
  );

  if (app.shutdown) {
    message(`${getDateString()} | application shut down after finalizing download | code: ${status.code}`, green("√"));
    Deno.exit(0);
  }

  app.state = "SCAN";
  spinnerStart("stream offline | waiting...", "yellow");
  setTimeout(async () => {
    await checkStreamStatus().then(() => {
      app.state = "SCAN";
    });
  }, 1000);
}

const server = new Hono();

server.get("/", (c) => {
  if (c.req.header("X-WLG-Corp") !== "secret69sign") {
    return c.text("Forbidden", 403);
  } else {
    return streamText(c, async (stream) => {
      await stream.writeln("Ok");
      await stream.close();
      if (app.state === "SCAN") {
        await new Promise((resolve) => setTimeout(resolve, config.http_delay));
        await checkStreamStatus().then(() => {
          app.state = "SCAN";
        });
      }
    });
  }
});

Deno.cron("check stream status", "*/2 * * * *", async () => {
  if (app.state !== "SCAN" || app.shutdown) return;
  await checkStreamStatus().then(() => {
    app.state = "SCAN";
  });
});

Deno.serve({ hostname: config.ip, port: +config.port, onListen: () => {} }, server.fetch);

await checkStreamStatus().then(() => {
  if (!app.shutdown) {
    app.state = "SCAN";
  }
});
