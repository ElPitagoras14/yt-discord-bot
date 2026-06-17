export interface Song {
  title: string;
  url: string;
  requestedBy?: string;
}

export interface VideoMetadata {
  _type: string;
  title: string;
  webpage_url: string;
  url?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface SearchResult {
  title: string;
  webpage_url: string;
  url?: string;
  duration?: number;
}

export enum GuildQueueState {
  Idle = "idle",
  Playing = "playing",
  Paused = "paused",
}
