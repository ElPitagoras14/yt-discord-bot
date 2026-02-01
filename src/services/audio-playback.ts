// Servicios de reproducción de audio
import { ChatInputCommandInteraction, Client } from "discord.js";
import logger from "../logger.js";
import { createSessionLogger } from "../logger.js";
import { getNextSong } from "./queue.js";
import { createAudioStream, playAudioResource } from "./audio-stream.js";
import { MESSAGES } from "../constants/messages.js";

export const playNext = async (
  guildId: string,
  interaction: ChatInputCommandInteraction,
  sessionId?: string,
  user?: string,
) => {
  const sessionLogger = createSessionLogger(sessionId, user);
  sessionLogger.info("Playing next song");
  const client = interaction.client as Client<true>;
  const queue = client.queue.get(guildId);

  if (!queue) {
    logger.warn(MESSAGES.ERRORS.QUEUE_NOT_FOUND);
    return;
  }

  const song = getNextSong(queue);
  if (!song) return;

  const { title, url, requestedBy, sessionId: songSessionId } = song;

  // Usar el logger de la canción si tiene sesión, sino el del comando
  const finalLogger = songSessionId
    ? createSessionLogger(songSessionId, requestedBy)
    : sessionLogger;

  await interaction.followUp(MESSAGES.SUCCESS.NOW_PLAYING(title));

  const player = queue.player;
  finalLogger.info(`Creating stream for URL: ${url}`);

  const { resource, cleanup } = createAudioStream(url!, title, url);

  const playSuccess = await playAudioResource(interaction, resource, player);

  if (!playSuccess) {
    cleanup();
  }
};
