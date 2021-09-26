/* eslint-disable consistent-return */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
/* eslint-disable no-console */
const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({
  intents:
  [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES],
});

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const REFS = {
  year: 'Dashboard!B1',
  dupes: 'Dupes!A2:M',
};

// let skipstat = false;
let testing = false;
let once = false;

process.argv.forEach((val) => {
  // if (val === '-s') { skipstat = true; }
  if (val === '-t') { testing = true; }
  if (val === '-o') { once = true; }
});

const GUILD_ID = (testing === true ? '782213860337647636' : '212660788786102272');
const SPREADSHEET_ID = (testing === true ? '1uly9fHWxfA_5bOI0aoXOeq-68s-tp6M-LU0w8bU3wrQ' : '1mBjOr2bNpNbPHmRGcPmxpAi3GlF6a5WhtRcjt8TvvP0');

const { DateTime } = require('luxon');

let now = DateTime.now();

const dupes = async () => {
  const valueRanges = await getValues(Object.values(REFS));
  const year = parseInt(valueRanges[0].values[0].toString());
  const dupeList = [];
  valueRanges[1].values.forEach((row, i) => {
    // eslint-disable-next-line no-param-reassign
    row[14] = i;
    const listYear = parseInt(row[1]);
    const listKR = parseInt(row[6]);
    const listTold = row[8];
    const listTied = row[10];
    const listOmit = row[13];
    if (listYear !== year && (listKR === -1 || listTied === 'X')
      && (listTold === '' || typeof listTold === 'undefined')
      && (listOmit === '' || typeof listOmit === 'undefined')) {
      dupeList.push(row);
    }
  });

  console.log(dupeList);
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.members.fetch();
  const volfied = guild.members.cache.find((u) => u.user.username === 'volfied');

  dupeList.forEach((row) => {
    const listKR = parseInt(row[6]);
    const listRep = row[9];
    let msg = '';
    if (listKR === -1 && listRep === 'X') {
      msg = `Your #${row[5]} seed, ${row[2]}, has duped. If you wish to make a direct substitution, please contact an admin with your replacement. Otherwise, submit a replacement using https://docs.google.com/forms/d/e/1FAIpQLScu6rcO8nyxyneyYzAnCUmVO6N7m4o4O78KS31SgPUY1Lt8RA/viewform.`;
    } else if (listKR === -1 && listRep !== 'X') {
      msg = `Your #${row[5]} seed, ${row[2]}, has duped. If you wish to make a direct substitution, please contact an admin with your replacement. Otherwise, your submitted replacements will be promoted in its place.`;
    } else if (listKR === 1) {
      const tiedUserRow = dupeList.filter((tieRow) => tieRow[1] === row[1] && tieRow[2] === row[2]
        && tieRow[3] === row[3] && tieRow[0] !== row[0]);
      const tiedUser = tiedUserRow[0][0];
      msg = `You and ${tiedUser} both submitted ${row[2]} as your ${row[5]} seed. Please determine between you who will keep and replace. Whoever replaces should inform an admin and, if they have not done so already, submit a replacement using https://docs.google.com/forms/d/e/1FAIpQLScu6rcO8nyxyneyYzAnCUmVO6N7m4o4O78KS31SgPUY1Lt8RA/viewform.`;
    }
    const user = guild.members.cache.find((u) => u.user.username === row[0]
      || u.nickname === row[0]);
    user.send(msg);
    if (user !== volfied) { volfied.send(msg); }
    const toldRange = `Dupes!I${row[14] + 2}`;
    console.log(toldRange);
    setValue(toldRange, 'X');
  });
};

client.once('ready', () => {
  console.log('Ready!');
});

client.on('ready', async () => {
  if (once === true) {
    dupes();
    // client.destroy();
  } else {
    now = DateTime.now();
    const countdown = ((60 - now.second) + 60
      * (60 - now.minute) + 60 * 60 * (now.hour % 2));
    console.log(`${now}: Triggering in ${countdown / 60} minutes`);
    setTimeout(() => {
      dupes();
      setInterval(dupes, 2 * 60 * 60 * 1000);
    }, countdown * 1000);
  }
});

const loadCredentials = () => {
  // Load client secrets from a local file.
  try {
    return JSON.parse(fs.readFileSync('credentials.json'));
  } catch (err) {
    console.log('Error loading client secret file:', err);
    throw err;
  }
};

const getValues = async (rng) => getMsgs(rng, await getAuthClient());

const setValue = async (rng, val) => setMsg(rng, val, await getAuthClient());

const getAuthClient = async () => authorize(loadCredentials());

const authorize = async (credentials) => {
  // eslint-disable-next-line camelcase
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  try {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
  } catch (err) {
    console.log('Unable to load credentials from file, getting new token from user');
    await getNewToken(oAuth2Client);
  }
  return oAuth2Client;
};

const getNewToken = async (oAuth2Client) => {
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
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (errAuth) => {
        if (errAuth) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
    });
  });
  // This should await readline.question and
  // there's probably a similar thing to do with oAuth2Client.getToken
};

const getMsgs = async (rng, auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: rng,
    });
    return response.data.valueRanges;
  } catch (err) {
    console.log(`getMsgs API returned an error for range "${rng}"`, err);
    throw err;
  }
};

const setMsg = async (rng, val, auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const confirm = await sheets.spreadsheets.values.update({
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
};

client.login(process.env.TOKEN);
