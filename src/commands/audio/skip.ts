import {
  ChatInputCommandInteraction,
  Interaction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/command";
import {
  validateQueueExists,
  validateQueueNotEmpty,
} from "../../utils/audio-validation.js";
import { playNext } from "../../services/audio-playback.js";
import { AUDIO_MESSAGES } from "../../constants/audio-messages.js";

const skip: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips current song.")
    .setContexts(InteractionContextType.Guild),
  execute: async (interaction: Interaction) => {
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const { queue, success } = await validateQueueExists(chatInteraction);
    if (!success) return;

    if (!(await validateQueueNotEmpty(chatInteraction, queue!))) return;

    // Skip current song by stopping player (triggers next song logic)
    queue!.player.stop();
    await chatInteraction.reply(AUDIO_MESSAGES.SUCCESS.SONG_SKIPPED);
  },
};

export default skip;
