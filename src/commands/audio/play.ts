import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
  VoiceBasedChannel,
} from "discord.js";
import { createAudioPlayer } from "@discordjs/voice";
import { Command } from "../../types/command";
import logger from "../../logger.js";
import {
  validateVoiceChannel,
  validateQueueState,
} from "../../utils/validation.js";
import {
  getVideoInfo,
  searchVideos,
  VideoInfo,
} from "../../services/youtube.js";
import {
  getOrCreateQueue,
  addSongToQueue,
  startQueuePlayback,
} from "../../services/queue.js";
import {
  createVoiceConnection,
  setupConnectionHandlers,
  cleanConnection,
} from "../../services/connection.js";
import { playNext } from "../../services/audio-playback.js";
import {
  createVideoSelectMenu,
  handleVideoSelection,
} from "../../components/video-selector.js";
import { MESSAGES } from "../../constants/messages.js";
import { createSessionLogger, generateSessionId } from "../../logger.js";

const getUrlFromSubcommand = async (
  interaction: ChatInputCommandInteraction,
  _voiceChannel: VoiceBasedChannel,
  sessionLogger: any,
): Promise<{
  url: string;
  videoInfo: VideoInfo;
  wasSelected: boolean;
} | null> => {
  const subcommand = interaction.options.getSubcommand();
  let url: string | undefined;
  let wasSelected = false;

  if (subcommand === "url") {
    sessionLogger.info("URL subcommand executed");
    url = interaction.options.getString("url", true);
  } else if (subcommand === "query") {
    sessionLogger.info("Query subcommand executed");
    const query = interaction.options.getString("query", true);

    try {
      const results = await searchVideos(query);

      const menuWithRow = createVideoSelectMenu(results);
      const selection = await handleVideoSelection(interaction, menuWithRow);
      if (!selection) return null;

      url = selection.url;
      wasSelected = true;
    } catch (error) {
      sessionLogger.error("Search failed:", error);
      return null;
    }
  }

  if (!url) return null;

  try {
    sessionLogger.info("Getting info for URL");
    const videoInfo = await getVideoInfo(url);

    if (videoInfo._type !== "video") {
      await interaction.editReply(MESSAGES.ERRORS.INVALID_VIDEO_URL);
      return null;
    }

    return { url, videoInfo, wasSelected };
  } catch (error) {
    sessionLogger.error("Failed to get info for URL:", error);
    await interaction.editReply(MESSAGES.ERRORS.VALID_URL_REQUIRED);
    return null;
  }
};

const play: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays a song.")
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((subcommand: any) =>
      subcommand
        .setName("url")
        .setDescription("Plays a song from a URL.")
        .addStringOption((option: any) =>
          option
            .setName("url")
            .setDescription("The URL of the song to play.")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand: any) =>
      subcommand
        .setName("query")
        .setDescription("Searches for a song and plays it.")
        .addStringOption((option: any) =>
          option
            .setName("query")
            .setDescription("The query to search for.")
            .setRequired(true),
        ),
    ),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;
    const sessionId = generateSessionId();
    const user = `${chatInteraction.user.username}#${chatInteraction.user.discriminator}`;
    const sessionLogger = createSessionLogger(sessionId, user);
    
    sessionLogger.info("Play command executed");

    // Validar que el usuario esté en un canal de voz
    const voiceChannel = await validateVoiceChannel(chatInteraction);
    if (!voiceChannel) return;

    // Obtener o validar cola existente
    const existingQueue = chatInteraction.client.queue.get(
      voiceChannel.guild.id,
    );
    if (!(await validateQueueState(chatInteraction, existingQueue))) return;

    // Defer reply para procesamiento largo
    await chatInteraction.deferReply();

    // Obtener URL e info del video
    const videoData = await getUrlFromSubcommand(chatInteraction, voiceChannel, sessionLogger);
    if (!videoData) return;

    const { url, videoInfo, wasSelected } = videoData;

    // Obtener o crear cola
    let queue = existingQueue || (await getOrCreateQueue(chatInteraction));

    // Si no existe cola, crear player y conexión
    if (!existingQueue) {
      const player = createAudioPlayer();
      queue.player = player;

      sessionLogger.info("Joining voice channel");
      const connection = createVoiceConnection(voiceChannel);
      connection.subscribe(player);

      // Setup handlers
      setupConnectionHandlers(
        connection,
        player,
        queue,
        chatInteraction,
        voiceChannel,
        () =>
          cleanConnection(
            chatInteraction,
            voiceChannel,
            connection,
            player,
            queue,
          ),
      );

      sessionLogger.info("Audio player subscribed");
    }

    // Agregar canción a la cola
    addSongToQueue(queue, {
      title: videoInfo.title,
      url,
      requestedBy: user,
      sessionId,
    });

    // Responder al usuario (solo si no fue seleccionada)
    if (!wasSelected) {
      await chatInteraction.editReply(
        MESSAGES.SUCCESS.SONG_ADDED(videoInfo.title),
      );
    }

    // Iniciar reproducción si no está activa
    if (!queue.playing) {
      await playNext(voiceChannel.guild.id, chatInteraction, sessionId, user);
      startQueuePlayback(queue);
    }
  },
};

export default play;
