import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandBuilder,
  Interaction,
  AutocompleteInteraction,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

type CommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  data: CommandData;
  cooldown?: number;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  execute: (interaction: Interaction) => Promise<void>;
}
