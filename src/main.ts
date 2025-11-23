import { Hono } from "@hono/hono";
import { streamText } from "@hono/hono/streaming";
import { app } from "./app.ts";
import { config } from "./config.ts";
import { logger } from "./logger.ts";

// Bootstrap Info
logger.table(config);
logger.spinnerStart("stream offline | waiting...", "yellow");

const server = new Hono();

server.get("/", (c) => {
  if (c.req.header("X-WLG-Corp") !== "secret69sign") {
    return c.text("Forbidden", 403);
  }
  return streamText(c, async (stream) => {
    await stream.writeln("Ok");
    await stream.close();
    if (app.state === "SCAN") {
      await new Promise((resolve) => setTimeout(resolve, config.http_delay));
      await app.checkStreamStatus();
    }
  });
});

Deno.cron("check stream status", "*/2 * * * *", async () => {
  if (app.state !== "SCAN" || app.shutdown) return;
  await app.checkStreamStatus();
});

if (config.ip && config.port) {
  Deno.serve({ hostname: config.ip, port: +config.port, onListen: () => {} }, server.fetch);
}

// Initial run
await app.checkStreamStatus();
