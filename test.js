const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

const dismoji = require('discord-emoji');
const enm = require('emoji-name-map');
const EMOJI_ONE = enm.get('one');
const EMOJI_TWO = enm.get('two');

const skipstat = false;
const testing = false;
const once = false;

process.argv.forEach(function (val, index, array) {
    if( val === '-s' ) { skipstat = true;}
    if( val === '-t' ) { testing = true;}
    if( val === '-o' ) {once = true;}
  });

const GUILD_ID = (testing === true ? '212660788786102272' : '782213860337647636');  
const CHANNEL_ID =  (testing === true ? '864768873270345788' : '751893730117812225');  


async function fetch_many(channel, limit = 150) {
    let sum_messages = await channel.messages.fetch({limit: 100});
    let last_id = sum_messages.last().id;
    let lim = Math.max(0, limit - 100);
    while (true) {
        let options = { limit: lim };
        if (last_id) {
            options.before = last_id;
        }

        const msgs = await channel.messages.fetch(options);
        lim = Math.max(0, lim - lim);
        sum_messages = sum_messages.concat(msgs);
        last_id = msgs.last().id;
        
        if (lim === 0 || msgs.size != 100 || sum_messages.length >= limit) {
            break;
        }
    }

    return sum_messages;
}


client.on('ready', () => {
    console.log('Ready!');

    const channel = client.channels.cache.get(CHANNEL_ID);


    fetch_many(channel,150).then( messages => {
        const checkInMsg = channel.messages.cache.find(m => m.content.includes('if you plan on voting'));
        let checkIns = checkInMsg.reactions.cache.each(async (reaction) => await reaction.users.fetch());
        let checkInUsers = checkIns.first().users.cache;//.map( (user) => user.username);

        const checkOutMsg = channel.messages.cache.find(m => m.content.includes('you have checked in and are done voting'))
        let checkOuts = checkOutMsg.reactions.cache.each(async (reaction) => await reaction.users.fetch())
        let checkOutUsers = checkOuts.first().users.cache;//.map( (user) => user.username);

        console.log(checkInUsers);
        console.log(checkOutUsers);
    });
    

    channel.messages.fetch({limit: 100}).then( messages => {
        let msgDelims = messages.filter(msg => 
            msg.content.includes('you have checked in and are done voting') && msg.deleted === false
            );
        msgDelims.array();
        let rndMatches = messages.filter(msg =>
            msg.createdTimestamp < msgDelims._array[0].createdTimestamp && 
            msg.createdTimestamp > msgDelims._array[1].createdTimestamp &&
            msg.deleted === false && msg.content.includes('Match')
        );
        console.log(rndMatches);
        let rndMatchesReactions = new Map();
        for (const msg of rndMatches.values()) {
            let matchReacts = msg.reactions.cache;
            let matchNo = parseInt(msg.content.slice(8,msg.content.indexOf(':')));
            for (const [key, value] of matchReacts) {
                rndMatchesReactions.set(matchNo, {emoji: key, count: value.count});
            }
        }
        console.log(rndMatchesReactions);
    })
});


client.login(process.env.TOKEN);
  