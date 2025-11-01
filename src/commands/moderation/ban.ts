import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";

const ban: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Select a member and ban them.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to ban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("The reason for banning")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const target = chatInteraction.options.getUser("user", true);
    const reason =
      chatInteraction.options.getString("reason") ?? "No reason provided";

    const confirm = new ButtonBuilder()
      .setCustomId("confirm-ban")
      .setLabel("Confirm Ban")
      .setStyle(ButtonStyle.Danger);

    const cancel = new ButtonBuilder()
      .setCustomId("cancel-ban")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      cancel,
      confirm
    );

    const response = await chatInteraction.reply({
      content: `Are you sure you want to ban ${target.username} for reason: ${reason}?`,
      components: [row],
      withResponse: true,
    });

    const collectorFilter = (i: any) => i.user.id === chatInteraction.user.id;

    try {
      const confirmation =
        await response.resource?.message?.awaitMessageComponent({
          filter: collectorFilter,
          time: 60000,
        });

      if (confirmation?.customId === "confirm-ban") {
        await chatInteraction.guild?.members.ban(target);
        await chatInteraction.editReply({
          content: `Banned ${target.username} for reason: ${reason}`,
          components: [],
        });
      } else {
        await chatInteraction.editReply({
          content: "Ban cancelled",
          components: [],
        });
      }
    } catch {
      await chatInteraction.editReply({
        content: "Confirmation not received within 1 minute, cancelling",
        components: [],
      });
    }
  },
};

export default ban;
