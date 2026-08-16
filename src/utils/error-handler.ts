import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import logger from "../logger.js";

const getErrorCode = (error: unknown): unknown =>
	typeof error === "object" && error !== null && "code" in error
		? (error as { code: unknown }).code
		: undefined;

const getErrorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

export const handleCommandError = async (
	error: unknown,
	interaction: ChatInputCommandInteraction,
) => {
	logger.error(`Command error in ${interaction.commandName}:`, error);

	const errorMessage = getErrorMessage(error);
	let message = "There was an error while executing this command!";

	if (getErrorCode(error) === 50001) {
		message = "❌ Missing permissions to execute this command";
	} else if (errorMessage.includes("Invalid URL")) {
		message = "❌ Invalid URL format. Please use a valid YouTube URL.";
	} else if (errorMessage.includes("Invalid search query")) {
		message = "❌ Invalid search query. Please try a different search term.";
	} else if (errorMessage.includes("yt-dlp failed")) {
		message = "❌ Failed to process video. Please try again later.";
	}

	try {
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: message,
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: message,
				flags: MessageFlags.Ephemeral,
			});
		}
	} catch (followUpError) {
		logger.error("Failed to send error message:", followUpError);
	}
};

export const handleNonCommandError = (error: unknown, context: string) => {
	const errorMessage = getErrorMessage(error);

	if (errorMessage.includes("yt-dlp failed") || getErrorCode(error) === 1) {
		logger.warn(`[${context}] yt-dlp process failed: ${errorMessage}`);
	} else {
		logger.error(`[${context}] Unexpected error:`, error);
	}
};
