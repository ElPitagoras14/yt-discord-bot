import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
  GuildTextBasedChannel,
} from "discord.js";
import { Command } from "../../types/command.js";
import { validateVoiceChannel, isValidYouTubeUrl } from "../../utils/validation.js";
import { ytDlpService } from "../../music/YtDlpService.js";
import { musicManager } from "../../music/MusicManager.js";
import { createVideoSelectMenu, handleVideoSelection } from "../../components/video-selector.js";
import { MESSAGES } from "../../constants/messages.js";
import logger from "../../logger.js";
import { formatUserForLogging } from "../../utils/user-format.js";
import { GuildQueueState } from "../../music/types.js";

const play: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays a song.")
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((sub) =>
      sub
        .setName("url")
        .setDescription("Plays a song from a YouTube URL.")
        .addStringOption((opt) =>
          opt.setName("url").setDescription("YouTube video URL").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("query")
        .setDescription("Searches for a song and plays it.")
        .addStringOption((opt) =>
          opt.setName("query").setDescription("Search query").setRequired(true),
        ),
    ),

  execute: async (interaction: Interaction) => {
    const i = interaction as ChatInputCommandInteraction;
    const user = formatUserForLogging(i);
    const guildId = i.guildId!;

    logger.info(`[${guildId}] [${user}] /play invoked`);

    const voiceChannel = await validateVoiceChannel(i);
    if (!voiceChannel) return;

    await i.deferReply();

    let url: string;
    const subcommand = i.options.getSubcommand();

    if (subcommand === "url") {
      const raw = i.options.getString("url", true);
      const cleaned = isValidYouTubeUrl(raw);
      if (!cleaned) {
        await i.editReply(MESSAGES.ERRORS.INVALID_YOUTUBE_URL);
        return;
      }
      url = cleaned;
    } else {
      const query = i.options.getString("query", true);
      let results;
      try {
        results = await ytDlpService.search(query);
      } catch (err) {
        logger.error(`[${guildId}] [${user}] Search failed: ${err}`);
        await i.editReply(MESSAGES.ERRORS.VALID_URL_REQUIRED);
        return;
      }

      const menuWithRow = createVideoSelectMenu(results);
      const selection = await handleVideoSelection(i, menuWithRow);
      if (!selection) return;
      url = selection.url;
    }

    let metadata;
    try {
      metadata = await ytDlpService.getMetadata(url);
    } catch (err) {
      logger.error(`[${guildId}] [${user}] getMetadata failed: ${err}`);
      await i.editReply(MESSAGES.ERRORS.VALID_URL_REQUIRED);
      return;
    }

    if (metadata._type !== "video") {
      await i.editReply(MESSAGES.ERRORS.INVALID_VIDEO_URL);
      return;
    }

    const song = { title: metadata.title, url, requestedBy: user };
    const textChannel = i.channel as GuildTextBasedChannel;
    let queue = musicManager.getQueue(guildId);
    const isNewQueue = !queue;

    if (!queue) {
      queue = musicManager.createQueue(guildId, voiceChannel, textChannel);
    }

    queue.enqueue(song);
    await i.editReply(MESSAGES.SUCCESS.SONG_ADDED(metadata.title));

    if (isNewQueue || queue.currentState === GuildQueueState.Idle) {
      await queue.startPlayback();
    }
  },
};

export default play;
