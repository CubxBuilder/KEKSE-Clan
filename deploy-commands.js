import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import commands from './commands.js'; // Array mit deinen Commands

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Registering commands...');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.APP_ID,
        process.env.GUILD_ID // für Server-Specific Commands
      ),
      { body: commands }
    );

    console.log('Commands registered.');
  } catch (err) {
    console.error(err);
  }
})();
