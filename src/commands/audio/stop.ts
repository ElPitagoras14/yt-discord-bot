import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { Command } from "../../types/command";
import { validateQueueExists } from "../../utils/audio-validation.js";
import { clearIdleTimeout } from "../../services/idle-timeout.js";
import { cleanConnection } from "../../services/connection.js";
import { AUDIO_MESSAGES } from "../../constants/audio-messages.js";
import logger from "../../logger.js";

const stop: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops player and clears queue.")
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;
    const user = `${chatInteraction.user.username}#${chatInteraction.user.discriminator}`;

    const { queue, success } = await validateQueueExists(chatInteraction);
    if (!success) return;

    clearIdleTimeout(queue!);

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

    logger.info(`[${user}] Stopped player and cleared queue`);
    await chatInteraction.reply(AUDIO_MESSAGES.SUCCESS.PLAYER_STOPPED);
  },
};

export default stop;
