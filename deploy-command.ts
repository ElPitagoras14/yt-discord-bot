import dotenv from "dotenv";
import { REST, Routes } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { Command } from "./types/command";

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const APP_ID = process.env.APP_ID;
const ENV = process.env.NODE_ENV || "dev";

if (!TOKEN) throw new Error("Missing DISCORD_TOKEN environment variable");
if (!APP_ID) throw new Error("Missing APP_ID environment variable");
const commands = [];

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  if (folder === "unused") continue;

  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = require(filePath);
    const command: Command = commandModule.default || commandModule;

    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

const rest = new REST().setToken(TOKEN);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} apllication (/) commands`
    );

    const data = await rest.put(Routes.applicationCommands(APP_ID), {
      body: commands,
    });

    console.log(
      `Successfully reloaded ${(data as any[]).length} application (/) commands`
    );
  } catch (error) {
    console.error(error);
  }
})();
