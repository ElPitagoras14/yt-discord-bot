import { VoiceBasedChannel, GuildTextBasedChannel } from "discord.js";
import logger from "../logger.js";
import { GuildQueue } from "./GuildQueue.js";
import { AudioSourceStrategy } from "./interfaces.js";
import { ffmpegService } from "./FFmpegService.js";

class MusicManager {
  private readonly queues = new Map<string, GuildQueue>();
  private readonly strategy: AudioSourceStrategy;

  constructor(strategy: AudioSourceStrategy = ffmpegService) {
    this.strategy = strategy;
  }

  getQueue(guildId: string): GuildQueue | undefined {
    return this.queues.get(guildId);
  }

  createQueue(
    guildId: string,
    voiceChannel: VoiceBasedChannel,
    textChannel: GuildTextBasedChannel,
  ): GuildQueue {
    const existing = this.queues.get(guildId);
    if (existing) return existing;

    const queue = new GuildQueue(
      guildId,
      voiceChannel,
      textChannel,
      this.strategy,
      () => this.removeQueue(guildId),
    );

    this.queues.set(guildId, queue);
    logger.info(`[MusicManager] Created queue for guild ${guildId}`);
    return queue;
  }

  removeQueue(guildId: string): void {
    if (this.queues.delete(guildId)) {
      logger.info(`[MusicManager] Removed queue for guild ${guildId}`);
    }
  }
}

export const musicManager = new MusicManager();
