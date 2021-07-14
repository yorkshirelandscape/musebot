const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});

// const emojiRegex = require('emoji-regex/RGI_Emoji.js');

client.on('message', message => {
	// const re = emojiRegex();
	// let match;
	let emojis = [];
	// while ((match = re.exec(message.content)) != null) {
	// 	emojis.push(match[0]);
	//   }
	e1 = message.content.match(/:.+?:/g);
	e2 = e1.match(/[a-zA-Z0-9]+/g)
	if (e2) {
		e2.forEach( e => {
			emojis.push(client.emojis.cache.find(emoji => emoji.name === e));
		})
	}
	console.log(emojis);
	if (emojis) {
		emojis.forEach( e => {
			message.react(e);
		})
	}
});

client.login(process.env.TOKEN);