import { ChatInputCommandInteraction } from "discord.js";
import { Queue } from "../types/queue.js";
import { AUDIO_MESSAGES } from "../constants/audio-messages.js";

/**
 * Validate that a queue exists for the current guild
 * Returns early with error message if no queue found
 */
export const validateQueueExists = async (
  interaction: ChatInputCommandInteraction,
): Promise<{ queue: Queue | null; success: boolean }> => {
  const guildId = interaction.guildId!;
  const queue = interaction.client.queue.get(guildId);

  if (!queue) {
    await interaction.reply(AUDIO_MESSAGES.ERRORS.NO_QUEUE);
    return { queue: null, success: false };
  }

  return { queue, success: true };
};

/**
 * Validate that queue has songs to play
 * Prevents unnecessary operations on empty queues
 */
export const validateQueueNotEmpty = async (
  interaction: ChatInputCommandInteraction,
  queue: Queue,
): Promise<boolean> => {
  if (queue.songs.length === 0) {
    await interaction.reply(AUDIO_MESSAGES.ERRORS.QUEUE_EMPTY);
    return false;
  }
  return true;
};
