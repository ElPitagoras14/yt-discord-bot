export const AUDIO_CONSTANTS = {
  VOLUME: {
    DEFAULT: 0.5,
  },
  TIMEOUTS: {
    VIDEO_SELECTION: 30000,
    RECONNECT_TIMEOUT: 5000,
    IDLE_DISCONNECT: 60000, // 1 minute
  },
  BUFFER: {
    HIGH_WATER_MARK: 1 << 20,
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
