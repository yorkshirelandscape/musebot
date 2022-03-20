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
client.on('messageCreate', async (message) => {
  if (!client.application?.owner) await client.application?.fetch();

  if (message.content.toLowerCase() === '!deploy' && message.author.id === client.application?.owner.id) {
    const data = {
      name: 'tzstamp',
      description: 'Replaces a message\'s datetimes in yyyy/MM/dd HH:mm format with Discord dynamic time zone format.',
      options: [{
        name: 'msg',
        type: 'STRING',
        description: 'The message containing the datetime.',
        required: true,
      },
      {
        name: 'offset',
        type: 'STRING',
        description: 'The offset from UTC in the format "UTC[+/-]X". Defaults to UTC.',
        required: false,
      },
      {
        name: 'raw',
        type: 'BOOLEAN',
        description: 'Return the timestamp code in a codeblock.',
        required: false,
      }],
    };

    // const command = await client.application?.commands.create(data);
    // eslint-disable-next-line max-len
    // const command = await client.application?.commands.cache.get('878715599310688287').edit(data);
    // const commands = await client.application?.commands.set(data); // Update
    // const command = await client.guilds.cache.get('782213860337647636')?.commands.create(data);
    // const command = await client.guilds.cache.get('782213860337647636')?.commands.fetch();

    const command = await client.application.commands.edit('893463924790415380', data);

    console.log(command);
  }
});

client.login(process.env.TOKEN);
