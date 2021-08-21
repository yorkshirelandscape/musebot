const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

const testing = false;

const CHANNEL_ID = (testing === true ? '876135378346733628' : '751893730117812225');
const SOURCE_CHANNELS = [
  { name: 'music', id: '246342398123311104' },
  { name: 'music-meta', id: '763068914480840715' },
  { name: 'skynet', id: '864768873270345788' },
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
  if (!interaction.isCommand()
  || !SOURCE_CHANNELS.find(({ id }) => id === interaction.channel.id)) return;

  if (interaction.commandName === 'replaceurl') {
    const channel = client.channels.cache.get(CHANNEL_ID);
    const match = interaction.options.getInteger('match');
    const song = interaction.options.getInteger('song');
    const url = interaction.options.getString('url');

    const messages = await channel.messages.fetch({ limit: 100 });
    const targetMatch = await messages.find((msg) => parseInt(msg.content.slice(8, msg.content.indexOf(':'))) === match);

    if (typeof targetMatch === 'undefined') {
      interaction.reply('Could not find match.');
    } else {
      const currentText = targetMatch.content;
      let newText = '';
      if (song === 1) {
        newText = await currentText.replace(/(https?|ftp):\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?/, url);
      } else if (song === 2) {
        newText = await replaceOccurrence(currentText, /(https?|ftp):\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?/g, 2, url);
      }
      await targetMatch.edit(newText);

      if (currentText === newText) {
        await interaction.reply('No matching URL.');
      } else {
        await interaction.reply(`${interaction.user.name} replaced the link for song ${song} of match ${match}.`);
      }
    }
  }
});

client.login(process.env.TOKEN);
