import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";
import { validateQueueExists } from "../../utils/audio-validation.js";
import { clearQueue } from "../../services/queue.js";
import { AUDIO_MESSAGES } from "../../constants/audio-messages.js";
import logger from "../../logger.js";

const clean: Command = {
  data: new SlashCommandBuilder()
    .setName("clean")
    .setDescription("Cleans queue.")
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;
    const user = `${chatInteraction.user.username}#${chatInteraction.user.discriminator}`;

    const { queue, success } = await validateQueueExists(chatInteraction);
    if (!success) return;

    clearQueue(queue!);
    logger.info(`[${user}] Cleaned queue`);
    await chatInteraction.reply(AUDIO_MESSAGES.SUCCESS.QUEUE_CLEANED);
  },
};

export default clean;
