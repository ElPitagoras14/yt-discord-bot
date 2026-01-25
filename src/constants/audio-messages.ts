// Mensajes extendidos para todos los comandos de audio
export const AUDIO_MESSAGES = {
  ERRORS: {
    NO_VOICE_CHANNEL: "You must be in a voice channel to use this command!",
    NO_QUEUE: "❌ There is no queue.",
    QUEUE_EMPTY: "❌ The queue is empty.",
    BOT_DISCONNECTING: "❌ The bot is disconnecting. Try again in 3 seconds.",
  },
  SUCCESS: {
    PLAYER_STOPPED: "🛑 Player stopped and queue cleared.",
    SONG_SKIPPED: "⏭️ Skipped current song.",
    QUEUE_CLEANED: "🧹 Queue cleaned.",
  },
  QUEUE: {
    TITLE: "🎧 **Cola actual:**",
    CURRENT_SONG: (title: string) => `🔊 **${title}**`,
    SONG_ITEM: (index: number, title: string) => `${index + 1}. **${title}**`,
  },
} as const;