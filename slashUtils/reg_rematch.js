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
      name: 'rematch',
      description: 'Reposts a specified match number.',
      options: [{
        name: 'match',
        type: 'INTEGER',
        description: 'The match to post.',
        required: true,
      }],
    };

    await client.application?.commands.fetch();
    // console.log(client.application?.commands.cache);

    // const command = await client.application?.commands.create(data);
    // eslint-disable-next-line max-len
    const command = await client.application?.commands.cache.get('932257751323795487').edit(data);
    // const commands = await client.application?.commands.set(data); // Update
    // const command = await client.guilds.cache.get('782213860337647636')?.commands.create(data);
    // const command = await client.guilds.cache.get('782213860337647636')?.commands.fetch();

    console.log(command);
  }
});

client.login(process.env.TOKEN);
