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
		SOURCE_ICON: { youtube: "📺", local: "💽" } as const,
		CURRENT_SONG: (title: string, icon: string) => `🔊 ${icon} **${title}**`,
		SONG_ITEM: (index: number, title: string, icon: string) =>
			`${index + 1}. ${icon} **${title}**`,
	},
} as const;
