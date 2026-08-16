# Yt Discord Bot

A Discord bot for playing audio from YouTube with a focus on stability and simplicity. This project provides a reusable Docker image that allows technical users to deploy their own bot by creating a Discord application and configuring it through environment variables.

## Features

- **Audio Playback**: Play audio from YouTube via direct URL or text search
- **Queue Management**: View current queue and clear queue
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

## Commands

See `src/commands/` for the up-to-date list of slash commands and their behavior.

## Disclaimer

This project is offered for educational and personal use only. The author is not responsible for misuse or potential violations of third-party terms of service (Discord, YouTube, or other services). Users are responsible for complying with Discord and YouTube Terms of Service.

## License

Apache License 2.0

## Author

**Jonathan García** - Computer Science Engineer