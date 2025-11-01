import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";

const kick: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Select a member and kick them.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to kick")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const target = chatInteraction.options.getUser("user", true);

    await chatInteraction.reply(`Kicking ${target.username}`);
    await chatInteraction.guild?.members.kick(target);
  },
};

export default kick;
