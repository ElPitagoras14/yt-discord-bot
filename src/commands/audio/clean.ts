import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";

const clean: Command = {
  data: new SlashCommandBuilder()
    .setName("clean")
    .setDescription("Cleans the queue.")
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const guildId = chatInteraction.guildId;
    const queue = chatInteraction.client.queue.get(guildId!);

    if (!queue || queue.songs.length === 0) {
      await chatInteraction.reply("❌ There is no queue.");
      return;
    }

    queue.songs = [];
    await chatInteraction.reply("🧹 Queue cleaned.");
  },
};

export default clean;