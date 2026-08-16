import {
	type ChatInputCommandInteraction,
	type Interaction,
	InteractionContextType,
	SlashCommandBuilder,
} from "discord.js";
import { AUDIO_MESSAGES } from "../../constants/audio-messages.js";
import logger from "../../logger.js";
import { musicManager } from "../../music/MusicManager.js";
import type { Command } from "../../types/command.js";
import { formatUserForLogging } from "../../utils/user-format.js";

const skip: Command = {
	data: new SlashCommandBuilder()
		.setName("skip")
		.setDescription("Skips current song.")
		.setContexts(InteractionContextType.Guild),

	execute: async (interaction: Interaction) => {
		const i = interaction as ChatInputCommandInteraction;
		if (!i.inGuild()) return;

		const user = formatUserForLogging(i);
		const guildId = i.guildId;

		const queue = musicManager.getQueue(guildId);
		if (!queue || queue.songs.length === 0) {
			await i.reply(AUDIO_MESSAGES.ERRORS.QUEUE_EMPTY);
			return;
		}

		logger.info(`[${guildId}] [${user}] /skip invoked`);
		queue.skip();
		await i.reply(AUDIO_MESSAGES.SUCCESS.SONG_SKIPPED);
	},
};

export default skip;
