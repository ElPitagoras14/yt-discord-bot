import { AudioResource } from "@discordjs/voice";
import { Song, VideoMetadata, SearchResult } from "./types.js";

export interface AudioResourceHandle {
  resource: AudioResource;
  cleanup: () => void;
}

export interface AudioSourceStrategy {
  createResource(song: Song): AudioResourceHandle;
}

export interface IYtDlpService {
  getMetadata(url: string): Promise<VideoMetadata>;
  search(query: string): Promise<SearchResult[]>;
}
