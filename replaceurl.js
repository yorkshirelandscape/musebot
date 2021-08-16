const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

const testing = true;

const CHANNEL_ID = (testing === true ? '876135378346733628' : '751893730117812225');

function replaceOccurrence(string, regex, n, replace) {
  let i = 0;
  return string.replace(regex, (match) => {
    i += 1;
    if (i === n) return replace;
    return match;
  });
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'addurl') {
    const channel = client.channels.cache.get(CHANNEL_ID);
    const match = interaction.options.getInteger('match');
    const song = interaction.options.getInteger('song');
    const url = interaction.options.getString('url');

    channel.messages.fetch({ limit: 100 })
      .then(async (messages) => {
        const targetMatch = messages.find((msg) => parseInt(msg.content.slice(8, msg.content.indexOf(':'))) === match);

        if (typeof targetMatch === 'undefined') {
          return;
        }

        const currentText = targetMatch.content;
        let newText = '';
        if (song === 1) {
          newText = currentText.Replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/, url);
        } else if (song === 2) {
          newText = replaceOccurrence(currentText, /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/, 2, url);
        }
        targetMatch.edit(newText);
      });

    if (typeof currentText === 'undefined') {
      await interaction.reply('Could not find match.');
    } else {
      await interaction.reply('URL replaced.');
    }
  }
});

client.login(process.env.TOKEN);
