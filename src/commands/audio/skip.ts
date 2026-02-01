import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import { Command } from "../../types/command";
import { validateQueueExists } from "../../utils/audio-validation.js";
import { AUDIO_MESSAGES } from "../../constants/audio-messages.js";
import logger from "../../logger.js";
import { formatUserForLogging } from "../../utils/user-format.js";

const skip: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips current song.")
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const { queue, success } = await validateQueueExists(chatInteraction);
    if (!success) return;

    logger.debug(
      `Skip command: queue exists=${!!queue}, songs=${queue?.songs.length || 0}`,
    );

    // Early validation - check queue content BEFORE any timeout operations
    if (queue!.songs.length === 0) {
      await chatInteraction.reply(AUDIO_MESSAGES.ERRORS.QUEUE_EMPTY);
      return; // Exit immediately - no timeout modifications
    }

    const user = formatUserForLogging(chatInteraction);
    logger.info(`[${user}] Skip command executed`);

    if (queue!.player.state.status !== AudioPlayerStatus.Idle) {
      // Allow stream to close naturally to avoid premature errors
      const stopGracefully = new Promise<void>((resolve) => {
        setTimeout(() => {
          queue!.player.stop();
          resolve();
        }, 100);
      });

      await stopGracefully;
    }

    logger.info(`[${user}] Skipped current song`);
    await chatInteraction.reply(AUDIO_MESSAGES.SUCCESS.SONG_SKIPPED);
  },
};

export default skip;
