const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
	let emojis = message.content.match(/<:.+:(\d+)>/gm);
	console.log(emojis);
	if (emojis) {
		emojis.forEach( e => {
			message.channel.send('+' + e);
		})
	}
});

client.login(process.env.TOKEN);