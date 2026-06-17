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

const skip: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips current song.")
    .setContexts(InteractionContextType.Guild),

  execute: async (interaction: Interaction) => {
    const i = interaction as ChatInputCommandInteraction;
    const user = formatUserForLogging(i);
    const guildId = i.guildId!;

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
