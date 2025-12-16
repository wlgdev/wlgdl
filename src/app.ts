import { Twitch, TwtichHLSSourceFormat, Vk, VkHLSSourceFormat } from "@shevernitskiy/scraperator";
import { green, red } from "@std/fmt/colors";
import { join, normalize } from "@std/path";
import { config } from "./config.ts";
import { downloadLiveHLSAudio } from "./ffmpeg.ts";
import { logger } from "./logger.ts";
import { generateFilename, getDateString } from "./utils.ts";

export type AppState = "SCAN" | "DOWNLOAD" | "CHECK";

export class App {
  state: AppState = "SCAN";
  shutdown = false;
  child?: Deno.ChildProcess;

  constructor() {
    Deno.addSignalListener("SIGINT", async () => await this.handleExitSignal());
    if (Deno.build.os === "linux") {
      Deno.addSignalListener("SIGTERM", async () => await this.handleExitSignal());
    }
  }

  async handleExitSignal() {
    if (this.shutdown) return;
    this.shutdown = true;
    logger.spinnerStop();
    console.log(
      `${green("√")} ${getDateString()} | exit signal received, shutting down gracefully...`,
    );

    if (this.child) {
      try {
        const writer = this.child.stdin.getWriter();
        await writer.write(new TextEncoder().encode("q"));
        await writer.close();
        await this.child.status;
      } catch (e) {
        if (!(e instanceof Deno.errors.BrokenPipe)) {
          console.error("failed to send 'q' to FFmpeg.", e);
        }
      } finally {
        Deno.exit(0);
      }
    } else {
      Deno.exit(0);
    }
  }

  async checkStreamStatus(): Promise<void> {
    if (this.state !== "SCAN" || this.shutdown) return;

    this.state = "CHECK";
    logger.spinnerStart("stream offline | checking...", "yellow");

    const twitch = new Twitch(config.channel);
    const vk = new Vk(config.channel, { accessToken: config.vk_token });

    const [twitchStream, vkStream] = await Promise.all([
      twitch.streamInfo().catch(() => {
        logger.spinnerStart("stream offline | error on twitch request", "red");
        return undefined;
      }),
      vk.streamInfo().catch(() => {
        logger.spinnerStart("stream offline | error on vk request", "red");
        return undefined;
      }),
    ]);

    if (this.shutdown) {
      logger.spinnerStop();
      return;
    }

    if (!twitchStream?.online && !vkStream?.online) {
      logger.spinnerStart("stream offline | waiting...", "yellow");
      this.state = "SCAN";
      return;
    }

    let master: TwtichHLSSourceFormat[] | VkHLSSourceFormat[] | undefined;
    let platform: "twitch" | "vk" | undefined;
    let filename: string = "";

    if (twitchStream?.online) {
      master = await twitch.liveHLSMetadata(config.device_id).catch(() => {
        logger.spinnerStart("stream online | error on twitch hls request", "red");
        return undefined;
      });
      platform = "twitch";
      filename = normalize(
        join(config.dir, generateFilename("twitch", config.ext, twitchStream.start_time)),
      );
    } else if (vkStream?.online && vkStream.hls) {
      master = await vk.liveHLSMetadata(vkStream.hls).catch(() => {
        logger.spinnerStart("stream online | error on vk hls request", "red");
        return undefined;
      });
      platform = "vk";
      filename = normalize(
        join(config.dir, generateFilename("vk", config.ext, vkStream.start_time)),
      );
    }

    if (!master || !platform) {
      this.state = "SCAN";
      logger.spinnerStop();
      return;
    }

    const targetResolution = config.format.split("p")[0];

    let format = master.find(
      (f) => f.resolution.endsWith(targetResolution) || f.video.startsWith(targetResolution),
    );
    if (!format) {
      format = master.at(0);

      if (!format) {
        logger.spinnerStart("stream online | stream has no playlist, stopping", "red");
        this.state = "SCAN";
        return;
      }

      logger.spinnerStop();
      logger.message(
        `${getDateString()} | stream online | stream has no quality ${config.format}, using ${
          format.video
        }, available formats: ${master.map((f) => f.video).join(", ")}`,
        red("√"),
      );
    }

    logger.spinnerStop();
    logger.message(
      `${getDateString()} | stream online | platform: ${platform}, format: ${format.video}, dest: ${filename}`,
      green("√"),
    );

    this.state = "DOWNLOAD";
    const { child, statusPromise, metadata } = downloadLiveHLSAudio(format.url, filename);
    this.child = child;

    const status = await statusPromise;
    this.child = undefined;

    logger.message(
      `${getDateString()} | downloading stopped | status: ${status.success}, code: ${status.code}, size: ${
        metadata.total_size
      }, duration: ${metadata.total_time}, signal: ${status.signal}`,
      green("√"),
    );

    if (this.shutdown) {
      logger.message(
        `${getDateString()} | app shutdown after download | code: ${status.code}`,
        green("√"),
      );
      Deno.exit(0);
    }

    this.state = "SCAN";
    logger.spinnerStart("stream offline | waiting...", "yellow");

    setTimeout(async () => {
      await this.checkStreamStatus();
    }, 1000);
  }
}

export const app = new App();
