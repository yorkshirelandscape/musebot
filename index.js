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
	let e1 = [];
	let e2 = [];
	// while ((match = re.exec(message.content)) != null) {
	// 	emojis.push(match[0]);
	//   }
	message.guild.emojis.cache.each((e) => console.log(e.id + ': ' + e.name));
	e1 = message.content.match(/:.+?:/g);
	console.log(e1);
	if (e1) { 
		e1.forEach( e => {
			e2.push(e.match(/[a-zA-Z0-9_]+/g).toString());
		})
	}
	console.log(e2);
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