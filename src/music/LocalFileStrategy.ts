import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";
import { createAudioResource, StreamType } from "@discordjs/voice";
import { AUDIO_CONSTANTS } from "../constants/audio.js";
import logger from "../logger.js";
import type { AudioResourceHandle, AudioSourceStrategy } from "./interfaces.js";
import type { Song } from "./types.js";

/**
 * Plays a file straight off the shared volume: a single ffmpeg process reading
 * the path, with no yt-dlp stage and therefore no pipe between two processes.
 */
export class LocalFileStrategy implements AudioSourceStrategy {
	createResource(song: Song): AudioResourceHandle {
		const ffmpeg = spawn(
			"ffmpeg",
			["-i", song.url, ...AUDIO_CONSTANTS.FFMPEG.MP3_ARGS],
			{
				stdio: ["ignore", "pipe", "pipe"],
			},
		);

		const isPipeError = (err: NodeJS.ErrnoException) =>
			err.code === "ERR_STREAM_PREMATURE_CLOSE" || err.code === "EPIPE";

		ffmpeg.on("error", (err) => {
			if (isPipeError(err)) return;
			logger.error(
				`[ffmpeg] process error for "${song.title}": ${err.message}`,
			);
		});

		ffmpeg.stderr?.on("data", (data: Buffer) => {
			const msg = data.toString().trim();
			if (msg) logger.error(`[ffmpeg] ${msg}`);
		});

		ffmpeg.on("close", (code) => {
			if (code !== 0 && code !== null) {
				logger.error(`[ffmpeg] exited with code ${code} for "${song.title}"`);
			}
		});

		const passThrough = new PassThrough({
			highWaterMark: AUDIO_CONSTANTS.BUFFER.HIGH_WATER_MARK,
		});
		ffmpeg.stdout.pipe(passThrough, { end: true });

		passThrough.on("error", (err: NodeJS.ErrnoException) => {
			if (isPipeError(err)) return;
			logger.error(`[ffmpeg] stream error for "${song.title}": ${err.message}`);
		});

		const resource = createAudioResource(passThrough, {
			inputType: StreamType.Raw,
			inlineVolume: true,
			metadata: { title: song.title, url: song.url },
		});

		resource.volume?.setVolume(AUDIO_CONSTANTS.VOLUME.DEFAULT);

		const cleanup = () => {
			ffmpeg.stdout.unpipe();
			ffmpeg.kill("SIGKILL");
		};

		return { resource, cleanup };
	}
}

export const localFileStrategy = new LocalFileStrategy();
