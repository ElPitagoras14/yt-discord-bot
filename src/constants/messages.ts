export const MESSAGES = {
	ERRORS: {
		NO_VOICE_CHANNEL: "You must be in a voice channel to play music!",
		INVALID_VIDEO_URL: "Failed to play. The URL is not a video.",
		VALID_URL_REQUIRED: "Failed to play. Use a valid URL.",
		INVALID_YOUTUBE_URL:
			"❌ Invalid YouTube URL format. Please use a valid YouTube video URL.",
		NO_SONG_FOUND: "No song found in queue",
		AUDIO_RESOURCE_FAILED:
			"❌ Failed to create audio resource. Please try again.",
		AUDIO_PLAY_FAILED: "❌ Failed to play audio. Please try again.",
		SONG_SELECTION_TIMEOUT: "Song no selected within 1 minute, cancelling",
		QUEUE_NOT_FOUND: "Queue not found",
		YTDLP_FAILED: "yt-dlp failed",
		LOCAL_FILE_UNAVAILABLE:
			"❌ That file is not available in the local library. Pick one from the suggestions.",
		LOCAL_CATALOG_EMPTY:
			"❌ The local library is empty. Upload some .mp3 files first.",
	},
	SUCCESS: {
		SONG_ADDED: (title: string) => `Song ${title} added to queue.`,
		SONG_SELECTED: (title: string) => `Song ${title} added to queue.`,
		NOW_PLAYING: (title: string) => `🎶 Now playing: ${title}`,
		SELECT_SONG: "Select a song to play.",
		IDLE_TIMEOUT: "⏰ Bot disconnected due to inactivity. See you soon! 👋",
	},
	PLACEHOLDERS: {
		SELECT_VIDEO: "Select a video",
	},
	COMPONENTS: {
		VIDEO_SELECT: "video-select",
	},
} as const;
