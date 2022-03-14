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

client.on('ready', async () => {
  console.log('Ready!');
  const commandsGuild = await client.guilds.cache.get('782213860337647636').commands.fetch();
  const commandsClient = await client.application.commands.fetch();
  console.log(commandsGuild);
  console.log(commandsClient);
  // await client.guilds.cache.get('782213860337647636').commands.cache.get('872965086128537620').delete();
  // await client.application.commands.cache.get('929942856284655646').delete();
  console.log('complete');
});

client.login(process.env.TOKEN);
