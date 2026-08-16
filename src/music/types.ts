export type SongSource = "youtube" | "local";

export interface Song {
	title: string;
	/** YouTube watch URL, or the absolute path of the local file. */
	url: string;
	source: SongSource;
	requestedBy?: string;
}

export interface CatalogEntry {
	fileName: string;
	displayName: string;
	path: string;
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
