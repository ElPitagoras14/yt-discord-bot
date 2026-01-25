// Servicios de YouTube usando yt-dlp
import { spawn } from "node:child_process";
import logger from "../logger.js";
import { AUDIO_CONSTANTS } from "../constants/audio.js";
import { MESSAGES } from "../constants/messages.js";
import { sanitizeInput, sanitizeQuery } from "../utils/validation.js";

const NON_CRITICAL_PATTERNS = [
  "No supported JavaScript runtime could be found",
  "web_safari client https formats have been skipped",
  "web client https formats have been skipped",
  "JavaScript runtime without JS has been deprecated",
  "SABR streaming for this client",
];

export interface VideoInfo {
  _type: string;
  title: string;
  webpage_url: string;
  url?: string;
  [key: string]: any;
}

const logYtDlpError = (data: string, context: string = "yt-dlp") => {
  const trimmedData = data.trim();
  if (!trimmedData) return;

  // COMPLETAMENTE IGNORAR logs de descarga
  if (trimmedData.includes("[download]")) {
    return; // Silencio absoluto - no loguear nada
  }

  if (trimmedData.includes("ERROR")) {
    logger.error(`[${context}] ${trimmedData}`);
  } else if (trimmedData.includes("WARNING")) {
    if (
      !NON_CRITICAL_PATTERNS.some((pattern) => trimmedData.includes(pattern))
    ) {
      logger.warn(`[${context}] ${trimmedData}`);
    }
  } else {
    logger.info(`[${context}] ${trimmedData}`);
  }
};

export const getVideoInfo = async (url: string): Promise<VideoInfo> => {
  if (!sanitizeInput(url)) {
    throw new Error("Invalid or potentially malicious URL");
  }
  
  const yt = spawn("yt-dlp", ["-j", "--no-playlist", url], {
    timeout: AUDIO_CONSTANTS.YTDLP.TIMEOUT,
  });

  return new Promise((resolve, reject) => {
    let data = "";

    yt.stdout.on("data", (d) => (data += d.toString()));
    yt.stderr.on("data", (d) => logYtDlpError(d.toString(), "yt-dlp"));
    yt.on("error", reject);

    yt.on("close", (code) => {
      if (code !== 0 || !data) {
        return reject(new Error(MESSAGES.ERRORS.YTDLP_FAILED));
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error("Failed to parse video info"));
      }
    });
  });
};

export const searchVideos = async (query: string): Promise<VideoInfo[]> => {
  if (!sanitizeQuery(query)) {
    throw new Error("Invalid search query");
  }
  
  const yt = spawn("yt-dlp", ["-j", "ytsearch5:" + query]);

  return new Promise((resolve, reject) => {
    let buffer = "";
    let videos: VideoInfo[] = [];

    yt.stdout.on("data", (d) => {
      buffer += d.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            videos.push(JSON.parse(line));
          } catch (e) {
            logger.error(`Failed to parse JSON: ${line} - ${e}`);
          }
        }
      }
    });

    yt.stderr.on("data", (d) => logYtDlpError(d.toString(), "yt-dlp"));
    yt.on("close", (code) => {
      if (code !== 0 || videos.length === 0) {
        return reject(new Error("yt-dlp search failed"));
      }
      resolve(videos);
    });
  });
};
