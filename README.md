# Yt Discord Bot

A Discord bot for playing audio from YouTube with a focus on stability and simplicity. This project provides a reusable Docker image that allows technical users to deploy their own bot by creating a Discord application and configuring it through environment variables.

## Features

- **Audio Playback**: Play audio from YouTube via direct URL or text search
- **Local Library**: Play your own `.mp3` files, uploaded through a web UI and picked with autocomplete
- **Queue Management**: View current queue (showing each song's source) and clear queue
- **Playback Controls**: Skip, stop, and manage audio playback
- **Voice Integration**: Auto-connect to user's voice channel
- **Stable Streaming**: Uses ffmpeg and yt-dlp for reliable audio streaming
- **Docker Distribution**: Easy deployment with public Docker image

## Quick Start

Deploy the bot using Docker Compose:

```yaml
services:
  discord-bot:
    image: ghcr.io/elpitagoras14/yt-discord-bot:latest
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - APP_ID=${APP_ID}
      - PUBLIC_KEY=${PUBLIC_KEY}
    dns:
      - 1.1.1.1
      - 8.8.8.8
    restart: unless-stopped
```

Run with: `docker-compose up -d`

## Environment Variables

Required environment variables for the bot to function:

- `DISCORD_TOKEN`: Your Discord bot token
- `APP_ID`: Your Discord application ID
- `PUBLIC_KEY`: Your Discord application public key

Get all three from the [Discord Developer Portal](https://discord.com/developers/applications): create an application, add a bot, and enable the required intents. The token lives under the "Bot" tab; the app ID and public key are under "General Information".

Required when using the local library (see below):

- `FILEBROWSER_ADMIN_PASSWORD`: Admin password for the file upload UI

Optional:

- `LOCAL_MP3_DIR`: Directory the bot scans for `.mp3` files (defaults to `/app/mp3s`, already set by the provided compose files). Only worth overriding when running the bot outside Docker.

## Local Library

Besides YouTube, the bot can play `.mp3` files you upload yourself. The compose files add a
[FileBrowser](https://github.com/gtsteffaniak/filebrowser) service that shares an `mp3_storage`
Docker volume with the bot: you upload through its web UI, and the bot reads the same volume
read-only. Files are stored in a named volume, so they survive image updates and are never
committed to the repository.

1. Set `FILEBROWSER_ADMIN_PASSWORD` in your `.env` **before the first start** (see the warning below).
2. Start the stack and open the upload UI at `http://<your-host>:8080`, logging in as `admin`.
3. Upload your `.mp3` files.
4. In Discord, run `/play local` and pick a file — suggestions appear as you type.

New uploads show up in autocomplete within about 10 seconds, without restarting the bot.

> [!WARNING]
> Port `8080` is published on the host and the image ships with the default credentials
> `admin` / `admin`. **Setting `FILEBROWSER_ADMIN_PASSWORD` is a mandatory deployment step** —
> otherwise anyone who can reach that port can upload or delete files. If the host is exposed to
> the internet, put the service behind a reverse proxy with TLS, or remove the published port and
> reach it through an SSH tunnel instead.

## Commands

See `src/commands/` for the up-to-date list of slash commands and their behavior.

## Disclaimer

This project is offered for educational and personal use only. The author is not responsible for misuse or potential violations of third-party terms of service (Discord, YouTube, or other services). Users are responsible for complying with Discord and YouTube Terms of Service.

## License

Apache License 2.0

## Author

**Jonathan García** - Computer Science Engineer