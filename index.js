const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});

// const emojiRegex = require('emoji-regex/RGI_Emoji.js');

// const frog = client.emojis.cache.find(emoji => emoji.name === "frog");
// console.log(frog);

client.on('message', message => {
	// const re = emojiRegex();
	// let match;
	let emojis = [];
	let e1 = [];
	let e2 = [];
	// while ((match = re.exec(message.content)) != null) {
	// 	emojis.push(match[0]);
	//   }

	// let test = [];
	// test = client.emojis.cache.map((e, x) => (x + ' = ' + e) + ' | ' +e.name).join('\n');
	// console.log(test);

	e1 = message.content.match(/:.+?:/g);
	console.log(e1);
	if (e1) { 
		e1.forEach( e => {
			e2.add( {d: e.match(/[a-zA-Z0-9_]+/g).toString(), c: null} );
		})
	}
	console.log(e2);
	if (e2) {
		e2.forEach( e => {
			try {
				e.c = client.emojis.cache.find(emoji => emoji.name === e.d);
			} catch (err) {
				console.log(err);
			}
		})
	}
	console.log(e2);
	if (e2) {
		e2.forEach( e => {
			if (typeof e.c != 'undefined') {
				message.react(e.c);
			} else {
				message.react(e.d);
			}
		})
	}
});

client.login(process.env.TOKEN);