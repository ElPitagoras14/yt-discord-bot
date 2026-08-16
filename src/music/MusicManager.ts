import type { GuildTextBasedChannel, VoiceBasedChannel } from "discord.js";
import logger from "../logger.js";
import { ffmpegService } from "./FFmpegService.js";
import { GuildQueue } from "./GuildQueue.js";
import type { AudioStrategyResolver } from "./interfaces.js";
import { localFileStrategy } from "./LocalFileStrategy.js";

const defaultResolver: AudioStrategyResolver = (source) =>
	source === "local" ? localFileStrategy : ffmpegService;

class MusicManager {
	private readonly queues = new Map<string, GuildQueue>();
	private readonly resolveStrategy: AudioStrategyResolver;

	constructor(resolveStrategy: AudioStrategyResolver = defaultResolver) {
		this.resolveStrategy = resolveStrategy;
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
			this.resolveStrategy,
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
