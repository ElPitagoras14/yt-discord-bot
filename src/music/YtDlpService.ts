import { execa } from "execa";
import logger from "../logger.js";
import { sanitizeInput, sanitizeQuery } from "../utils/validation.js";
import { IYtDlpService } from "./interfaces.js";
import { VideoMetadata, SearchResult } from "./types.js";

const NON_CRITICAL_PATTERNS = [
  "No supported JavaScript runtime could be found",
  "web_safari client https formats have been skipped",
  "web client https formats have been skipped",
  "JavaScript runtime without JS has been deprecated",
  "SABR streaming for this client",
];

const filterStderr = (data: string): void => {
  const line = data.trim();
  if (!line || line.includes("[download]")) return;
  if (NON_CRITICAL_PATTERNS.some((p) => line.includes(p))) return;
  if (line.includes("ERROR")) {
    logger.error(`[yt-dlp] ${line}`);
  } else if (line.includes("WARNING")) {
    logger.warn(`[yt-dlp] ${line}`);
  }
};

export class YtDlpService implements IYtDlpService {
  async getMetadata(url: string): Promise<VideoMetadata> {
    if (!sanitizeInput(url)) {
      throw new Error("Invalid or potentially malicious URL");
    }

    let stderr = "";
    try {
      const result = await execa("yt-dlp", ["-j", "--no-playlist", url], {
        timeout: 15_000,
        reject: false,
        stripFinalNewline: true,
      });

      if (result.stderr) {
        result.stderr.split("\n").forEach(filterStderr);
        stderr = result.stderr;
      }

      if (result.exitCode !== 0 || !result.stdout) {
        logger.error(`[yt-dlp] getMetadata failed (exit ${result.exitCode}): ${stderr}`);
        throw new Error("yt-dlp failed to retrieve video metadata");
      }

      return JSON.parse(result.stdout) as VideoMetadata;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error("Failed to parse video metadata from yt-dlp");
      }
      throw err;
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!sanitizeQuery(query)) {
      throw new Error("Invalid search query");
    }

    const result = await execa("yt-dlp", ["-j", `ytsearch5:${query}`], {
      timeout: 20_000,
      reject: false,
    });

    if (result.stderr) {
      result.stderr.split("\n").forEach(filterStderr);
    }

    if (result.exitCode !== 0 || !result.stdout) {
      logger.error(`[yt-dlp] search failed (exit ${result.exitCode})`);
      throw new Error("yt-dlp search failed");
    }

    const results: SearchResult[] = [];
    for (const line of result.stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as VideoMetadata;
        results.push({
          title: parsed.title,
          webpage_url: parsed.webpage_url,
          url: parsed.url,
          duration: parsed.duration as number | undefined,
        });
      } catch {
        logger.error(`[yt-dlp] Failed to parse search result line: ${trimmed}`);
      }
    }

    if (results.length === 0) {
      throw new Error("No search results found");
    }

    return results;
  }
}

export const ytDlpService = new YtDlpService();
