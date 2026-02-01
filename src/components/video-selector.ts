
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  Interaction,
} from "discord.js";
import { VideoInfo } from "../services/youtube.js";
import { MESSAGES } from "../constants/messages.js";

export const createVideoSelectMenu = (videos: VideoInfo[]) => {
  const videoMap = new Map<string, string>();

  const videoSelect = new StringSelectMenuBuilder()
    .setCustomId(MESSAGES.COMPONENTS.VIDEO_SELECT)
    .setPlaceholder(MESSAGES.PLACEHOLDERS.SELECT_VIDEO)
    .addOptions(
      videos.map((video) => {
        
        let title = video.title || "Unknown";
        
        
        title = title.replace(/[\\'",.;:!@#$%^&*(){}[\]|<>?]/g, '').trim();
        
        
        if (!title) title = "Unknown";
        
        
        if (title.length > 50) {
          title = `${title.slice(0, 50)}...`;
        }
        
        
        const url = video.webpage_url || video.url || "";
        if (!url) {
          title = "Invalid URL";
        }

        videoMap.set(url, title);

        return new StringSelectMenuOptionBuilder()
          .setLabel(title)
          .setValue(url);
      }),
    );

  return {
    videoSelect,
    videoMap,
    row: new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(videoSelect),
  };
};

export const handleVideoSelection = async (
  interaction: ChatInputCommandInteraction,
  menuWithRow: {
    videoMap: Map<string, string>;
    row: ActionRowBuilder<StringSelectMenuBuilder>;
  },
): Promise<{
  url: string;
  selectedInteraction: StringSelectMenuInteraction;
} | null> => {
  const response = await interaction.followUp({
    content: MESSAGES.SUCCESS.SELECT_SONG,
    components: [menuWithRow.row],
    withResponse: true,
  });

  const collectorFilter = (i: Interaction) => i.user.id === interaction.user.id;

  try {
    const selectedInteraction = (await response.awaitMessageComponent({
      filter: collectorFilter,
      time: 30000,
    })) as StringSelectMenuInteraction;

    if (selectedInteraction.isStringSelectMenu()) {
      const url = selectedInteraction.values[0];
      const title = menuWithRow.videoMap.get(url);

      await selectedInteraction.update({
        content: MESSAGES.SUCCESS.SONG_SELECTED(title || "Unknown song"),
        components: [],
      });

      return { url, selectedInteraction };
    }
  } catch (error) {
    await interaction.editReply({
      content: MESSAGES.ERRORS.SONG_SELECTION_TIMEOUT,
      components: [],
    });
  }

  return null;
};
