import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command.js";
import { AUDIO_MESSAGES } from "../../constants/audio-messages.js";
import { musicManager } from "../../music/MusicManager.js";
import logger from "../../logger.js";
import { formatUserForLogging } from "../../utils/user-format.js";

const clean: Command = {
  data: new SlashCommandBuilder()
    .setName("clean")
    .setDescription("Cleans queue (keeps current song playing).")
    .setContexts(InteractionContextType.Guild),

  execute: async (interaction: Interaction) => {
    const i = interaction as ChatInputCommandInteraction;
    const user = formatUserForLogging(i);
    const guildId = i.guildId!;

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
