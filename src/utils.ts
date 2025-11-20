import { app, config } from "./main.ts";
import { type Color, Spinner } from "@std/cli/unstable-spinner";
import { cyan } from "@std/fmt/colors";

export function spinnerStart(message: string, color?: Color): void {
  if (!app.spinner) {
    app.spinner = new Spinner({
      message: `${getDateString()} | ${message}`,
      color,
    });
    app.spinner.start();
  } else {
    app.spinner.message = `${getDateString()} | ${message}`;
    app.spinner.color = color;
  }
}

export function spinnerStop(): void {
  if (app.spinner) {
    app.spinner.stop();
    app.spinner = undefined;
  }
}

export function generateFilename(id: string, start_time = Date.now()): string {
  return `${id}_${getDateString()}_${Math.round((Date.now() - start_time) / 1000)}.${config.ext}`;
}

export function getDateString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}-${minute}-${second}`;
}

export async function exist(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

export function message(text: string, prexif?: string): void {
  if (config.tg_id !== "") {
    app.tg
      .sendMessage(config.tg_id, `🤖wlgdl\n<code>${text}</code>`, {
        parse_mode: "HTML",
      })
      .catch(() => {});
  }
  text = prexif ? `${prexif} ${text}` : text;
  console.log(text);
}

export function table(data: Record<string, string | number | undefined>): void {
  console.log("\n");
  for (const key in data) {
    if (key === "tg_token") continue;
    console.log(`${key.padStart(12, " ")} | ${cyan((data[key] ?? "null").toString())}`);
  }
  console.log("\n");
}
