const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

const dismoji = require('discord-emoji');
const enm = require('emoji-name-map');
const { values } = require('underscore');
const EMOJI_ONE = enm.get('one');
const EMOJI_TWO = enm.get('two');

const skipstat = false;
const testing = false;
const once = false;

process.argv.forEach(function (val, index, array) {
    if( val === '-s' ) { skipstat = true;}
    if( val === '-t' ) { testing = true;}
    if( val === '-o' ) { once = true;}
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


const getChecks = (channel, search) => {
    return new Promise(resolve => {
        const checkMsg = channel.messages.cache.find(m => m.content.includes(search));
        checkMsg.reactions.cache.first().users.fetch().then( p => {
            const checks = p.filter(u => !u.bot).map( (user) => ({user: user.username, id: user.id}));
            resolve(checks);
        });
    });
}


client.on('ready', () => {
    console.log('Ready!');

    const channel = client.channels.cache.get(CHANNEL_ID);

    
    fetch_many(channel,150).then( async messages => {
        
        const checkIns = await getChecks(channel, 'if you plan on voting');
        const checkOuts = await getChecks(channel, 'you have checked in and are done voting');

        const missing = checkIns.filter( x => !checkOuts.map(u => u.user).includes(x.user));
        const extra = checkOuts.filter( x => !checkIns.map(u => u.user).includes(x.user));
        
        const pctCheckedIn = (checkOuts.length - extra.length) / checkIns.length

        console.log(missing);
        console.log(extra);
        console.log(pctCheckedIn);

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
        let rndMatchesResults = [];
        rndMatches.map( rm => {
            let matchNo = parseInt(rm.content.slice(8,rm.content.indexOf(':')));

            let matchReacts = new Set();
            for (const [key, value] of rm.reactions.cache) {
                matchReacts.add({emoji: key, count: value.count});
            }
            rndMatchesResults.push({[matchNo]: matchReacts})
        });
        console.log(rndMatchesResults);
    })
});


client.login(process.env.TOKEN);
  