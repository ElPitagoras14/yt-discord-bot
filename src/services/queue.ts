// Servicios de gestión de colas
import { Queue, Song } from "../types/queue.js";
import { ChatInputCommandInteraction, Client } from "discord.js";
import logger from "../logger.js";
import { MESSAGES } from "../constants/messages.js";

export const createQueue = (): Queue => ({
  songs: [],
  player: null as any,
  playing: false,
  destroying: false,
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

export const addSongToQueue = (
  queue: Queue,
  song: Omit<Song, "url"> & { url: string },
): void => {
  queue.songs.push(song as Song);
  const userStr = song.requestedBy ? ` (requested by ${song.requestedBy})` : "";
  const sessionStr = song.sessionId ? ` [${song.sessionId}]` : "";
  logger.info(`Added song to queue: ${song.title}${userStr}${sessionStr}`);
};

export const getNextSong = (
  queue: Queue,
): Song | null => {
  const song = queue.songs[0];
  if (!song) {
    logger.warn(MESSAGES.ERRORS.NO_SONG_FOUND);
    return null;
  }
  return song;
};

export const shiftQueue = (queue: Queue): boolean => {
  if (queue.songs.length === 0) return false;
  queue.songs.shift();
  return true;
};

export const isQueueEmpty = (queue: Queue): boolean => queue.songs.length === 0;

export const startQueuePlayback = (queue: Queue): void => {
  queue.playing = true;
};

export const stopQueuePlayback = (queue: Queue): void => {
  queue.playing = false;
};

export const markQueueForDestruction = (queue: Queue): void => {
  queue.destroying = true;
};

export const clearQueue = (queue: Queue): void => {
  queue.songs = [];
};
