export interface EventType {
	name: string;
	once?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: events are loaded dynamically, so each handler takes a different discord.js payload shape
	execute: (...args: any[]) => Promise<void> | void;
}
