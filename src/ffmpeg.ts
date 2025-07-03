import { config } from "./main.ts";
import { spinnerStart, spinnerStop } from "./utils.ts";

type DownloadResult = {
  child: Deno.ChildProcess;
  statusPromise: Promise<Deno.CommandStatus>;
  metadata: { total_size: string; total_time: string };
};

export function downloadLiveHLSAudio(url: string, filename: string): DownloadResult {
  const cmd = new Deno.Command(config.bin, {
    args: config.ffmpeg.replace("{url}", url).replace("{file}", filename).split(" "),
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
        spinnerStart(
          `downloading   | ${metadata.total_time} | ${(match.at(3) ?? "N/A").padStart(
            12,
            " ",
          )} | ${metadata.total_size.padStart(10, " ")}`,
          "magenta",
        );
      }
    },
    close() {
      spinnerStop();
    },
  });
}
