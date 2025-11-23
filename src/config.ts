import { parseArgs } from "@std/cli";
import { red } from "@std/fmt/colors";
import { join, normalize } from "@std/path";
import { exist } from "./utils.ts";

const args = parseArgs<Record<string, string>>(Deno.args);

const FFMPEG_DEFAULTS: Record<string, string> = {
  "VIDEO COPY":
    '-loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 10 -user_agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" -seg_max_retry 5 -i {url} -c copy {file}',
  "AUDIO COPY":
    "-loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 10 -i {url} -seg_max_retry 5 -map 0:a:0 -c:a copy -copyts {file}",
  "AUDIO TRANSCODING":
    "-loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 10 -i {url} -seg_max_retry 5 -map 0:a:0 -af asetpts=PTS-STARTPTS -c:a aac -q:a 5 -avoid_negative_ts make_zero -fflags +genpts {file}",
};

export const config = {
  device_id: args.device_id || Deno.env.get("DEVICE_ID") || "",
  channel: args.channel || "welovegames",
  bin: args.bin
    ? normalize(args.bin)
    : normalize(Deno.build.os === "windows" ? join(Deno.cwd(), "./ffmpeg.exe") : "ffmpeg"),
  ffmpeg: args.ffmpeg || FFMPEG_DEFAULTS["VIDEO COPY"],
  format: args.format || "1080p60",
  dir: args.dir ? join(Deno.cwd(), args.dir) : Deno.cwd(),
  ext: args.ext || "mp4",
  os: Deno.build.os,
  tg_token: args.tg_token || Deno.env.get("TELEGRAM_TOKEN") || "",
  tg_id: (args.tg_id || "").toString(),
  ip: args.ip || undefined,
  port: args.port || undefined,
  http_delay: parseInt(args.http_delay) || 500,
  vk_token: args.vk_token || undefined,
};

// Validation
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
