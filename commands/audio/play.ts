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
} from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
} from "@discordjs/voice";
import ffmpegPath from "ffmpeg-static";
import { PlaylistInfo, YtDlp } from "ytdlp-nodejs";
import { Command } from "../../types/command";
import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";

const ytdlp = new YtDlp();

const playNext = async (
  guildId: string,
  interaction: ChatInputCommandInteraction
) => {
  const client = interaction.client as Client<true>;
  const queue = client.queue.get(guildId);
  if (!queue) return;

  const [{ title, url }] = queue.songs;

  await interaction.followUp(`🎶 Now playing: ${title}`);

  const player = queue.player;

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

  const bufferStream = new PassThrough({ highWaterMark: 1 << 20 });
  ffmpeg.stdout.pipe(bufferStream);

  const resource = createAudioResource(bufferStream, {
    inputType: StreamType.Raw,
  });

  if (!resource) {
    console.error("Failed to create audio resource");
    return;
  }

  resource.volume?.setVolume(0.5);
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
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const member = chatInteraction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await chatInteraction.reply(
        "You must be in a voice channel to play music!"
      );
      return;
    }

    const subcommand = chatInteraction.options.getSubcommand();

    await chatInteraction.deferReply();

    let url;
    let songSelected: StringSelectMenuInteraction | undefined;
    if (subcommand === "url") {
      url = chatInteraction.options.getString("url", true);
    } else if (subcommand === "query") {
      const query = chatInteraction.options.getString("query", true);

      const info = await ytdlp.getInfoAsync(`ytsearch5:${query}`);

      if (!info) {
        await chatInteraction.editReply(`Failed to play. Use a valid query.`);
        return;
      }

      if (info._type !== "playlist") {
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
            videoMap.set(video.url, video.title);
            return new StringSelectMenuOptionBuilder()
              .setLabel(video.title)
              .setValue(video.url);
          })
        )
        .setRequired(true);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        videoSelect
      );

      const response = await chatInteraction.followUp({
        content: `Select a song to play.`,
        components: [row],
        withResponse: true,
      });

      const collectorFilter = (i: Interaction) => i.user.id === member.id;

      try {
        const songSelected = await response.awaitMessageComponent({
          filter: collectorFilter,
          time: 30000,
        });
        if (songSelected.isStringSelectMenu()) {
          url = songSelected.values[0];
          const label = videoMap.get(url);
          await songSelected.update(`Song ${label} added to queue.`);
        }
      } catch (error) {
        await chatInteraction.editReply({
          content: "Song no selected within 1 minute, cancelling",
          components: [],
        });
        return;
      }
    }

    let info;
    try {
      info = await ytdlp.getInfoAsync(url!);

      if (info._type !== "video") {
        await chatInteraction.editReply(
          "Failed to play. The URL is not a video."
        );
        return;
      }
    } catch (error) {
      await chatInteraction.editReply("Failed to play. Use a valid URL.");
      return;
    }

    let queue = chatInteraction.client.queue.get(voiceChannel.guild.id);
    if (!queue) {
      const player = createAudioPlayer();

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      queue = {
        songs: [],
        player,
        playing: false,
      };

      chatInteraction.client.queue.set(voiceChannel.guild.id, queue);

      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, async () => {
        queue?.songs.shift();
        if (queue!.songs.length > 0) {
          await playNext(voiceChannel.guild.id, chatInteraction);
        } else {
          queue!.playing = false;
          console.log("Queue is empty");
        }
      });
    }

    queue.songs.push({ title: info.title, url: url! });
    if (!songSelected) {
      await chatInteraction.editReply(`Song ${info.title} added to queue.`);
    }

    if (!queue.playing) {
      await playNext(voiceChannel.guild.id, chatInteraction);
      queue.playing = true;
    }
  },
};

export default play;
