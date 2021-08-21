const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

const testing = false;

const CHANNEL_ID = (testing === true ? '876135378346733628' : '751893730117812225');

const ADMINS = [
  { name: 'DonaldX', id: '268846196888567810' },
  { name: 'volfied', id: '426730219790008320' },
  { name: 'Bluey', id: '596373234262474764' },
  { name: 'alatar224', id: '807760790244294709' },
];

function replaceOccurrence(string, regex, n, replace) {
  let i = 0;
  return string.replace(regex, (match) => {
    i += 1;
    if (i === n) return replace;
    return match;
  });
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || !ADMINS.find(({ id }) => id === interaction.user.id)) return;

  if (interaction.commandName === 'replacepart') {
    const channel = client.channels.cache.get(CHANNEL_ID);
    const match = interaction.options.getInteger('match');
    const song = interaction.options.getInteger('song');
    const part = interaction.options.getString('part');
    const replacement = interaction.options.getString('replacement');

    const messages = await channel.messages.fetch({ limit: 100 });
    const targetMatch = await messages.find((msg) => parseInt(msg.content.slice(8, msg.content.indexOf(':'))) === match);

    if (typeof targetMatch === 'undefined') {
      interaction.reply('Could not find match.');
    } else {
      const currentText = targetMatch.content;
      let newText = '';
      if (part === 'all') {
        if (song === 1) {
          newText = replaceOccurrence(currentText, /[^\n]+/g, 2, replacement);
        } else if (song === 2) {
          newText = replaceOccurrence(currentText, /[^\n]+/g, 4, replacement);
        }
      } else if (part === 'url') {
        if (song === 1) {
          newText = currentText.replace(/<*(https?|ftp):\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?>*[^\n]*/, replacement);
        } else if (song === 2) {
          newText = replaceOccurrence(currentText, /<*(https?|ftp):\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?>*[^\n]*/g, 2, replacement);
        }
      }
      await targetMatch.edit(newText);

      if (currentText === newText) {
        await interaction.reply('No match.');
      } else {
        await interaction.reply(`${interaction.user.name} replaced ${part === 'url' ? 'the ' : ''} ${part} of song ${song} of match ${match}.`);
      }
    }
  }
});

client.login(process.env.TOKEN);
