import { Collection } from "discord.js";
import { Command } from "./command";
import { AudioPlayer } from "@discordjs/voice";

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
    cooldowns: Collection<string, Collection<string, number>>;
    queue: Collection<
      string,
      {
        songs: {
          title: string;
          url: string;
        }[];
        player: AudioPlayer;
        playing: boolean;
      }
    >;
  }
}
