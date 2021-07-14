const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});

const dismoji = require('discord-emoji');
var result = [];

client.on('message', message => {

	console.log(message.channel);
	if (message.channel === 'skynet') {
	const enm = require("emoji-name-map");
	const one = enm.get('one');
	const two = enm.get('two');

	let e1 = [];
	let e2 = [];

	e1 = message.content.match(/:.+?:/g);
	// console.log(e1);
	if (e1) { 
		e1.forEach( e => {
			e2.push( {name: e.match(/[a-zA-Z0-9_]+/g).toString(), id: null, unicode: null} );
		})
	}
	// console.log(e2);
	if (e2) {
		e2.forEach( e => {
			try {
				e.id = client.emojis.cache.find(emoji => emoji.name === e.name);
			} catch (err) {
				console.log(err);
			};
			try {
				// e.unicode = enm.get(e.name);
				result = [];
				getNames(dismoji, e.name);
				e.unicode = result[0].toString();
			} catch (err) {
				console.log(err);
			}
		})
	}
	// console.log(e2);
	if (e2) {
		let i = 0;
		e2.forEach( e => {
			if (typeof e.id != 'undefined') {
				message.react(e.id);
			} else if (typeof e.unicode != 'undefined' ) {
				message.react(e.unicode);
			} else { message.react( i === 0 ? one : two ) };
			i++;
		})
	}
	}
});

function getNames(obj, name) {
	for (var key in obj) {
	  if (obj.hasOwnProperty(key)) {
		if ("object" == typeof(obj[key])) {
		  getNames(obj[key], name);
		} else if (key == name) {
		  result.push(obj[key]);
		}
	  }
	}
  }

client.login(process.env.TOKEN);