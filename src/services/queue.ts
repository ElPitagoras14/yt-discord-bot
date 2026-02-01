import { Queue, Song } from "../types/queue.js";
import { ChatInputCommandInteraction, Client } from "discord.js";
import logger from "../logger.js";
import { MESSAGES } from "../constants/messages.js";

/**
 * Create new empty queue with default values
 * Initializes in idle state with no songs
 */
export const createQueue = (): Queue => ({
  songs: [],
  player: null as any,
  playing: false,
  idleTimer: null,
});

export const getOrCreateQueue = async (
  interaction: ChatInputCommandInteraction,
): Promise<Queue> => {
  const client = interaction.client as Client<true>;
  const guildId = interaction.guildId!;

  let queue = client.queue.get(guildId);

  if (!queue) {
    queue = createQueue();
    client.queue.set(guildId, queue);
    logger.info(`Created new queue for guild ${guildId}`);
  }

  return queue;
};

/**
 * Add song to queue and log for debugging
 * Tracks which user requested the song and session information
 */
export const addSongToQueue = (
  queue: Queue,
  song: Omit<Song, "url"> & { url: string },
): void => {
  queue.songs.push(song as Song);
  const userStr = song.requestedBy ? ` (requested by ${song.requestedBy})` : "";
  const sessionStr = song.sessionId ? ` [${song.sessionId}]` : "";
  logger.info(`Added song to queue: ${song.title}${userStr}${sessionStr}`);
};

export const getNextSong = (queue: Queue): Song | null => {
  const song = queue.songs[0];
  if (!song) {
    logger.warn(MESSAGES.ERRORS.NO_SONG_FOUND);
    return null;
  }
  return song;
};

/**
 * Remove first song from queue (currently playing song)
 * Returns false if queue is already empty
 */
export const shiftQueue = (queue: Queue): boolean => {
  if (queue.songs.length === 0) return false;
  queue.songs.shift();
  return true;
};

export const isQueueEmpty = (queue: Queue): boolean => queue.songs.length === 0;

/**
 * Mark queue as actively playing
 * Prevents idle timeout during playback
 */
export const startQueuePlayback = (queue: Queue): void => {
  queue.playing = true;
};

/**
 * Mark queue as stopped
 * Allows idle timeout to start after song ends
 */
export const stopQueuePlayback = (queue: Queue): void => {
  queue.playing = false;
};

/**
 * Remove all songs from queue
 * Stops playback and clears all pending songs
 */
export const clearQueue = (queue: Queue): void => {
  queue.songs = [];
};
