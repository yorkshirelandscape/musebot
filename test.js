const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const dismoji = require('discord-emoji');
const enm = require('emoji-name-map');
const EMOJI_ONE = enm.get('one');
const EMOJI_TWO = enm.get('two');

const SPREADSHEET_ID = '1qQBxqku14GTL70o7rpLEQXil1ghXEHff7Qolhu0XrMs';

const BOT_STATE_REF = 'Dashboard!B4';

const REFS = {
  'round': 'Dashboard!B2',
  'song': 'Dashboard!B3',
  'header': 'Dashboard!D1',
  'footer': 'Dashboard!D8',
  'match': 'Dashboard!D3:E6',
  'size': 'Dashboard!B5'
}

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

const sleep = async (interval) => {await new Promise(r => setTimeout(r, interval))};


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

            console.log(missing);
            console.log(extra);
            console.log(pctCheckedIn);

            // const roundEndTime = new Date(roundEnd.createdTimestamp * 1000)
			const roundEndTime = roundEnd.createdTimestamp

            //if 80% are checked in and the round is half over OR the round has one hour left to go, issue the 1-hour warning
            if ( ( pctCheckedIn >= 0.8 && now > ( roundEndTime + 12*60*60*1000 ) ) || now > ( roundEndTime + 12*60*60*1000 ) ) {

				if ( pctCheckedIn < 1) {
					channel.send(
						`${pctCheckedIn*100}% checked in.\nMissing: ${missing.toString()}\nExtra: ${extra.toString()}`
					)

					//wait an hour for the round to end, then tabulate the results
					sleep(60*60*1000);
				}
                
				channel.send('Round concluded. Tabulating votes.')

                //fetch 100 most recent messages (not necessary, but I wrote this out of order)
                channel.messages.fetch({limit: 100}).then( async messages => {
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

                    let round = await getValue(Object.values(REFS.round)).toString();
					console.log(round);
                    let rndVal = parseInt(round.slice(1));

                    let resultsRange = round + '!K2:L' + Math.pow(2,(7-rndVal))/2
					console.log(resultsRange);

                    let resultsArray = []
					
					rndMatchesResults.reverse().map( r => {
						r.map( v => {
							resultsArray.push(v.count);
						});
                    });

                    console.log(rndMatchesResults);
					console.log(resultsArray);
                })
            } else { 
				console.log('Awaiting 80%.');
				console.log(pctCheckedIn);
				console.log(roundEndTime);
			}
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


const loadCredentials = () => {
	// Load client secrets from a local file.
	try {
	  return content = JSON.parse(fs.readFileSync('credentials.json'))
	} catch (err) {
	  console.log('Error loading client secret file:', err);
	  throw err;
	}
  }
  

const getValue = async rng => getMsg(rng, await getAuthClient());


const getValues = async rng => getMsgs(rng, await getAuthClient());


const setValue = async (rng, val) => setMsg(rng, val, await getAuthClient());


const getAuthClient = async () => authorize(loadCredentials());


const authorize = async credentials => {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  try {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
  } catch (err) {
    console.log('Unable to load credentials from file, getting new token from user');
    await getNewToken(oAuth2Client);
  }
  return oAuth2Client;
}


const getNewToken = async oAuth2Client => {
  // TODO split this into a separate utility or separate flow?
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  // TODO util.promisify this https://nodejs.org/api/readline.html#readline_rl_question_query_options_callback
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
    });
  });
  // This should await readline.question and there's probably a similar thing to do with oAuth2Client.getToken
}


const getMsg = async (rng, auth) => {
  const sheets = google.sheets({version: 'v4', auth});
  try {
    var response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: rng,
    });
    return response.data.values[0][0];
  } catch (err) {
    console.log(`getMsg API returned an error for range "${rng}"`, err);
    throw err;
  }
}


const getMsgs = async (rng, auth) => {
  const sheets = google.sheets({version: 'v4', auth});
  try {
    var response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: rng,
    });
    return response.data.valueRanges;
  } catch (err) {
    console.log(`getMsgs API returned an error for range "${rng}"`, err);
    throw err;
  }
}


const setMsg = async (rng, val, auth) => {
  const sheets = google.sheets({version: 'v4', auth});
  try {
    var confirm = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: rng,
      valueInputOption: 'USER_ENTERED',
      resource: {
        majorDimension: 'ROWS',
        values: [[val]],
      },
    });
    return confirm.config.data.values[0];
  } catch (err) {
    console.log(`setMsg API returned an error for range "${rng}" and value "${val}"`, err);
    throw err;
  }
}

client.login(process.env.TOKEN);
