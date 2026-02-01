import { spawn } from "node:child_process";
import { createAudioResource, StreamType } from "@discordjs/voice";
import { PassThrough } from "node:stream";
import logger from "../logger.js";
import { AUDIO_CONSTANTS } from "../constants/audio.js";
import { MESSAGES } from "../constants/messages.js";
import { ChatInputCommandInteraction } from "discord.js";

export const createAudioResourceFromMP3 = (filePath: string) => {
  try {
    logger.debug(`Creating audio resource from: ${filePath}`);

    const ffmpegProcess = spawn(
      "ffmpeg",
      ["-i", filePath, ...AUDIO_CONSTANTS.FFMPEG.MP3_ARGS],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    ffmpegProcess.on("error", (error) => {
      logger.error(`FFmpeg process error for ${filePath}: ${error}`);
    });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0) {
        logger.warn(`FFmpeg process for ${filePath} exited with code: ${code}`);
      }
    });

    ffmpegProcess.stderr.on("data", (data) => {
      const errorMsg = data.toString().trim();
      if (errorMsg) {
        logger.error(`[FFmpeg stderr] ${errorMsg}`);
      }
    });

    const resource = createAudioResource(ffmpegProcess.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true,
    });

    logger.debug(`Audio resource created successfully from: ${filePath}`);
    return resource;
  } catch (error) {
    logger.error(`Error creating audio resource from ${filePath}: ${error}`);
    return undefined;
  }
};

export const createAudioStream = (
  url: string,
  title?: string,
  videoUrl?: string,
) => {
  const yt = spawn("yt-dlp", [
    "-f",
    AUDIO_CONSTANTS.YTDLP.AUDIO_FORMAT,
    "-o",
    "-",
    "--no-playlist",
    "--no-warnings",
    url,
  ]);

  const ffmpeg = spawn("ffmpeg", AUDIO_CONSTANTS.FFMPEG.ARGS);

  const handleProcessError = (processName: string, error: any) => {
    logger.error(`${processName} process error: ${error}`);
  };

  yt.on("error", (error) => {
    if ((error as any).code === "ERR_STREAM_PREMATURE_CLOSE") {
      logger.debug("yt-dlp process closed prematurely during skip");
      return;
    }
    handleProcessError("yt-dlp", error);
  });

  ffmpeg.on("error", (error) => {
    if ((error as any).code === "ERR_STREAM_PREMATURE_CLOSE") {
      logger.debug("FFmpeg process closed prematurely during skip");
      return;
    }
    handleProcessError("ffmpeg", error);
  });

  let ytError = "";
  let ffmpegError = "";

  yt.stderr.on("data", (d) => {
    const data = d.toString();
    if (!data.trim()) return;

    if (data.includes("[download]")) return;

    if (data.includes("ERROR") || data.includes("WARNING")) {
      ytError += data;
      logger.error(`[yt-dlp] ${data}`);
    }
  });

  ffmpeg.stderr.on("data", (d) => {
    const data = d.toString();
    if (data.trim()) {
      logger.error(`[ffmpeg] ${data}`);
      ffmpegError += data;
    }
  });

  yt.on("close", (code) => {
    if (code !== 0 && code !== null) {
      logger.error(`yt-dlp exited with code ${code}`);
      if (ytError) logger.error(`yt-dlp errors: ${ytError}`);
    }
  });

  ffmpeg.on("close", (code) => {
    if (code !== 0 && code !== null) {
      logger.error(`ffmpeg exited with code ${code}`);
      if (ffmpegError) logger.error(`ffmpeg errors: ${ffmpegError}`);
    }
  });

  yt.stdout.pipe(ffmpeg.stdin, { end: true });

  const bufferStream = new PassThrough({
    highWaterMark: AUDIO_CONSTANTS.BUFFER.HIGH_WATER_MARK,
    emitClose: true,
  });

  ffmpeg.stdout.pipe(bufferStream, { end: true });
  bufferStream.on("error", (error) => {
    // Handle premature closure during skip gracefully
    if ((error as any).code === "ERR_STREAM_PREMATURE_CLOSE") {
      logger.debug("Stream closed prematurely during skip - expected behavior");
      return; // Silence this specific error
    }
    logger.error(`buffer stream error: ${error}`);
  });

  const resource = createAudioResource(bufferStream, {
    inputType: StreamType.Raw,
    inlineVolume: true,
    metadata: {
      title: title || "Unknown",
      url: videoUrl || "Unknown",
    },
  });

  return {
    resource,
    cleanup: () => {
      yt.kill();
      ffmpeg.kill();
    },
  };
};

export const playAudioResource = async (
  interaction: ChatInputCommandInteraction,
  resource: any,
  player: any,
) => {
  if (!resource) {
    await interaction.followUp(MESSAGES.ERRORS.AUDIO_RESOURCE_FAILED);
    return false;
  }

  try {
    resource.volume?.setVolume(AUDIO_CONSTANTS.VOLUME.DEFAULT);
    player.play(resource);
    return true;
  } catch (error) {
    logger.error(`Error playing audio resource: ${error}`);
    await interaction.followUp(MESSAGES.ERRORS.AUDIO_PLAY_FAILED);
    return false;
  }
};
