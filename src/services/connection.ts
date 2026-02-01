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
import { isQueueEmpty, shiftQueue } from "./queue.js";
import { playNext } from "./audio-playback.js";
import { clearIdleTimeout, startIdleTimeout } from "./idle-timeout.js";

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
    const wasPlaying = queue.playing;
    shiftQueue(queue);

    if (!isQueueEmpty(queue)) {
      await playNext(voiceChannel.guild.id, interaction);
    } else if (wasPlaying) {
      // Queue became empty during playback
      queue.playing = false;

      // Wait to determine if this was from skip or song end
      setTimeout(() => {
        if (isQueueEmpty(queue) && queue.playing === false) {
          startIdleTimeout(queue, () => {
            cleanConnection(
              interaction,
              voiceChannel,
              connection,
              player,
              queue,
            );
          });
        }
      }, 200);
    } else {
      // Player was already idle with empty queue
      queue.playing = false;
      startIdleTimeout(queue, () => {
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
    clearIdleTimeout(queue);
  }
  chatInteraction.client.queue.delete(voiceChannel.guild.id);
  logger.info("Queue deleted");
  connection.destroy();
  player.stop();
  logger.info("Audio player stopped");
  logger.info("Voice connection destroyed");
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

  if (metadata) {
    logger.error(
      `Resource details: title=${metadata.title || "Unknown"}, url=${metadata.url || "Unknown"}, playbackDuration=${error.resource.playbackDuration}`,
    );
  } else {
    logger.error("No resource available in error");
  }

  if (queue && queue.songs.length > 1) {
    logger.debug("Attempting to play next song after error");
    shiftQueue(queue);
    playNext(voiceChannel.guild.id, interaction).catch((err) => {
      logger.error(`Failed to play next song: ${err}`);
      cleanConnection(interaction, voiceChannel, connection, player, queue);
    });
  } else {
    logger.debug("Cleaning up connection due to error");
    cleanConnection(interaction, voiceChannel, connection, player, queue);
  }
};
