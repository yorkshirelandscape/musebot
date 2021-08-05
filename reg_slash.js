const dotenv = require('dotenv');
dotenv.config();

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

client.once('ready', () => {
    console.log('Ready!');
  });

//Update global slash commands
// client.on('messageCreate', async message => {
// 	if (!client.application?.owner) await client.application?.fetch();

// 	if (message.content.toLowerCase() === '!deploy' && message.author.id === client.application?.owner.id) {
// 		const data = {
//             name: 'addurl',
//             description: 'Adds a URL to a specified match.',
//             options: [{
//                 name: 'match',
//                 type: 'INTEGER',
//                 description: 'The match to add to',
//                 required: true,
//             },
//             {
//                 name: 'song',
//                 type: 'INTEGER',
//                 description: 'The number of the song to update',
//                 required: true,
//                 choices: [
//                     {
//                         name: 'Song 1',
//                         value: 1,
//                     },
//                     {
//                         name: 'Song 2',
//                         value: 2,
//                     }
//                 ],
//             },
//             {
//                 name: 'url',
//                 type: 'STRING',
//                 description: 'The URL to add',
//                 required: true
//             }],
//         };

// 		const commands = await client.application?.commands.set(data);
// 		console.log(commands);
// 	}
// });

//Create global slash command
// client.on('messageCreate', async message => {
// 	if (!client.application?.owner) await client.application?.fetch();

// 	if (message.content.toLowerCase() === '!deploy' && message.author.id === client.application?.owner.id) {
    // const data = {
    //     name: 'addurl',
    //     description: 'Adds a URL to a specified match.',
    //     options: [{
    //         name: 'match',
    //         type: 'INTEGER',
    //         description: 'The match to add to',
    //         required: true,
    //     },
    //     {
    //         name: 'song',
    //         type: 'INTEGER',
    //         description: 'The number of the song to update',
    //         required: true,
    //         choices: [
    //             {
    //                 name: 'Song 1',
    //                 value: 1,
    //             },
    //             {
    //                 name: 'Song 2',
    //                 value: 2,
    //             }
    //         ],
    //     },
    //     {
    //         name: 'url',
    //         type: 'STRING',
    //         description: 'The URL to add',
    //         required: true
    //     }],
    // };

// 		const command = await client.application?.commands.create(data);
// 		console.log(command);
// 	}
// });


//Create guild slash command
client.on('messageCreate', async message => {
	if (!client.application?.owner) await client.application?.fetch();

	if (message.content.toLowerCase() === '!deploy' && message.author.id === client.application?.owner.id) {
        console.log(message.content);
        const data = {
            name: 'addurl',
            description: 'Adds a URL to a specified match.',
            options: [{
                name: 'match',
                type: 'INTEGER',
                description: 'The match to add to',
                required: true,
            },
            {
                name: 'song',
                type: 'INTEGER',
                description: 'The number of the song to update',
                required: true,
                choices: [
                    {
                        name: 'Song 1',
                        value: 1,
                    },
                    {
                        name: 'Song 2',
                        value: 2,
                    }
                ],
            },
            {
                name: 'url',
                type: 'STRING',
                description: 'The URL to add',
                required: true
            }],
        };

		const command = await client.guilds.cache.get('782213860337647636')?.commands.create(data);
		console.log(command);
	}
});


client.login(process.env.TOKEN);