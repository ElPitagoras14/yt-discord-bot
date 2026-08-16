import {
	type ChatInputCommandInteraction,
	Collection,
	Events,
	type Interaction,
	MessageFlags,
} from "discord.js";
import type { EventType } from "../types/event";
import { handleCommandError } from "../utils/error-handler.js";

const interactionCreate: EventType = {
	name: Events.InteractionCreate,
	execute: async (interaction: Interaction) => {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(
					`No command matching ${interaction.commandName} was found`,
				);
				return;
			}

			const { cooldowns } = interaction.client;

			let timestamps = cooldowns.get(command.data.name);
			if (!timestamps) {
				timestamps = new Collection();
				cooldowns.set(command.data.name, timestamps);
			}

			const now = Date.now();
			const defaultCooldownDuration = 3;
			const cooldownAmount =
				(command.cooldown ?? defaultCooldownDuration) * 1000;

			const lastUsedAt = timestamps.get(interaction.user.id);
			if (lastUsedAt !== undefined) {
				const expirationTime = lastUsedAt + cooldownAmount;

				if (now < expirationTime) {
					const expiredTimestamp = Math.round(expirationTime / 1000);
					interaction.reply({
						content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
						flags: MessageFlags.Ephemeral,
					});
					return;
				}
			}

			timestamps.set(interaction.user.id, now);
			setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

			try {
				await command.execute(interaction);
			} catch (error) {
				await handleCommandError(
					error,
					interaction as ChatInputCommandInteraction,
				);
			}
		} else if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(
					`No command matching ${interaction.commandName} was found`,
				);
				return;
			}

			if (!command.autocomplete) {
				console.error(
					`Command ${interaction.commandName} has no autocomplete handler`,
				);
				return;
			}

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				console.error(error);
			}
		}
	},
};

export default interactionCreate;
