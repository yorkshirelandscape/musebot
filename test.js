const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();
// const guild = client.guilds.cache.get("YOUR_GUILD_ID");

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
    console.log(message.guild);
});

client.login(process.env.TOKEN);