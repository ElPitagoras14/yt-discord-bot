// Constants para operaciones de audio
export const AUDIO_CONSTANTS = {
  VOLUME: {
    DEFAULT: 0.5,
    CLEANUP_SOUND: 0.6,
  },
  TIMEOUTS: {
    VIDEO_SELECTION: 30000,
    CLEANUP_DELAY: 2500,
    RECONNECT_TIMEOUT: 5000,
  },
  BUFFER: {
    HIGH_WATER_MARK: 1 << 20, // 1MB
  },
  FFMPEG: {
    ARGS: [
      "-i",
      "pipe:0",
      "-map",
      "0:a",
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-loglevel",
      "error",
      "pipe:1",
    ],
    MP3_ARGS: [
      "-map",
      "0:a",
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-loglevel",
      "error",
      "pipe:1",
    ],
  },
  YTDLP: {
    AUDIO_FORMAT: "bestaudio",
    TIMEOUT: 15000,
  },
} as const;
