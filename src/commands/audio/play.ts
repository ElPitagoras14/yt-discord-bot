import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  Client,
  GuildMember,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  VoiceBasedChannel,
} from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
  VoiceConnection,
  AudioPlayer,
  VoiceConnectionStatus,
  entersState,
} from "@discordjs/voice";
import ffmpegPath from "ffmpeg-static";
import { PlaylistInfo, YtDlp } from "ytdlp-nodejs";
import { Command } from "../../types/command";
import { spawn } from "node:child_process";
import { PassThrough, Readable } from "node:stream";
import logger from "../../logger.js";
import { Queue } from "../../types/queue";
import { fileURLToPath } from "url";
import path from "node:path";

const ytdlp = new YtDlp();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.dirname(__dirname);
const grandParentDir = path.dirname(parentDir);

const assetsPath = path.join(grandParentDir, "assets", "destroy.mp3");

const createAudioResourceFromMP3 = (filePath: string) => {
  const ffmpegProcess = spawn(
    ffmpegPath!,
    [
      "-i",
      filePath,
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-loglevel",
      "quiet",
      "pipe:1",
    ],
    {
      stdio: ["ignore", "pipe", "ignore"],
    }
  );

  return createAudioResource(ffmpegProcess.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: true,
  });
};

const cleanConnection = async (
  chatInteraction: ChatInputCommandInteraction,
  voiceChannel: VoiceBasedChannel,
  connection: VoiceConnection,
  player: AudioPlayer,
  queue: Queue | undefined
) => {
  queue!.playing = false;
  queue = undefined;
  chatInteraction.client.queue.delete(voiceChannel.guild.id);
  logger.info("Queue deleted");
  connection.destroy();
  player.stop();
  logger.info("Audio player stopped");
  logger.info("Voice connection destroyed");
};

const playNext = async (
  guildId: string,
  interaction: ChatInputCommandInteraction
) => {
  logger.info("Playing next song");
  const client = interaction.client as Client<true>;
  const queue = client.queue.get(guildId);
  if (!queue) {
    logger.warn("Queue not found");
    return;
  }

  const [{ title, url }] = queue.songs;

  await interaction.followUp(`🎶 Now playing: ${title}`);

  const player = queue.player;

  logger.info("Creating stream");
  const stream = ytdlp.stream(url!, {
    format: {
      filter: "audioonly",
    },
  });

  const ffmpeg = spawn(ffmpegPath!, [
    "-i",
    "pipe:0",
    "-f",
    "s16le",
    "-ar",
    "48000",
    "-ac",
    "2",
    "pipe:1",
  ]);

  stream.pipe(ffmpeg.stdin);

  logger.info("Creating buffer stream");
  const bufferStream = new PassThrough({ highWaterMark: 1 << 19 });
  ffmpeg.stdout.pipe(bufferStream);

  logger.info("Creating audio resource");
  const resource = createAudioResource(bufferStream, {
    inputType: StreamType.Raw,
  });

  if (!resource) {
    logger.error("Failed to create audio resource");
    return;
  }

  logger.debug("Setting volume");
  resource.volume?.setVolume(0.5);
  logger.info("Playing audio resource");
  player.play(resource);
};

const play: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays a song.")
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("url")
        .setDescription("Plays a song from a URL.")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("The URL of the song to play.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("query")
        .setDescription("Searches for a song and plays it.")
        .addStringOption((option) =>
          option

            .setName("query")
            .setDescription("The query to search for.")
            .setRequired(true)
        )
    ),
  execute: async (interaction: Interaction) => {
    logger.info("Play command executed");
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const member = chatInteraction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      logger.warn("User is not in a voice channel");
      await chatInteraction.reply(
        "You must be in a voice channel to play music!"
      );
      return;
    }

    let queue = chatInteraction.client.queue.get(voiceChannel.guild.id);
    if (queue?.destroying) {
      await chatInteraction.reply(
        "❌ The bot is disconnecting. Try again in 3 seconds."
      );
      return;
    }

    const subcommand = chatInteraction.options.getSubcommand();

    await chatInteraction.deferReply();

    let url;
    let songSelected: StringSelectMenuInteraction | undefined;
    if (subcommand === "url") {
      logger.info("URL subcommand executed");
      url = chatInteraction.options.getString("url", true);
    } else if (subcommand === "query") {
      logger.info("Query subcommand executed");
      const query = chatInteraction.options.getString("query", true);

      const info = await ytdlp.getInfoAsync(`ytsearch5:${query}`);

      if (!info) {
        logger.warn("Failed to get info for query");
        await chatInteraction.editReply(`Failed to play. Use a valid query.`);
        return;
      }

      if (info._type !== "playlist") {
        logger.warn("Query is not a playlist");
        await chatInteraction.editReply(
          `Failed to play. The query is not a playlist.`
        );
        return;
      }

      const parsedInfo = info as PlaylistInfo;
      const videoMap = new Map<string, string>();

      const videoSelect = new StringSelectMenuBuilder()
        .setCustomId("video-select")
        .setPlaceholder("Select a video")
        .addOptions(
          parsedInfo.entries.map((video) => {
            const title =
              video.title.length > 50
                ? `${video.title.slice(0, 50)}...`
                : video.title;
            videoMap.set(video.url, title);
            return new StringSelectMenuOptionBuilder()
              .setLabel(title)
              .setValue(video.url);
          })
        )
        .setRequired(true);
      logger.debug("Created video select menu");

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        videoSelect
      );

      const response = await chatInteraction.followUp({
        content: `Select a song to play.`,
        components: [row],
        withResponse: true,
      });
      logger.info("Sent video select menu response");

      const collectorFilter = (i: Interaction) => i.user.id === member.id;

      try {
        logger.info("Awaiting song selected");
        songSelected = (await response.awaitMessageComponent({
          filter: collectorFilter,
          time: 30000,
        })) as StringSelectMenuInteraction;
        if (songSelected.isStringSelectMenu()) {
          logger.debug("Song selected is a string select menu");
          url = songSelected.values[0];
          const label = videoMap.get(url);
          logger.info(`Song selected is ${label}`);
          await songSelected.update({
            content: `Song ${label} added to queue.`,
            components: [],
          });
        } else {
          logger.warn("Song selected is not a string select menu");
          await chatInteraction.editReply({
            content: "Song no selected within 1 minute, cancelling",
            components: [],
          });
          return;
        }
      } catch (error) {
        logger.warn("Failed to await song selected");
        logger.error(error);
        await chatInteraction.editReply({
          content: "Song no selected within 1 minute, cancelling",
          components: [],
        });
        return;
      }
    }

    let info;
    try {
      logger.info("Getting info for URL");
      info = await ytdlp.getInfoAsync(url!);

      if (info._type !== "video") {
        logger.warn("URL is not a video");
        await chatInteraction.editReply(
          "Failed to play. The URL is not a video."
        );
        return;
      }
    } catch (error) {
      logger.warn("Failed to get info for URL");
      logger.error(error);
      await chatInteraction.editReply("Failed to play. Use a valid URL.");
      return;
    }

    if (!queue) {
      logger.info("Creating audio player");
      const player = createAudioPlayer();

      logger.info("Joining voice channel");
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      queue = {
        songs: [],
        player,
        playing: false,
        destroying: false,
      };

      chatInteraction.client.queue.set(voiceChannel.guild.id, queue);

      connection.subscribe(player);

      connection.on(
        VoiceConnectionStatus.Disconnected,
        async (oldState, newState) => {
          try {
            await Promise.race([
              entersState(connection, VoiceConnectionStatus.Signalling, 5000),
              entersState(connection, VoiceConnectionStatus.Connecting, 5000),
            ]);
          } catch {
            cleanConnection(
              chatInteraction,
              voiceChannel,
              connection,
              player,
              queue
            );
          }
        }
      );

      player.on(AudioPlayerStatus.Idle, async () => {
        if (queue!.destroying) return;

        logger.debug("Audio player idle");
        queue?.songs.shift();

        if (queue!.songs.length > 0) {
          await playNext(voiceChannel.guild.id, chatInteraction);
        } else {
          logger.debug(
            "Queue is empty. Waiting 2.5 seconds before cleaning up"
          );

          const resource = createAudioResourceFromMP3(assetsPath);
          resource.volume?.setVolume(3);
          player.play(resource);
          queue!.destroying = true;

          setTimeout(() => {
            cleanConnection(
              chatInteraction,
              voiceChannel,
              connection,
              player,
              queue
            );
          }, 2500);
        }
      });

      logger.info("Audio player subscribed");
    }

    queue.songs.push({ title: info.title, url: url! });
    if (!songSelected) {
      logger.info(`Song ${info.title} added to queue`);
      await chatInteraction.editReply(`Song ${info.title} added to queue.`);
    }

    if (!queue.playing) {
      await playNext(voiceChannel.guild.id, chatInteraction);
      queue.playing = true;
    }
  },
};

export default play;
