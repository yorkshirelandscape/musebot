/* eslint-disable no-console */
const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

// Create/update global/guild slash command
client.on('ready', async () => {
  await client.application.commands.fetch();

  const commands = client.application.commands.cache;

  console.log(commands);
});

client.login(process.env.TOKEN);
