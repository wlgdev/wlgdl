<!--suppress HtmlUnknownAnchorTarget, HtmlDeprecatedAttribute -->
<div id="top"></div>

<div align="center">
  <a href="https://github.com/wlgdev/wlgdl/actions/workflows/secrets-update.yml">
    <img src="https://github.com/wlgdev/wlgdl/actions/workflows/secrets-update.yml/badge.svg" alt="status"/>
  </a>
</div>
<h1 align="center">
  WLGDL
</h1>

<p align="center">
   Lightweight CLI tool for background Twitch stream recording.
</p>

<div align="center">
  📦 :octocat:
</div>
<div align="center">
  <img src="./docs/description.webp" alt="description"/>
</div>

<!-- TABLE OF CONTENT -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#-description">📃 Description</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#-getting-started">🪧 Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li>
      <a href="#%EF%B8%8F-how-to-use">⚠️ How to use</a>
      <ul>
        <li><a href="#possible-exceptions">Possible Exceptions</a></li>
      </ul>
    </li>
    <li><a href="#%EF%B8%8F-deployment">⬆️ Deployment</a></li>
    <li><a href="#-reference">🔗 Reference</a></li>
  </ol>
</details>

<br>

## 📃 Description

WLGDL is a simple CLI tool that runs in the background and records Twitch streams automatically. It polls Twitch at intervals, detects new streams, and downloads them using ffmpeg. It also provides an HTTP server to trigger recordings via GET requests.

<p align="right">(<a href="#top">back to top</a>)</p>

### Built With

- [Deno 2.1+](https://deno.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [ffmpeg 7.1+](https://ffmpeg.org/)

## 🪧 Getting Started

WLGDL is cross-platform and requires Deno and ffmpeg installed. It is configured via CLI arguments or environment variables.

### Prerequisites

- [Deno](https://deno.com/) 2.1 or newer
- [ffmpeg](https://ffmpeg.org/) 7.1 or newer (works with >=4, but 7.1+ recommended)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/wlgdev/wlgdl.git
cd wlgdl
```

No additional install steps are required. You can run the tool directly with Deno:

```bash
deno task start [ARGS]
```

Or build binaries:

```bash
deno task build:win
deno task build:linux
deno task build:all
```

<p align="right">(<a href="#top">back to top</a>)</p>

## ⚠️ How to use

Basic usage example (records the `welovegames` channel and saves to `./data`):

```bash
wlgdl.exe --channel=welovegames --dir="./data"
```

### Parameters

| Name         | Description                                                    | Default                                        |
| ------------ | -------------------------------------------------------------- | ---------------------------------------------- |
| --device-id  | Logged in Twitch user's Device ID (also available from `.env`) | .env value, or empty                           |
| --channel    | What channel to record                                         | welovegames                                    |
| --bin        | Path to the ffmpeg binary                                      | `ffmpeg` for Linux, `./ffmpeg.exe` for Windows |
| --ffmpeg     | Default ffmpeg args to record with                             | (see defaults below)                           |
| --format     | Format from the HLS playlist to record                         | 1080p60                                        |
| --dir        | Target directory to place recorded streams                     | ./                                             |
| --ext        | Extension for recorded files                                   | mp4                                            |
| --tg-token   | Telegram Bot token for notifications (optional)                |                                                |
| --tg-id      | Telegram user ID to send notifications to (optional)           |                                                |
| --ip         | IP for HTTP server to accept record trigger by GET request     | 0.0.0.0                                        |
| --port       | Port for HTTP server to accept record trigger by GET request   | 16969                                          |
| --http_delay | Delay between HTTP request and start of recording (ms)         | 500                                            |

#### FFmpeg Args

- **VIDEO COPY** (default)
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

### Possible Exceptions

- If Device ID is missing, recordings may include Twitch ads.
- ffmpeg version incompatibility may cause HLS download issues.
- Network errors may interrupt recording.

<p align="right">(<a href="#top">back to top</a>)</p>

## ⬆️ Deployment

Build the binary for your platform using Deno tasks:

```bash
deno task build:win
deno task build:linux
```

Or run directly with Deno as shown above.

<p align="right">(<a href="#top">back to top</a>)</p>

## 🔗 Reference

- [Deno Docs](https://deno.com/manual)
- [ffmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Twitch API Reference](https://dev.twitch.tv/docs/api/)

<p align="right">(<a href="#top">back to top</a>)</p>
