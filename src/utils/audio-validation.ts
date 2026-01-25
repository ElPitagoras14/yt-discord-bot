// Utilidades de validación extendidas para comandos de audio
import { ChatInputCommandInteraction } from "discord.js";
import { Queue } from "../types/queue.js";
import { AUDIO_MESSAGES } from "../constants/audio-messages.js";

export const validateQueueExists = async (
  interaction: ChatInputCommandInteraction
): Promise<{ queue: Queue | null; success: boolean }> => {
  const guildId = interaction.guildId!;
  const queue = interaction.client.queue.get(guildId);

  if (!queue || queue.songs.length === 0) {
    await interaction.reply(AUDIO_MESSAGES.ERRORS.NO_QUEUE);
    return { queue: null, success: false };
  }

  return { queue, success: true };
};

export const validateQueueNotEmpty = async (
  interaction: ChatInputCommandInteraction,
  queue: Queue
): Promise<boolean> => {
  if (queue.songs.length === 0) {
    await interaction.reply(AUDIO_MESSAGES.ERRORS.QUEUE_EMPTY);
    return false;
  }
  return true;
};