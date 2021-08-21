const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

const testing = false;

const CHANNEL_ID = (testing === true ? '876135378346733628' : '751893730117812225');
const SOURCE_CHANNELS = [
  { name: 'music', id: '246342398123311104' },
  { name: 'music-meta', id: '763068914480840715' },
  { name: 'skynet', id: '864768873270345788' },
];

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()
    || !SOURCE_CHANNELS.find(({ id }) => id === interaction.channel.id)) return;

  if (interaction.commandName === 'addurl') {
    const channel = client.channels.cache.get(CHANNEL_ID);
    const match = interaction.options.getInteger('match');
    const song = interaction.options.getInteger('song');
    const url = interaction.options.getString('url');

    const messages = await channel.messages.fetch({ limit: 100 });
    const targetMatch = await messages.find((msg) => parseInt(msg.content.slice(8, msg.content.indexOf(':'))) === match);

    if (typeof targetMatch === 'undefined') {
      await interaction.reply('Could not find match.');
    } else {
      const currentText = targetMatch.content;
      let newText = '';
      if (song === 1) {
        const urlPos1 = currentText.indexOf('\n');
        const urlPos = currentText.indexOf('\n', urlPos1 + 1);
        newText = [currentText.slice(0, urlPos), ` | <${url}>`, currentText.slice(urlPos)].join('');
      } else if (song === 2) {
        newText = `${currentText} | <${url}>`;
      }
      targetMatch.edit(newText);

      if (currentText === newText) {
        await interaction.reply('Replacement failed.');
      } else {
        await interaction.reply(`${interaction.user.username} added a link to song ${song} of match ${match}.`);
      }
    }
  }
});

client.login(process.env.TOKEN);
