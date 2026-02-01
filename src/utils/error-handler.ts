import { MessageFlags } from "discord.js";
import { ChatInputCommandInteraction } from "discord.js";
import logger from "../logger.js";

export const handleCommandError = async (
  error: any,
  interaction: ChatInputCommandInteraction,
) => {
  logger.error(`Command error in ${interaction.commandName}:`, error);

  let message = "There was an error while executing this command!";

  if (error.code === 50001) {
    message = "❌ Missing permissions to execute this command";
  } else if (error.message.includes("Invalid URL")) {
    message = "❌ Invalid URL format. Please use a valid YouTube URL.";
  } else if (error.message.includes("Invalid search query")) {
    message = "❌ Invalid search query. Please try a different search term.";
  } else if (error.message.includes("yt-dlp failed")) {
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

export const handleNonCommandError = (error: any, context: string) => {
  if (error.message.includes("yt-dlp failed") || error.code === 1) {
    logger.warn(`[${context}] yt-dlp process failed: ${error.message}`);
  } else {
    logger.error(`[${context}] Unexpected error:`, error);
  }
};
