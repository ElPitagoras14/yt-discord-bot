import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";
import { createAudioResource, StreamType } from "@discordjs/voice";
import logger from "../logger.js";
import { AUDIO_CONSTANTS } from "../constants/audio.js";
import { AudioSourceStrategy, AudioResourceHandle } from "./interfaces.js";
import { Song } from "./types.js";

const FFMPEG_ARGS = [
  "-i", "pipe:0",
  "-map", "0:a",
  "-f", "s16le",
  "-ar", "48000",
  "-ac", "2",
  "-loglevel", "error",
  "pipe:1",
];

const YTDLP_ARGS = [
  "--js-runtimes", "node",
  "-f", "bestaudio",
  "-o", "-",
  "--no-playlist",
  "--quiet",
];

export class FFmpegService implements AudioSourceStrategy {
  createResource(song: Song): AudioResourceHandle {
    const yt = spawn("yt-dlp", [...YTDLP_ARGS, song.url], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const ffmpeg = spawn("ffmpeg", FFMPEG_ARGS, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const isPipeError = (err: NodeJS.ErrnoException) =>
      err.code === "ERR_STREAM_PREMATURE_CLOSE" || err.code === "EPIPE";

    yt.on("error", (err) => {
      if (isPipeError(err)) return;
      logger.error(`[yt-dlp] process error for "${song.title}": ${err.message}`);
    });

    ffmpeg.on("error", (err) => {
      if (isPipeError(err)) return;
      logger.error(`[ffmpeg] process error for "${song.title}": ${err.message}`);
    });

    yt.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) logger.error(`[yt-dlp] ${msg}`);
    });

    ffmpeg.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) logger.error(`[ffmpeg] ${msg}`);
    });

    yt.on("close", (code) => {
      if (code !== 0 && code !== null) {
        logger.error(`[yt-dlp] exited with code ${code} for "${song.title}"`);
      }
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0 && code !== null) {
        logger.error(`[ffmpeg] exited with code ${code} for "${song.title}"`);
      }
    });

    yt.stdout.on("error", (err: NodeJS.ErrnoException) => {
      if (isPipeError(err)) return;
      logger.error(`[yt-dlp] stdout error for "${song.title}": ${err.message}`);
    });

    ffmpeg.stdin?.on("error", (err: NodeJS.ErrnoException) => {
      if (isPipeError(err)) return;
      logger.error(`[ffmpeg] stdin error for "${song.title}": ${err.message}`);
    });

    yt.stdout.pipe(ffmpeg.stdin, { end: true });

    const passThrough = new PassThrough({ highWaterMark: 1 << 20 });
    ffmpeg.stdout.pipe(passThrough, { end: true });

    passThrough.on("error", (err) => {
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
      yt.stdout.unpipe();
      ffmpeg.stdout.unpipe();
      yt.kill("SIGKILL");
      ffmpeg.kill("SIGKILL");
    };

    return { resource, cleanup };
  }
}

export const ffmpegService = new FFmpegService();
