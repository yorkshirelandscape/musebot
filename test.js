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


const GUILD_ID = (testing === true ? '212660788786102272' : '782213860337647636');  
const CHANNEL_ID =  (testing === true ? '864768873270345788' : '751893730117812225');  


client.on('ready', () => {
    console.log('Ready!');

    const channel = client.channels.cache.get(CHANNEL_ID);

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
        let rndMatchesReactions = rndMatches.map( (msg) => {
            let matchReacts = msg.reactions.cache;
            let mR = {match: parseInt(msg.content.slice(8,msg.content.indexOf(':'))), reactions: {emoji: matchReacts.key, count: matchReacts.count}};
            return mR;
        });
        console.log(rndMatchesReactions);
    })


});


// const loadCredentials = () => {
// // Load client secrets from a local file.
// try {
//     return content = JSON.parse(fs.readFileSync('credentials.json'))
// } catch (err) {
//     console.log('Error loading client secret file:', err);
//     throw err;
// }
// }


// const getValue = async rng => getMsg(rng, await getAuthClient());


// const getValues = async rng => getMsgs(rng, await getAuthClient());


// const setValue = async (rng, val) => setMsg(rng, val, await getAuthClient());


// const getAuthClient = async () => authorize(loadCredentials());


// const authorize = async credentials => {
// const {client_secret, client_id, redirect_uris} = credentials.installed;
// const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// try {
//     oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
// } catch (err) {
//     console.log('Unable to load credentials from file, getting new token from user');
//     await getNewToken(oAuth2Client);
// }
// return oAuth2Client;
// }


// const getNewToken = async oAuth2Client => {
// // TODO split this into a separate utility or separate flow?
// const authUrl = oAuth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: SCOPES,
// });
// console.log('Authorize this app by visiting this url:', authUrl);
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
// });
// // TODO util.promisify this https://nodejs.org/api/readline.html#readline_rl_question_query_options_callback
// rl.question('Enter the code from that page here: ', (code) => {
//     rl.close();
//     oAuth2Client.getToken(code, (err, token) => {
//     if (err) return console.error('Error while trying to retrieve access token', err);
//     oAuth2Client.setCredentials(token);
//     // Store the token to disk for later program executions
//     fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
//         if (err) return console.error(err);
//         console.log('Token stored to', TOKEN_PATH);
//     });
//     });
// });
// // This should await readline.question and there's probably a similar thing to do with oAuth2Client.getToken
// }


// const getMsg = async (rng, auth) => {
// const sheets = google.sheets({version: 'v4', auth});
// try {
//     var response = await sheets.spreadsheets.values.get({
//     spreadsheetId: SPREADSHEET_ID,
//     range: rng,
//     });
//     return response.data.values[0][0];
// } catch (err) {
//     console.log(`getMsg API returned an error for range "${rng}"`, err);
//     throw err;
// }
// }


// const getMsgs = async (rng, auth) => {
// const sheets = google.sheets({version: 'v4', auth});
// try {
//     var response = await sheets.spreadsheets.values.batchGet({
//     spreadsheetId: SPREADSHEET_ID,
//     ranges: rng,
//     });
//     return response.data.valueRanges;
// } catch (err) {
//     console.log(`getMsgs API returned an error for range "${rng}"`, err);
//     throw err;
// }
// }


// const setMsg = async (rng, val, auth) => {
// const sheets = google.sheets({version: 'v4', auth});
// try {
//     var confirm = await sheets.spreadsheets.values.update({
//     spreadsheetId: SPREADSHEET_ID,
//     range: rng,
//     valueInputOption: 'USER_ENTERED',
//     resource: {
//         majorDimension: 'ROWS',
//         values: [[val]],
//     },
//     });
//     return confirm.config.data.values[0];
// } catch (err) {
//     console.log(`setMsg API returned an error for range "${rng}" and value "${val}"`, err);
//     throw err;
// }
// }

client.login(process.env.TOKEN);
  