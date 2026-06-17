import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { Command } from "../../types/command.js";
import { AUDIO_MESSAGES } from "../../constants/audio-messages.js";
import { musicManager } from "../../music/MusicManager.js";
import logger from "../../logger.js";
import { formatUserForLogging } from "../../utils/user-format.js";

const queue: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Shows current queue songs.")
    .setContexts(InteractionContextType.Guild),

  execute: async (interaction: Interaction) => {
    const i = interaction as ChatInputCommandInteraction;
    const user = formatUserForLogging(i);
    const guildId = i.guildId!;

    const q = musicManager.getQueue(guildId);
    if (!q || q.songs.length === 0) {
      await i.reply(AUDIO_MESSAGES.ERRORS.NO_QUEUE);
      return;
    }

    const list = q.songs
      .map(({ title }, index) =>
        index === 0
          ? AUDIO_MESSAGES.QUEUE.CURRENT_SONG(title)
          : AUDIO_MESSAGES.QUEUE.SONG_ITEM(index, title),
      )
      .join("\n");

    const textDisplay = new TextDisplayBuilder().setContent(
      `${AUDIO_MESSAGES.QUEUE.TITLE}\n${list}`,
    );

    logger.info(`[${guildId}] [${user}] Viewed queue (${q.songs.length} songs)`);
    await i.reply({
      components: [textDisplay],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default queue;
