import { ChatInputCommandInteraction, VoiceBasedChannel, GuildMember } from "discord.js";
import { AUDIO_MESSAGES } from "../constants/audio-messages.js";
import { Queue } from "../types/queue.js";

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

export const validateVoiceChannel = async (
  interaction: ChatInputCommandInteraction
): Promise<VoiceBasedChannel | null> => {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.reply(AUDIO_MESSAGES.ERRORS.NO_VOICE_CHANNEL);
    return null;
  }

  return voiceChannel;
};

export const validateQueueState = async (
  interaction: ChatInputCommandInteraction,
  queue?: any
): Promise<boolean> => {
  if (queue?.destroying) {
    await interaction.reply(AUDIO_MESSAGES.ERRORS.BOT_DISCONNECTING);
    return false;
  }
  return true;
};

export const sanitizeInput = (input: string): boolean => {
  if (input.length > 1000) return false;
  const dangerousChars = /[;&|`$(){}[\]\\'"\n\r\t]/;
  if (dangerousChars.test(input)) return false;
  if (/\.\./g.test(input)) return false;
  
  if (input.startsWith('http')) {
    try {
      const url = new URL(input);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }
  return true;
};

export const sanitizeQuery = (query: string): boolean => {
  return query.length <= 200 && !/[;&|`$()]/.test(query);
};