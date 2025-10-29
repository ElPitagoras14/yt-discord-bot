import {
  ChatInputCommandInteraction,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";

const echo: Command = {
  data: new SlashCommandBuilder()
    .setName("echo")
    .setDescription("Replies with your input.")
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription("The input to echo back")
        .setRequired(true)
    ),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const input = chatInteraction.options.getString("input", true);

    await chatInteraction.reply(input);
  },
};

export default echo;
