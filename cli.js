import inquirer from 'inquirer';
import chalk from 'chalk';
import commands from './commands.js';
import fetch from 'node-fetch';
import 'dotenv/config';

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_ID = process.env.APP_ID;
const GUILD_ID = process.env.GUILD_ID;

async function run() {
  console.log(chalk.blue.bold('\n🚀 Discord Command CLI Simulator\n'));

  const { commandName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'commandName',
      message: 'Welchen Command möchtest du ausführen?',
      choices: commands.map(c => c.name)
    }
  ]);

  const command = commands.find(c => c.name === commandName);
  const options = {};

  if (command.options && command.options.length > 0) {
    console.log(chalk.gray(`\nOptionen für /${commandName}:`));
    for (const opt of command.options) {
      const { value } = await inquirer.prompt([
        {
          type: 'input',
          name: 'value',
          message: `${opt.name}${opt.required ? chalk.red('*') : ''} (${opt.description}):`,
          validate: (input) => {
            if (opt.required && !input) return 'Dieses Feld ist erforderlich!';
            return true;
          }
        }
      ]);
      if (value) options[opt.name] = value;
    }
  }

  const payload = {
    type: 2, // APPLICATION_COMMAND
    data: {
      name: commandName,
      options: Object.entries(options).map(([name, value]) => ({ name, value }))
    },
    guild_id: GUILD_ID,
    channel_id: '1423413348220796998', // Default channel
    member: {
      user: {
        id: '1151971830983311441', // Simulation as Owner
        username: 'CLI_Simulator'
      },
      roles: ['1424020019070898186'], // Mod Role
      permissions: '8' // Administrator
    }
  };

  console.log(chalk.yellow('\n⏳ Sende Simulation an Bot...'));

  try {
    const response = await fetch(`http://localhost:5000/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: Signature verification is bypassed locally or needs to be handled
        // For simplicity in this env, we might need a bypass header or just use the logic directly
        'X-Signature-Ed25519': 'simulated',
        'X-Signature-Timestamp': Date.now().toString()
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(chalk.green('✅ Simulation erfolgreich gesendet!'));
      console.log(chalk.gray('Schau in die Bot-Logs für das Ergebnis.'));
    } else {
      console.log(chalk.red(`❌ Fehler: ${response.status} ${response.statusText}`));
      const text = await response.text();
      console.log(chalk.red(text));
    }
  } catch (err) {
    console.log(chalk.red(`❌ Verbindung zum Bot fehlgeschlagen: ${err.message}`));
  }
}

run();
