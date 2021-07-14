const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});

const emojiRegex = require('emoji-regex/text.js');

client.on('message', message => {
	const re = emojiRegex();
	let match;
	let emojis = [];
	while ((match = re.exec(message.content)) != null) {
		emojis.push(match[0]);
	  }
	console.log(message.content);
	if (emojis) {
		emojis.forEach( e => {
			message.react(e);
		})
	}
});

client.login(process.env.TOKEN);