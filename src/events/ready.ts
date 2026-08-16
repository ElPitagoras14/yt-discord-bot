import { type Client, Events } from "discord.js";
import type { EventType } from "../types/event";

const clientReady: EventType = {
	name: Events.ClientReady,
	once: true,
	execute: (client: Client<true>) => {
		console.log(`✅ Ready! Logged in as ${client.user.tag}`);
	},
};

export default clientReady;
