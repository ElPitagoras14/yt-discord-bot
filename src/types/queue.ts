import { AudioPlayer } from "@discordjs/voice";

export interface Queue {
  songs: {
    title: string;
    url: string;
  }[];
  player: AudioPlayer;
  playing: boolean;
  destroying: boolean;
}
