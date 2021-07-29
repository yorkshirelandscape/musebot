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
const testing = true;
const once = false;

process.argv.forEach(function (val, index, array) {
    if( val === '-s' ) { skipstat = true;}
    if( val === '-t' ) { testing = true;}
    if( val === '-o' ) { once = true;}
  });

const GUILD_ID = (testing === true ? '212660788786102272' : '782213860337647636');  
const CHANNEL_ID =  (testing === true ? '864768873270345788' : '751893730117812225');  

const now = new Date();

//function to fetch more than the limit of 100 messages
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

//function to feath the reactions to the most recent message with the specified content
const getChecks = (channel, search) => {
    return new Promise(resolve => {
        const checkMsg = channel.messages.cache.find(m => m.content.includes(search));
        checkMsg.reactions.cache.first().users.fetch().then( p => {
            const checks = p.filter(u => !u.bot).map( (user) => ({user: user.username, id: user.id}));
            resolve(checks);
        });
    });
}

//function that pulls it all together
const checkRound = () => {

    const channel = client.channels.cache.get(CHANNEL_ID);

    //fetch the last 150 messages (this should cover even the longest rounds)
    fetch_many(channel,150).then( async messages => {
            
        //of those, find the most recent messages that begin and end a round
        const roundStart = await messages.find( msg => msg.content.includes('Begins————'));
        const roundEnd = await messages.find( msg => msg.content.includes('you have checked in and are done voting'));

        //if the most recent round is complete, fetch the reactions from the check-in and check-out messages
        if ( roundStart.createdTimestamp < roundEnd.createdTimestamp ) {
            const checkIns = await getChecks(channel, 'if you plan on voting');
            const checkOuts = await getChecks(channel, 'you have checked in and are done voting');

            //find the check-ins without check-outs and vice versa, then calculate the pct checked in
            const missing = checkIns.filter( x => !checkOuts.map(u => u.user).includes(x.user));
            const extra = checkOuts.filter( x => !checkIns.map(u => u.user).includes(x.user));
            const pctCheckedIn = (checkOuts.length - extra.length) / checkIns.length

            // console.log(missing);
            // console.log(extra);
            // console.log(pctCheckedIn);

            const roundEndTime = new Date(roundEnd.createdTimestamp * 1000)

            //if 80% are checked in and the round is half over OR the round has one hour left to go, issue the 1-hour warning
            if ( ( pctCheckedIn >= 0.8 && now > ( roundEndTime + 12*60*60*1000 ) ) || now > ( roundEndTime + 12*60*60*1000 ) ) {

                channel.send(
                    `${pctCheckedIn*100}% checked in.\nMissing: ${missing.toString()}\nExtra: ${extra.toString()}`
                )

                //wait an hour for the round to end, then tabulate the results
                await new Promise(r => setTimeout(r, 60*60*1000));

                channel.send('Round concluded. Tabulating votes.')

                //fetch 100 most recent messages (not necessary, but I wrote this out of order)
                channel.messages.fetch({limit: 100}).then( messages => {
                    //isolate the check-out messages and convert to an array
                    let msgDelims = messages.filter(msg => 
                        msg.content.includes('you have checked in and are done voting') && msg.deleted === false
                        );
                    msgDelims.array();
                    //filter all the messages for those between the two most recent delimiters
                    let rndMatches = messages.filter(msg =>
                        msg.createdTimestamp < msgDelims._array[0].createdTimestamp && 
                        msg.createdTimestamp > msgDelims._array[1].createdTimestamp &&
                        msg.deleted === false && msg.content.includes('Match')
                    );
                    //create an array of the reaction counts for each message
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
            } else { console.log('Awaiting 80%.')}
        } else { console.log('Round in progress.')}
    });
}

client.on('ready', () => {
    console.log('Ready!');
    
    //run every half hour at quarter after and quarter to
    let countdown = 1;//((60 - now.getSeconds()) + 60 * ( 30 - (getMinutes() + 15) % 30);
    console.log(`${now}: Triggering in ${countdown / 60} minutes`);
    setTimeout(() => {
        checkRound();
        setInterval(checkRound, 60 * 30 * 1000);
    }, countdown * 1000);
    
});


client.login(process.env.TOKEN);
  