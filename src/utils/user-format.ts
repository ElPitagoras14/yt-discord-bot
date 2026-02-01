import { ChatInputCommandInteraction } from "discord.js";

/**
 * Format user for logging with discriminator validation
 * Handles Discord's transition away from discriminators
 */
export const formatUserForLogging = (
  interaction: ChatInputCommandInteraction,
): string => {
  const { username, discriminator } = interaction.user;

  // Discord is phasing out discriminators - show username only if invalid
  if (!discriminator || discriminator === "0") {
    return username;
  }

  return `${username}#${discriminator}`;
};

/**
 * Format user with ID for unique identification needs
 * Useful when multiple users share the same username
 */
export const formatUserWithId = (
  interaction: ChatInputCommandInteraction,
): string => {
  const { username, discriminator, id } = interaction.user;

  if (!discriminator || discriminator === "0") {
    return `${username} (${id})`;
  }

  return `${username}#${discriminator} (${id})`;
};
