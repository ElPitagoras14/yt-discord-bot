import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { Command } from "../../types/command";
import { validateQueueExists } from "../../utils/audio-validation.js";
import { AUDIO_MESSAGES } from "../../constants/audio-messages.js";
import logger from "../../logger.js";

const queue: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Shows current queue songs.")
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;
    const user = `${chatInteraction.user.username}#${chatInteraction.user.discriminator}`;

    const { queue, success } = await validateQueueExists(chatInteraction);
    if (!success) return;

    const list = queue!.songs
      .map(({ title }, index) =>
        index === 0
          ? AUDIO_MESSAGES.QUEUE.CURRENT_SONG(title)
          : AUDIO_MESSAGES.QUEUE.SONG_ITEM(index, title),
      )
      .join("\n");

    const textDisplay = new TextDisplayBuilder().setContent(
      `${AUDIO_MESSAGES.QUEUE.TITLE}\n${list}`,
    );

    logger.info(`[${user}] Viewed queue (${queue!.songs.length} songs)`);
    await chatInteraction.reply({
      components: [textDisplay],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default queue;
