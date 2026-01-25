// Servicios de conexión de voz
import {
  joinVoiceChannel,
  VoiceConnection,
  AudioPlayer,
  VoiceConnectionStatus,
  entersState,
  AudioPlayerStatus,
  AudioPlayerError,
} from "@discordjs/voice";
import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import logger from "../logger.js";
import { Queue } from "../types/queue.js";
import { AUDIO_CONSTANTS } from "../constants/audio.js";
import { createAudioResourceFromMP3 } from "./audio-stream.js";
import { isQueueEmpty, shiftQueue } from "./queue.js";
import { playNext } from "./audio-playback.js";

// Obtener path para assets
import { fileURLToPath } from "url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.dirname(__dirname);
const grandParentDir = path.dirname(parentDir);
const assetsPath = path.join(grandParentDir, "assets", "destroy.mp3");

export const createVoiceConnection = (
  voiceChannel: VoiceBasedChannel,
): VoiceConnection => {
  return joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });
};

export const setupConnectionHandlers = (
  connection: VoiceConnection,
  player: AudioPlayer,
  queue: Queue,
  interaction: ChatInputCommandInteraction,
  voiceChannel: VoiceBasedChannel,
  onDisconnect: () => void,
) => {
  connection.on(
    VoiceConnectionStatus.Disconnected,
    async (oldState, newState) => {
      try {
        await Promise.race([
          entersState(
            connection,
            VoiceConnectionStatus.Signalling,
            AUDIO_CONSTANTS.TIMEOUTS.RECONNECT_TIMEOUT,
          ),
          entersState(
            connection,
            VoiceConnectionStatus.Connecting,
            AUDIO_CONSTANTS.TIMEOUTS.RECONNECT_TIMEOUT,
          ),
        ]);
      } catch {
        onDisconnect();
      }
    },
  );

  player.on(AudioPlayerStatus.Idle, async () => {
    if (queue.destroying) return;

    logger.debug("Audio player idle");
    shiftQueue(queue);

    if (!isQueueEmpty(queue)) {
      await playNext(voiceChannel.guild.id, interaction);
    } else {
      logger.debug("Queue is empty. Playing cleanup sound");
      playCleanupSound(player, queue, () => {
        cleanConnection(interaction, voiceChannel, connection, player, queue);
      });
    }
  });

  player.on("error", (error: AudioPlayerError) => {
    handlePlayerError(
      error,
      queue,
      interaction,
      voiceChannel,
      connection,
      player,
    );
  });
};

export const cleanConnection = async (
  chatInteraction: ChatInputCommandInteraction,
  voiceChannel: VoiceBasedChannel,
  connection: VoiceConnection,
  player: AudioPlayer,
  queue: Queue | undefined,
) => {
  if (queue) {
    queue.playing = false;
  }
  chatInteraction.client.queue.delete(voiceChannel.guild.id);
  logger.info("Queue deleted");
  connection.destroy();
  player.stop();
  logger.info("Audio player stopped");
  logger.info("Voice connection destroyed");
};

const playCleanupSound = (
  player: AudioPlayer,
  queue: Queue,
  onComplete: () => void,
) => {
  queue.destroying = true;
  const resource = createAudioResourceFromMP3(assetsPath);
  if (resource) {
    resource.volume?.setVolume(AUDIO_CONSTANTS.VOLUME.CLEANUP_SOUND);
    player.play(resource);
  }

  setTimeout(onComplete, AUDIO_CONSTANTS.TIMEOUTS.CLEANUP_DELAY);
};

const handlePlayerError = (
  error: AudioPlayerError,
  queue: Queue,
  interaction: ChatInputCommandInteraction,
  voiceChannel: VoiceBasedChannel,
  connection: VoiceConnection,
  player: AudioPlayer,
) => {
  logger.error(`Audio player error: ${error.message}`);

  const metadata = error.resource?.metadata as any;
  const isCleanupSound = !metadata?.title;

  if (metadata) {
    logger.error(
      `Resource details: title=${metadata.title || "Unknown"}, url=${metadata.url || "Unknown"}, playbackDuration=${error.resource.playbackDuration}`,
    );
  } else {
    logger.error("No resource available in error");
  }

  if (queue && !queue.destroying && !isCleanupSound && queue.songs.length > 1) {
    logger.debug("Attempting to play next song after error");
    shiftQueue(queue);
    playNext(voiceChannel.guild.id, interaction).catch((err) => {
      logger.error(`Failed to play next song: ${err}`);
      cleanConnection(interaction, voiceChannel, connection, player, queue);
    });
  } else {
    logger.debug(
      "Cleaning up connection due to error or cleanup sound failure",
    );
    if (queue && !queue.destroying) {
      queue.destroying = true;
      setTimeout(
        () =>
          cleanConnection(interaction, voiceChannel, connection, player, queue),
        AUDIO_CONSTANTS.TIMEOUTS.CLEANUP_DELAY,
      );
    }
  }
};
