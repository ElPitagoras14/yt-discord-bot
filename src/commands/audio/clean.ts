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

const clean: Command = {
	data: new SlashCommandBuilder()
		.setName("clean")
		.setDescription("Cleans queue (keeps current song playing).")
		.setContexts(InteractionContextType.Guild),

	execute: async (interaction: Interaction) => {
		const i = interaction as ChatInputCommandInteraction;
		if (!i.inGuild()) return;

		const user = formatUserForLogging(i);
		const guildId = i.guildId;

		const queue = musicManager.getQueue(guildId);
		if (!queue) {
			await i.reply(AUDIO_MESSAGES.ERRORS.NO_QUEUE);
			return;
		}

		queue.clear();
		logger.info(`[${guildId}] [${user}] /clean invoked`);
		await i.reply(AUDIO_MESSAGES.SUCCESS.QUEUE_CLEANED);
	},
};

export default clean;
