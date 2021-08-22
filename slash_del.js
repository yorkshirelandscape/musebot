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
  // await bot.api.applications('864639823537242112').commands('878715599310688287').delete();
  // await client.application?.commands('878715599310688287').delete();
  const commands = await client.application?.commands.fetch();
  const command = await client.application?.commands.cache.get('878715599310688287');
  // const commands = bot.api.applications(bot.user.id).commands.
  console.log(commands);
  console.log(command);
});

client.login(process.env.TOKEN);
