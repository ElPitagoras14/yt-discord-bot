import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
  VoiceBasedChannel,
} from "discord.js";
import { createAudioPlayer } from "@discordjs/voice";
import { Command } from "../../types/command";
import { validateVoiceChannel } from "../../utils/validation.js";
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
import { formatUserForLogging } from "../../utils/user-format.js";
import { clearIdleTimeout } from "../../services/idle-timeout.js";

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
    const user = formatUserForLogging(chatInteraction);
    const sessionLogger = createSessionLogger(sessionId, user);

    sessionLogger.info("Play command executed");

    const voiceChannel = await validateVoiceChannel(chatInteraction);
    if (!voiceChannel) return;

    const existingQueue = chatInteraction.client.queue.get(
      voiceChannel.guild.id,
    );

    await chatInteraction.deferReply();

    const videoData = await getUrlFromSubcommand(
      chatInteraction,
      voiceChannel,
      sessionLogger,
    );
    if (!videoData) return;

    const { url, videoInfo, wasSelected } = videoData;

    let queue = existingQueue || (await getOrCreateQueue(chatInteraction));

    if (existingQueue) {
      clearIdleTimeout(queue);

      // Start playback if queue has songs but player is idle
      const queueIsEmpty = queue.songs.length === 0;
      const shouldResetPlayingState = queueIsEmpty && queue.playing;

      if (shouldResetPlayingState) {
        queue.playing = false;
      }

      const needsPlaybackStart =
        queue.songs.length === 1 || // First song in queue
        (!queue.playing && queue.songs.length > 0); // Player idle with songs

      if (needsPlaybackStart) {
        await playNext(voiceChannel.guild.id, chatInteraction, sessionId, user);
        startQueuePlayback(queue);
      }
    }

    if (!existingQueue) {
      const player = createAudioPlayer();
      queue.player = player;

      sessionLogger.info("Joining voice channel");
      const connection = createVoiceConnection(voiceChannel);
      connection.subscribe(player);

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

    addSongToQueue(queue, {
      title: videoInfo.title,
      url,
      requestedBy: user,
      sessionId,
    });

    if (!wasSelected) {
      await chatInteraction.editReply(
        MESSAGES.SUCCESS.SONG_ADDED(videoInfo.title),
      );
    }

    if (!queue.playing) {
      await playNext(voiceChannel.guild.id, chatInteraction, sessionId, user);
      startQueuePlayback(queue);
    }
  },
};

export default play;
