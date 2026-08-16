import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	type GuildTextBasedChannel,
	type Interaction,
	InteractionContextType,
	SlashCommandBuilder,
} from "discord.js";
import {
	createVideoSelectMenu,
	handleVideoSelection,
} from "../../components/video-selector.js";
import { AUDIO_CONSTANTS } from "../../constants/audio.js";
import { MESSAGES } from "../../constants/messages.js";
import logger from "../../logger.js";
import { localCatalogService } from "../../music/LocalCatalogService.js";
import { musicManager } from "../../music/MusicManager.js";
import {
	GuildQueueState,
	type SearchResult,
	type Song,
	type VideoMetadata,
} from "../../music/types.js";
import { ytDlpService } from "../../music/YtDlpService.js";
import type { Command } from "../../types/command.js";
import { formatUserForLogging } from "../../utils/user-format.js";
import {
	isValidYouTubeUrl,
	validateVoiceChannel,
} from "../../utils/validation.js";

const play: Command = {
	data: new SlashCommandBuilder()
		.setName("play")
		.setDescription("Plays a song.")
		.setContexts(InteractionContextType.Guild)
		.addSubcommand((sub) =>
			sub
				.setName("url")
				.setDescription("Plays a song from a YouTube URL.")
				.addStringOption((opt) =>
					opt
						.setName("url")
						.setDescription("YouTube video URL")
						.setRequired(true),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName("query")
				.setDescription("Searches for a song and plays it.")
				.addStringOption((opt) =>
					opt.setName("query").setDescription("Search query").setRequired(true),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName("local")
				.setDescription("Plays an mp3 from the local library.")
				.addStringOption((opt) =>
					opt
						.setName("file")
						.setDescription("File from the local library")
						.setRequired(true)
						.setAutocomplete(true),
				),
		),

	autocomplete: async (interaction: AutocompleteInteraction) => {
		if (interaction.options.getSubcommand() !== "local") return;

		const focused = interaction.options.getFocused();
		const matches = await localCatalogService.search(focused);

		await interaction.respond(
			matches
				.slice(0, AUDIO_CONSTANTS.LOCAL_CATALOG.MAX_SUGGESTIONS)
				.map((entry) => ({
					name: entry.displayName.slice(0, 100),
					value: entry.fileName,
				})),
		);
	},

	execute: async (interaction: Interaction) => {
		const i = interaction as ChatInputCommandInteraction;
		if (!i.inGuild()) return;

		const user = formatUserForLogging(i);
		const guildId = i.guildId;

		logger.info(`[${guildId}] [${user}] /play invoked`);

		const voiceChannel = await validateVoiceChannel(i);
		if (!voiceChannel) return;

		await i.deferReply();

		const subcommand = i.options.getSubcommand();
		let song: Song;

		if (subcommand === "url") {
			const raw = i.options.getString("url", true);
			const cleaned = isValidYouTubeUrl(raw);
			if (!cleaned) {
				await i.editReply(MESSAGES.ERRORS.INVALID_YOUTUBE_URL);
				return;
			}

			let metadata: VideoMetadata;
			try {
				metadata = await ytDlpService.getMetadata(cleaned);
			} catch (err) {
				logger.error(`[${guildId}] [${user}] getMetadata failed: ${err}`);
				await i.editReply(MESSAGES.ERRORS.VALID_URL_REQUIRED);
				return;
			}

			if (metadata._type !== "video") {
				await i.editReply(MESSAGES.ERRORS.INVALID_VIDEO_URL);
				return;
			}

			song = {
				title: metadata.title,
				url: cleaned,
				source: "youtube",
				requestedBy: user,
			};
		} else if (subcommand === "query") {
			const query = i.options.getString("query", true);
			let results: SearchResult[];
			try {
				results = await ytDlpService.search(query);
			} catch (err) {
				logger.error(`[${guildId}] [${user}] Search failed: ${err}`);
				await i.editReply(MESSAGES.ERRORS.VALID_URL_REQUIRED);
				return;
			}

			const menuWithRow = createVideoSelectMenu(results);
			const selection = await handleVideoSelection(i, menuWithRow);
			if (!selection) return;

			const selected = results.find(
				(r) => (r.webpage_url || r.url) === selection.url,
			);
			song = {
				title: selected?.title ?? "Unknown",
				url: selection.url,
				source: "youtube",
				requestedBy: user,
			};
		} else {
			const fileName = i.options.getString("file", true);
			const catalog = await localCatalogService.getCatalog();
			const entry = catalog.find((e) => e.fileName === fileName);

			if (!entry) {
				logger.warn(
					`[${guildId}] [${user}] Rejected unknown local file: "${fileName}"`,
				);
				await i.editReply(
					catalog.length === 0
						? MESSAGES.ERRORS.LOCAL_CATALOG_EMPTY
						: MESSAGES.ERRORS.LOCAL_FILE_UNAVAILABLE,
				);
				return;
			}

			song = {
				title: entry.displayName,
				url: entry.path,
				source: "local",
				requestedBy: user,
			};
		}
		const textChannel = i.channel as GuildTextBasedChannel;
		let queue = musicManager.getQueue(guildId);
		const isNewQueue = !queue;

		if (!queue) {
			queue = musicManager.createQueue(guildId, voiceChannel, textChannel);
		}

		queue.enqueue(song);
		await i.editReply(MESSAGES.SUCCESS.SONG_ADDED(song.title));

		if (isNewQueue || queue.currentState === GuildQueueState.Idle) {
			await queue.startPlayback();
		}
	},
};

export default play;
