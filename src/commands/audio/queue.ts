import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { Command } from "../../types/command";

const queue: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Shows the current queue songs.")
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const guildId = chatInteraction.guildId;
    const queue = chatInteraction.client.queue.get(guildId!);

    if (!queue || queue.songs.length === 0) {
      await chatInteraction.reply("There is no queue.");
      return;
    }

    const list = queue.songs
      .map(({ title }, index) => `${index + 1}. **${title}**`)
      .join("\n");

    const textDisplay = new TextDisplayBuilder().setContent(
      `🎧 **Cola actual:**\n${list}`
    );
    await chatInteraction.reply({
      components: [textDisplay],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default queue;
