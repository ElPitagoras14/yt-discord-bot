import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { Command } from "../../types/command";
import { validateQueueExists } from "../../utils/audio-validation.js";
import { cleanConnection } from "../../services/connection.js";
import { AUDIO_MESSAGES } from "../../constants/audio-messages.js";

const stop: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops player and clears queue.")
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const { queue, success } = await validateQueueExists(chatInteraction);
    if (!success) return;

    const connection = getVoiceConnection(chatInteraction.guildId!);

    if (connection) {
      cleanConnection(
        chatInteraction,
        { guild: chatInteraction.guild!, id: chatInteraction.guildId! } as any,
        connection,
        queue!.player,
        queue!,
      );
    }

    await chatInteraction.reply(AUDIO_MESSAGES.SUCCESS.PLAYER_STOPPED);
  },
};

export default stop;
