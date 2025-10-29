import {
  ChatInputCommandInteraction,
  Guild,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";

const server: Command = {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Provides information about the server."),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const guild = chatInteraction.guild as Guild;

    await chatInteraction.reply(
      `This command was run in ${guild.name}, which has ${guild.memberCount} members.`
    );
  },
};

export default server;
