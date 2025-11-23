import { Api } from "@grammyjs/grammy";
import { type Color, Spinner } from "@std/cli/unstable-spinner";
import { cyan } from "@std/fmt/colors";
import { config } from "./config.ts";
import { getDateString } from "./utils.ts";

class Logger {
  private spinner?: Spinner;
  private tg: Api;

  constructor() {
    this.tg = new Api(config.tg_token);
  }

  spinnerStart(message: string, color?: Color): void {
    const text = `${getDateString()} | ${message}`;
    if (!this.spinner) {
      this.spinner = new Spinner({ message: text, color });
      this.spinner.start();
    } else {
      this.spinner.message = text;
      this.spinner.color = color;
    }
  }

  spinnerStop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
  }

  message(text: string, prefix?: string): void {
    if (config.tg_id) {
      this.tg
        .sendMessage(config.tg_id, `🤖wlgdl\n<code>${text}</code>`, {
          parse_mode: "HTML",
        })
        .catch(() => {});
    }
    console.log(prefix ? `${prefix} ${text}` : text);
  }

  table(data: Record<string, unknown>): void {
    console.log("\n");
    for (const [key, value] of Object.entries(data)) {
      if (key === "tg_token") continue;
      console.log(`${key.padStart(12, " ")} | ${cyan(String(value ?? "null"))}`);
    }
    console.log("\n");
  }
}

export const logger = new Logger();
