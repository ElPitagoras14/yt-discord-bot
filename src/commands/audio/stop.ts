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

const stop: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops player and clears queue.")
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

    logger.info(`[${guildId}] [${user}] /stop invoked`);
    queue.stop();
    await i.reply(AUDIO_MESSAGES.SUCCESS.PLAYER_STOPPED);
  },
};

export default stop;
