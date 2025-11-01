import {
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";

const user: Command = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Provides information about the user."),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction; 

    const member = chatInteraction.member as GuildMember;

    await chatInteraction.reply(
      `This command was run by ${interaction.user.username}, who joined on ${member.joinedAt}.`
    );
  },
};

export default user;
