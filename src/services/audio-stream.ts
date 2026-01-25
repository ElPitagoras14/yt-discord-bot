// Servicios de streaming de audio
import { spawn } from "node:child_process";
import { createAudioResource, StreamType } from "@discordjs/voice";
import { PassThrough } from "node:stream";
import logger from "../logger.js";
import { AUDIO_CONSTANTS } from "../constants/audio.js";
import { MESSAGES } from "../constants/messages.js";
import { ChatInputCommandInteraction } from "discord.js";

export const createAudioResourceFromMP3 = (filePath: string) => {
  const ffmpegProcess = spawn(
    "ffmpeg",
    ["-i", filePath, ...AUDIO_CONSTANTS.FFMPEG.MP3_ARGS],
    {
      stdio: ["ignore", "pipe", "ignore"],
    },
  );

  return createAudioResource(ffmpegProcess.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: true,
  });
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

  // Error handling para procesos
  const handleProcessError = (processName: string, error: any) => {
    logger.error(`${processName} process error: ${error}`);
  };

  yt.on("error", (error) => handleProcessError("yt-dlp", error));
  ffmpeg.on("error", (error) => handleProcessError("ffmpeg", error));

  // Error accumulation
  let ytError = "";
  let ffmpegError = "";

  yt.stderr.on("data", (d) => {
    const data = d.toString();
    if (!data.trim()) return;
    
    // Silenciar completamente logs de descarga
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

  // Close handling
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

  // Pipe streams
  yt.stdout.pipe(ffmpeg.stdin, { end: true });

  const bufferStream = new PassThrough({
    highWaterMark: AUDIO_CONSTANTS.BUFFER.HIGH_WATER_MARK,
    emitClose: true,
  });

  ffmpeg.stdout.pipe(bufferStream, { end: true });
  bufferStream.on("error", (error) =>
    logger.error(`buffer stream error: ${error}`),
  );

  // Create resource
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
