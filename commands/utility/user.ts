import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";

const user: Command = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Provides information about the user."),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const member = interaction.member as GuildMember;

    await interaction.reply(
      `This command was run by ${interaction.user.username}, who joined on ${member.joinedAt}.`
    );
  },
};

export default user;
