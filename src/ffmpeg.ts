// max_reload - Maximum number of times a insufficient list is attempted to be reloaded. Default value is 1000.
// seg_max_retry - Maximum number of times to reload a segment on error, useful when segment skip on network error is not desired. Default value is 0.
// timeout - Set timeout for socket I/O operations expressed in seconds (fractional value can be set). Applicable only for HTTP output.
// -re (input) - Read input at native frame rate. This is equivalent to setting -readrate 1.
// -hide_banner - Suppress printing banner.
// -loglevel fatal
// -stats - Log encoding progress/statistics as "info"-level log (see -loglevel). It is on by default, to explicitly disable it you need to specify -nostats.
// -map 0:a - Map the first audio stream from the input file to the output file.
// -c:a copy - Copy the audio stream from the input file to the output file (as it is without transcoding)
// -timeout 20000000 - 20sec timeout

// "-f",
// "segment",
// "-reset_timestamps",
// "1",
// -fflags +genpts - Force generation of pts.
// -seg_max_retry 3 and -reconnect_max_retries 5 not working in ubuntu ffmpeg version 4.4.2

// AUDIO COPY -loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 5 -i {url} -seg_max_retry 5 -map 0:a:0 -c:a copy -copyts {file}
// AUDIO TRANSCODING -loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 5 -i {url} -seg_max_retry 5 -map 0:a:0 -af asetpts=PTS-STARTPTS -c:a aac -q:a 5 -avoid_negative_ts make_zero -fflags +genpts {file}
// VIDEO COPY -loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 5 -i {url} -seg_max_retry 5 -c copy {file}

import { config } from "./main.ts";
import { spinnerStart, spinnerStop } from "./utils.ts";

export async function downloadLiveHLSAudio(
  url: string,
  filename: string,
): Promise<Deno.CommandStatus & { total_size: string; total_time: string }> {
  const cmd = new Deno.Command(config.bin, {
    args: config.ffmpeg.replace("{url}", url).replace("{file}", filename).split(" "),
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
  const status = await child.status;
  spinnerStop();
  return { ...status, ...metadata };
}

function progressWriter(
  decoder: TextDecoder,
  metadata: { total_size: string; total_time: string },
): WritableStream<Uint8Array> {
  return new WritableStream({
    write(chunk) {
      if (chunk.length <= 20 && (chunk[0] === 115 || chunk[0] === 102)) return;
      const text = decoder.decode(chunk);
      const match = text.match(/ize=\s*(.+?)\s*time=\s*(.+?)\s*bitrate=\s*(.+?)\s+s/);
      if (!match) {
        return;
      } else {
        metadata.total_size = match.at(1) ?? "N/A";
        metadata.total_time = match.at(2) ?? "N/A";
        spinnerStart(
          `downloading   | ${metadata.total_time} | ${(match.at(3) ?? "N/A").padStart(
            4,
            " ",
          )} | ${metadata.total_size.padStart(10, " ")}`,
          "magenta",
        );
      }
    },
  });
}
