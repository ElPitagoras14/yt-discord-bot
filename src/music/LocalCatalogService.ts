import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { AUDIO_CONSTANTS } from "../constants/audio.js";
import logger from "../logger.js";
import type { ILocalCatalogService } from "./interfaces.js";
import type { CatalogEntry } from "./types.js";

const { DIR, EXTENSION, CACHE_TTL } = AUDIO_CONSTANTS.LOCAL_CATALOG;

export class LocalCatalogService implements ILocalCatalogService {
	private readonly dir: string;
	private cache: CatalogEntry[] = [];
	private lastReadAt = 0;

	constructor(dir: string = DIR) {
		this.dir = dir;
	}

	async getCatalog(): Promise<CatalogEntry[]> {
		if (Date.now() - this.lastReadAt < CACHE_TTL) return this.cache;

		this.cache = await this.scan();
		this.lastReadAt = Date.now();
		return this.cache;
	}

	async search(query: string): Promise<CatalogEntry[]> {
		const catalog = await this.getCatalog();
		const needle = query.trim().toLowerCase();
		if (!needle) return catalog;

		return catalog.filter((entry) =>
			entry.displayName.toLowerCase().includes(needle),
		);
	}

	async resolve(fileName: string): Promise<CatalogEntry | null> {
		const catalog = await this.getCatalog();
		return catalog.find((entry) => entry.fileName === fileName) ?? null;
	}

	private async scan(): Promise<CatalogEntry[]> {
		let dirents: Dirent[];
		try {
			dirents = await fs.readdir(this.dir, { withFileTypes: true });
		} catch (err) {
			logger.error(`[LocalCatalog] Failed to read "${this.dir}": ${err}`);
			return [];
		}

		return dirents
			.filter((d) => d.isFile() && d.name.toLowerCase().endsWith(EXTENSION))
			.map((d) => ({
				fileName: d.name,
				displayName: path.basename(d.name, path.extname(d.name)),
				path: path.join(this.dir, d.name),
			}));
	}
}

export const localCatalogService = new LocalCatalogService();
