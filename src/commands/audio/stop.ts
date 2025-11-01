import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";
import { getVoiceConnection } from "@discordjs/voice";

const stop: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops the current song.")
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const guildId = chatInteraction.guildId;
    const queue = chatInteraction.client.queue.get(guildId!);

    if (!queue) {
      await chatInteraction.reply("❌ There is no queue.");
      return;
    }

    const connection = getVoiceConnection(guildId!);
    connection?.destroy();

    queue.player.stop();
    interaction.client.queue.delete(guildId!);

    await chatInteraction.reply("🛑 Player stopped and queue cleared.");
  },
};

export default stop;
