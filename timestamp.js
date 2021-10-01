/* eslint-disable consistent-return */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

const { DateTime } = require('luxon');

client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'tzstamp') {
    const msg = interaction.options.getString('msg');
    const replacer = (match) => `<t:${DateTime.fromFormat(match, 'yyyy/MM/dd HH:mm').valueOf() / 1000}:F>`;
    const newMsg = msg.replaceAll(/((\d{4})\/(\d{2})\/(\d{2}) (\d{2}):?(\d{2}))/g, replacer);
    if (newMsg === msg) {
      await interaction.reply('Could not find a suitable timestamp. Use yyyy/MM/dd HH:mm.');
    } else {
      await interaction.reply(newMsg);
    }
  }
});

client.login(process.env.TOKEN);
