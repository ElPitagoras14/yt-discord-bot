import {
  ChatInputCommandInteraction,
  VoiceBasedChannel,
  GuildMember,
} from "discord.js";
import { AUDIO_MESSAGES } from "../constants/audio-messages.js";
import { Queue } from "../types/queue.js";

export const validateQueueExists = async (
  interaction: ChatInputCommandInteraction,
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
  queue: Queue,
): Promise<boolean> => {
  if (queue.songs.length === 0) {
    await interaction.reply(AUDIO_MESSAGES.ERRORS.QUEUE_EMPTY);
    return false;
  }
  return true;
};

export const validateVoiceChannel = async (
  interaction: ChatInputCommandInteraction,
): Promise<VoiceBasedChannel | null> => {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.reply(AUDIO_MESSAGES.ERRORS.NO_VOICE_CHANNEL);
    return null;
  }

  return voiceChannel;
};

/**
 * Validate input for security - prevents command injection
 * Rejects dangerous characters and overly long inputs
 */
export const sanitizeInput = (input: string): boolean => {
  if (input.length > 1000) return false;
  
  // For URLs, be more lenient with & since it's required for query parameters
  if (input.startsWith("http")) {
    const dangerousCharsUrl = /[;|`$(){}[\]\\'"\n\r\t]/;
    if (dangerousCharsUrl.test(input)) return false;
    
    try {
      const url = new URL(input);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }
  
  // For non-URL inputs, be stricter
  const dangerousChars = /[;&|`$(){}[\]\\'"\n\r\t]/;
  if (dangerousChars.test(input)) return false;
  if (/\.\./g.test(input)) return false;
  
  return true;
};

/**
 * Extract YouTube video ID from various URL formats
 * Supports youtube.com/watch, youtu.be, and youtube.com/embed formats
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    // youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    // youtube.com/watch?...v=VIDEO_ID (v parameter anywhere)
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

/**
 * Clean YouTube URLs by removing unwanted parameters
 * Preserves video ID and optional timestamp
 */
export const cleanYouTubeUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    
    // Check if it's a YouTube domain
    const isYouTube = ['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com'].includes(urlObj.hostname);
    if (!isYouTube) return null;

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return null;

    // Only keep essential parameters
    const essentialParams = new URLSearchParams();
    essentialParams.set('v', videoId);

    // Preserve timestamp if present (useful for starting at specific time)
    const timestamp = urlObj.searchParams.get('t');
    if (timestamp) {
      essentialParams.set('t', timestamp);
    }

    return `https://www.youtube.com/watch?${essentialParams.toString()}`;
  } catch {
    return null;
  }
};

/**
 * Enhanced YouTube URL validation
 * Returns cleaned URL if valid, null if invalid
 */
export const isValidYouTubeUrl = (url: string): string | null => {
  if (!sanitizeInput(url)) return null;
  
  const cleanedUrl = cleanYouTubeUrl(url);
  return cleanedUrl;
};

/**
 * Validate search queries - more lenient than URL validation
 * Still prevents command injection attacks
 */
export const sanitizeQuery = (query: string): boolean => {
  return query.length <= 200 && !/[;&|`$()]/.test(query);
};
