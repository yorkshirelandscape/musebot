const dotenv = require('dotenv');
dotenv.config();

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

let skipstat = false;
let testing = false;
let once = false;

process.argv.forEach(function (val, index, array) {
    if( val === '-s' ) { skipstat = true;}
    if( val === '-t' ) { testing = true;}
    if( val === '-o' ) {once = true;}
  });

const GUILD_ID = (testing === true ? '782213860337647636' : '212660788786102272');  
const CHANNEL_ID =  (testing === true ? '864768873270345788' : '751893730117812225');  


client.on('ready', () => {
    console.log('Ready!');
    
    // client.destroy()
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === 'addurl') {
        const channel = client.channels.cache.get(CHANNEL_ID);
        const match = interaction.options.getInteger('match');
        const song = interaction.options.getInteger('song');
        const url = interaction.options.getString('url');

        channel.messages.fetch({limit: 100})
        .then( async messages => {
            const targetMatch = messages.find( msg =>
                parseInt(msg.content.slice(8,msg.content.indexOf(':'))) === match
            );

            if ( typeof targetMatch === 'undefined') { 
                return; 
            }

            const currentText = targetMatch.content;
            let newText = '';
            if (song === 1){
                let urlPos1 = currentText.indexOf('\n');
                let urlPos = currentText.indexOf('\n', urlPos1 + 1) - 1;
                newText = [currentText.slice(0,urlPos), ' | ' + url, currentText.slice(urlPos)].join('');
            } else if (song === 2) {
                newText = currentText + ' | ' + url;
            }
            targetMatch.edit(newText);
        });
        
        if ( typeof currentText === 'undefined') {
            await interaction.reply('Could not find match.');
        } else {
		    await interaction.reply('Match updated.');
        }
	}
});

client.login(process.env.TOKEN);