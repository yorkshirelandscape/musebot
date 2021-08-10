const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

let skipstat = false;
let testing = false;
let once = false;

process.argv.forEach(function (val, index, array) {
    if( val === '-s' ) { skipstat = true;}
    if( val === '-t' ) { testing = true;}
    if( val === '-o' ) {once = true;}
  });

const GUILD_ID = (testing === true ? '212660788786102272' : '782213860337647636');  
const CHANNEL_ID =  (testing === true ? '864768873270345788' : '751893730117812225');  


client.on('ready', () => {
    console.log('Ready!');

    const channel = client.channels.cache.get(CHANNEL_ID);
    
    channel.messages.fetch({around: '870005583401603112', limit: 1})
    .then(msg => {
        const fetchedMsg = msg.first();
        fetchedMsg.edit('React with 🎵 if you plan on voting in the 1983 bracket.\n————Round of 128 Begins————\n2018R0Q1');
    });
    
    // client.destroy()
});

client.login(process.env.TOKEN);