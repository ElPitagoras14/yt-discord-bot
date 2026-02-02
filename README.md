# yt-discord-bot

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
version: '3.8'

services:
  discord-bot:
    image: ghcr.io/elpitagoras14/yt-discord-bot:latest
    container_name: yt-discord-bot
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

### How to Get Environment Variables

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to the "Bot" tab and copy the token
4. Go to the "General Information" tab for Application ID and Public Key

## Discord Bot Setup

To set up your own Discord bot:

1. Visit the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Enable necessary intents (Message Content, Server Members)
5. Generate and copy your bot token
6. Invite the bot to your server using the OAuth2 URL generator

## Commands

- `/play <url/search>` - Play audio from YouTube URL or search
- `/skip` - Skip current track
- `/stop` - Stop playback and disconnect
- `/queue` - Show current queue
- `/clean` - Clear the queue

## Technologies

- **Node.js** - Runtime environment
- **discord.js** - Discord API library
- **ffmpeg** - Audio processing
- **yt-dlp** - YouTube video/audio extraction
- **Docker** - Containerization

## Disclaimer

This project is offered for educational and personal use only. The author is not responsible for misuse or potential violations of third-party terms of service (Discord, YouTube, or other services). Users are responsible for complying with Discord and YouTube Terms of Service.

## License

Apache License 2.0

## Author

**Jonathan García** - Computer Science Engineer