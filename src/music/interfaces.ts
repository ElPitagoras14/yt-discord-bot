import type { AudioResource } from "@discordjs/voice";
import type {
	CatalogEntry,
	SearchResult,
	Song,
	SongSource,
	VideoMetadata,
} from "./types.js";

export interface AudioResourceHandle {
	resource: AudioResource;
	cleanup: () => void;
}

export interface AudioSourceStrategy {
	createResource(song: Song): AudioResourceHandle;
}

/** Resolves the strategy that can play a given song, based on its source. */
export type AudioStrategyResolver = (source: SongSource) => AudioSourceStrategy;

export interface ILocalCatalogService {
	/** Cached catalog entries, refreshed from disk once the TTL expires. */
	getCatalog(): Promise<CatalogEntry[]>;
	/** Entries whose display name contains `query`, case-insensitively. */
	search(query: string): Promise<CatalogEntry[]>;
	/** The entry matching `fileName` exactly, or null when it is unknown. */
	resolve(fileName: string): Promise<CatalogEntry | null>;
}

export interface IYtDlpService {
	getMetadata(url: string): Promise<VideoMetadata>;
	search(query: string): Promise<SearchResult[]>;
}
