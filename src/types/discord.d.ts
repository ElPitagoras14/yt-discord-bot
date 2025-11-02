import { Collection } from "discord.js";
import { Command } from "./command";
import { Queue } from "./queue";

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
    cooldowns: Collection<string, Collection<string, number>>;
    queue: Collection<string, Queue>;
  }
}
