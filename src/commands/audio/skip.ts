import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";

const skip: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips the current song.")
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const guildId = chatInteraction.guildId;
    const queue = chatInteraction.client.queue.get(guildId!);

    if (!queue || queue.songs.length === 0) {
      await chatInteraction.reply("❌ There is no queue.");
      return;
    }

    queue.player.stop();
    await chatInteraction.reply("⏭️ Skipped the current song.");
  },
};

export default skip;
