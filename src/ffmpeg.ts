import { config } from "./config.ts";
import { logger } from "./logger.ts";

type DownloadResult = {
  child: Deno.ChildProcess;
  statusPromise: Promise<Deno.CommandStatus>;
  metadata: { total_size: string; total_time: string };
};

export function downloadLiveHLSAudio(url: string, filename: string): DownloadResult {
  const rawCommand = config.ffmpeg.replace("{url}", url).replace("{file}", filename);
  const argsArray = (rawCommand.match(/"[^"]+"|\S+/g) || []).map((s) => s.replace(/^"|"$/g, ""));

  const cmd = new Deno.Command(config.bin, {
    args: argsArray,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const metadata = {
    total_size: "N/A",
    total_time: "N/A",
  };

  const child = cmd.spawn();
  const decoder = new TextDecoder();
  child.stderr.pipeTo(progressWriter(decoder, metadata));

  return { child, statusPromise: child.status, metadata };
}

function progressWriter(
  decoder: TextDecoder,
  metadata: { total_size: string; total_time: string },
): WritableStream<Uint8Array> {
  return new WritableStream({
    write(chunk) {
      if (chunk.length <= 20 && (chunk[0] === 115 || chunk[0] === 102)) return;
      const text = decoder.decode(chunk);
      const match = text.match(/size=\s*(.+?)\s*time=\s*(.+?)\s*bitrate=\s*(.+?)\s+s/);
      if (!match) {
        return;
      } else {
        metadata.total_size = match.at(1) ?? "N/A";
        metadata.total_time = match.at(2) ?? "N/A";
        logger.spinnerStart(
          `downloading   | ${metadata.total_time} | ${(match.at(3) ?? "N/A").padStart(
            12,
            " ",
          )} | ${metadata.total_size.padStart(10, " ")}`,
          "magenta",
        );
      }
    },
    close() {
      logger.spinnerStop();
    },
  });
}
