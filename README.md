# WLGDL

This is a small CLI tool that runs in the background and records streams from Twitch.

## How it Works

After starting, the program polls Twitch every 2 minutes to check for a new stream. If a new stream is detected, it tries to fetch the HLS playlist and download it with `ffmpeg`. It is also possible to trigger stream recording with a GET request, as the program serves an HTTP server.

## Parameters

| Name         | Description                                                                 | Default                                        |
| ------------ | --------------------------------------------------------------------------- | ---------------------------------------------- |
| --device-id  | Logged in Twitch user's Device ID (also available from `.env`)              | .env value, or empty                           |
| --channel    | What channel to record                                                      | welovegames                                    |
| --bin        | Path to the ffmpeg binary                                                   | `ffmpeg` for Linux, `./ffmpeg.exe` for Windows |
| --ffmpeg     | Default ffmpeg args to record with                                          | (see defaults below)                           |
| --format     | Format from the HLS playlist to record                                      | 1080p60                                        |
| --dir        | Target directory to place recorded streams                                  | ./                                             |
| --ext        | Extension for recorded files                                                | mp4                                            |
| --tg-token   | Telegram Bot token for notifications (also available from `.env`)(optional) |                                                |
| --tg-id      | Telegram user ID to send notifications to (optional)                        |                                                |
| --ip         | IP for HTTP server to accept record trigger by GET request                  | 0.0.0.0                                        |
| --port       | Port for HTTP server to accept record trigger by GET request                | 16969                                          |
| --http_delay | Delay between HTTP request and start of recording (ms)                      | 500                                            |

> [!WARNING]
> The Device ID is a crucial requirement to record streams without ad blocks. The program can work without it, but the recordings will include ads.

## Usage Example

A basic example of usage. This will track the `welovegames` channel and save streams to the `./data` directory.

```bash
wlgdl.exe --channel=welovegames --dir="./data"
```

## FFmpeg Args

There are several built-in ffmpeg argument presets available to record streams.

- **VIDEO COPY**
  (Used by default if no `--ffmpeg` arg is provided)

  ```
  -loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 10 -i {url} -seg_max_retry 5 -c copy {file}
  ```

- **AUDIO COPY**

  ```
  -loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 10 -i {url} -seg_max_retry 5 -map 0:a:0 -c:a copy -copyts {file}
  ```

- **AUDIO TRANSCODING**

  ```
  -loglevel fatal -stats -timeout 15000000 -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 -reconnect_max_retries 10 -i {url} -seg_max_retry 5 -map 0:a:0 -af asetpts=PTS-STARTPTS -c:a aac -q:a 5 -avoid_negative_ts make_zero -fflags +genpts {file}
  ```

## Development

### Prerequisites

- [Deno](https://deno.com/) 2.1 and above
- [ffmpeg](https://ffmpeg.org/) 7.1 and above (it should work on versions >=4, though some issues may arise with handling failover args for HLS stream downloading)

The codebase is straightforward. Deno and TypeScript are used as a wrapper and logic handler to trigger ffmpeg with the appropriate arguments and manage HLS playlist downloads.

### Running

```bash
deno task start [ARGS]
```

### Building

```bash
deno task build:win
deno task build:linux
deno task build:all
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
For formatting, please use `deno fmt`.

## License

MIT License
Copyright (c) 2025 shevernitskiy, WELOVEGAMES
