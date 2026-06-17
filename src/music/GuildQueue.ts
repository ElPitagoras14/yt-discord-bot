import {
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  AudioPlayerError,
  entersState,
} from "@discordjs/voice";
import { VoiceBasedChannel, GuildTextBasedChannel } from "discord.js";
import logger from "../logger.js";
import { MESSAGES } from "../constants/messages.js";
import { AUDIO_CONSTANTS } from "../constants/audio.js";
import { AudioPlayerService } from "./AudioPlayerService.js";
import { AudioSourceStrategy, AudioResourceHandle } from "./interfaces.js";
import { Song, GuildQueueState } from "./types.js";

export class GuildQueue {
  private readonly guildId: string;
  private readonly connection: VoiceConnection;
  private readonly audioPlayer: AudioPlayerService;
  private readonly strategy: AudioSourceStrategy;
  private readonly textChannel: GuildTextBasedChannel;

  readonly songs: Song[] = [];
  private state: GuildQueueState = GuildQueueState.Idle;
  private idleTimer: NodeJS.Timeout | null = null;
  private currentHandle: AudioResourceHandle | null = null;
  private destroyed = false;
  private onDestroy: () => void;

  constructor(
    guildId: string,
    voiceChannel: VoiceBasedChannel,
    textChannel: GuildTextBasedChannel,
    strategy: AudioSourceStrategy,
    onDestroy: () => void,
  ) {
    this.guildId = guildId;
    this.textChannel = textChannel;
    this.strategy = strategy;
    this.onDestroy = onDestroy;

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    this.audioPlayer = new AudioPlayerService();
    this.connection.subscribe(this.audioPlayer.player);

    this.setupConnectionHandlers();
    this.setupPlayerHandlers();
  }

  get currentState(): GuildQueueState {
    return this.state;
  }

  enqueue(song: Song): void {
    this.songs.push(song);
    logger.info(`[${this.guildId}] Enqueued: "${song.title}" (requested by ${song.requestedBy ?? "unknown"})`);
  }

  async startPlayback(): Promise<void> {
    if (this.destroyed || this.state !== GuildQueueState.Idle) return;
    await this.playNext();
  }

  skip(): void {
    if (this.destroyed) return;
    logger.info(`[${this.guildId}] Skipping current song`);
    this.audioPlayer.stop();
  }

  stop(): void {
    if (this.destroyed) return;
    logger.info(`[${this.guildId}] Stopping playback and clearing queue`);
    this.songs.length = 0;
    this.currentHandle?.cleanup();
    this.currentHandle = null;
    this.audioPlayer.stop();
    this.state = GuildQueueState.Idle;
    this.destroy();
  }

  pause(): boolean {
    if (this.destroyed || this.state !== GuildQueueState.Playing) return false;
    const paused = this.audioPlayer.pause();
    if (paused) this.state = GuildQueueState.Paused;
    return paused;
  }

  resume(): boolean {
    if (this.destroyed || this.state !== GuildQueueState.Paused) return false;
    const resumed = this.audioPlayer.resume();
    if (resumed) this.state = GuildQueueState.Playing;
    return resumed;
  }

  clear(): void {
    const removed = this.songs.splice(1);
    logger.info(`[${this.guildId}] Queue cleared (${removed.length} songs removed)`);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearIdleTimer();
    this.currentHandle?.cleanup();
    this.currentHandle = null;
    this.audioPlayer.stop();
    this.connection.destroy();
    logger.info(`[${this.guildId}] GuildQueue destroyed`);
    this.onDestroy();
  }

  private async playNext(): Promise<void> {
    if (this.destroyed || this.songs.length === 0) return;

    const song = this.songs[0];
    this.clearIdleTimer();

    logger.info(`[${this.guildId}] Now playing: "${song.title}"`);

    try {
      this.currentHandle?.cleanup();
      const handle = this.strategy.createResource(song);
      this.currentHandle = handle;

      this.audioPlayer.play(handle.resource);
      this.state = GuildQueueState.Playing;

      await this.textChannel.send(MESSAGES.SUCCESS.NOW_PLAYING(song.title));
    } catch (err) {
      logger.error(`[${this.guildId}] Failed to play "${song.title}": ${err}`);
      this.songs.shift();
      await this.playNext();
    }
  }

  private onPlayerIdle(): void {
    if (this.destroyed) return;

    this.currentHandle?.cleanup();
    this.currentHandle = null;
    this.songs.shift();

    if (this.songs.length > 0) {
      this.playNext().catch((err) => {
        logger.error(`[${this.guildId}] Autoplay error: ${err}`);
      });
    } else {
      this.state = GuildQueueState.Idle;
      this.startIdleTimer();
    }
  }

  private setupPlayerHandlers(): void {
    this.audioPlayer.player.on(AudioPlayerStatus.Idle, () => {
      this.onPlayerIdle();
    });

    this.audioPlayer.player.on("error", (error: AudioPlayerError) => {
      logger.error(`[${this.guildId}] AudioPlayer error: ${error.message}`);
      const metadata = error.resource?.metadata as { title?: string } | undefined;
      if (metadata?.title) {
        logger.error(`[${this.guildId}] Affected song: "${metadata.title}"`);
      }
      this.onPlayerIdle();
    });
  }

  private setupConnectionHandlers(): void {
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, AUDIO_CONSTANTS.TIMEOUTS.RECONNECT_TIMEOUT),
          entersState(this.connection, VoiceConnectionStatus.Connecting, AUDIO_CONSTANTS.TIMEOUTS.RECONNECT_TIMEOUT),
        ]);
      } catch {
        logger.warn(`[${this.guildId}] Voice connection lost, destroying queue`);
        this.destroy();
      }
    });
  }

  private startIdleTimer(): void {
    this.clearIdleTimer();
    const duration = AUDIO_CONSTANTS.TIMEOUTS.IDLE_DISCONNECT;
    if (!Number.isInteger(duration) || duration <= 0) {
      logger.error(`[${this.guildId}] Invalid idle timeout duration: ${duration}`);
      return;
    }
    this.idleTimer = setTimeout(() => {
      logger.info(`[${this.guildId}] Idle timeout reached, disconnecting`);
      this.textChannel
        .send(MESSAGES.SUCCESS.IDLE_TIMEOUT)
        .catch((err) => logger.error(`[${this.guildId}] Failed to send idle message: ${err}`));
      this.destroy();
    }, duration);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
