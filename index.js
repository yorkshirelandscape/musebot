const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
	let emojis = message.content.match(/<:.+?:\d+>/g)
	if (typeof emojis != 'undefined') {
		// send back "Pong." to the channel the message was sent in
		emojis.forEach( e => {
			message.channel.send('+' + e);
		})
	}
});

client.login(process.env.TOKEN);