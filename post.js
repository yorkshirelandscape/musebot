/* eslint-disable consistent-return */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
/* eslint-disable no-console */
const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({
  intents:
  [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
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
  round: 'Dashboard!B2',
  song: 'Dashboard!B3',
  header: 'Dashboard!D1',
  footer: 'Dashboard!D8',
  match: 'Dashboard!D3:E6',
  size: 'Dashboard!B5',
  year: 'Dashboard!B1',
};

let skipstat = false;
let testing = false;
let once = false;

process.argv.forEach((val) => {
  if (val === '-s') { skipstat = true; }
  if (val === '-t') { testing = true; }
  if (val === '-o') { once = true; }
});

const GUILD_ID = (testing === true ? '782213860337647636' : '212660788786102272');
const SKYNET = '864768873270345788';
const TEST_VOTES = '876135378346733628';
const DOM_VOTES = '751893730117812225';
const CHANNEL_ID = (testing === true ? TEST_VOTES : DOM_VOTES);
const SPREADSHEET_ID = (testing === true ? '1-xVpzfIVr76dSuJO8SO-Im55WQZd0F07IQNt-hhu_po' : '1mBjOr2bNpNbPHmRGcPmxpAi3GlF6a5WhtRcjt8TvvP0');


const formatMatchRow = (row) => `\u200b${row[0].trim()}\u200b${(typeof row[1] !== 'undefined') ? ` ${row[1]}` : ''}`;
const replacement = '\u200b$1\u200b';
const formatOther = (text) => text.replaceAll(/(:[^:\n]+:)/g, replacement);

const getMatchText = (rows) => rows.map(formatMatchRow).join('\n');



// eslint-disable-next-line no-nested-ternary, max-len
const getMatchesCount = (round, size) => Math.min(round === 4 ? 4 : (round === 5 ? 2 : (round === 6 ? 2 : 8)), 2 ** (round - (size > 64 ? 0 : (size > 32 ? 1 : 2))));

const nextMatch = async (match, matches = 1) => {
  const channel = client.channels.cache.get(CHANNEL_ID);
  const testChan = client.channels.cache.get(TEST_VOTES);

  // Even though REFS is an object, order is guaranteed for non-string keys
  const valueRanges = await getValues(Object.values(REFS));

  const round = valueRanges[0].values[0].toString();
  const curSong = parseInt(valueRanges[1].values[0].toString());
  const size = parseInt(valueRanges[5].values[0].toString());
  const rndVal = parseInt(round.slice(1));

  console.log(`Posting ${matches} matches manually, starting with @{match}.`);

  let song = match;
  if (((size === 128 || size === 96) && rndVal === 0)
    || ((size === 64 || size === 48) && rndVal === 1)
    || (size === 32 && rndVal === 2)) {
      song = match;
  } else {
    song = match - size - 2^(Math.log2(64) - round + 1) - (size === 96 && round === 0? 32 : 0);
  }

  await setValue(REFS.song, song);

  let matchText = getMatchText(valueRanges[4].values).replaceAll(/<([^<>]+) >/g, '<$1>');
  const matchEmojis = await findEmojis(matchText);
  if (matchEmojis[0].name === matchEmojis[1].name
    || (matchEmojis[0].id === matchEmojis[1].id && typeof matchEmojis[0].id !== 'undefined')) {
    matchEmojis[0].replacement = EMOJI_ONE;
    matchEmojis[0].unicode = EMOJI_ONE;
    matchEmojis[0].id = null;
  }
  matchText = replaceEmojis(matchText, matchEmojis);

  if (matchText) {
    const sent = await channel.send(matchText);
    await react(sent, matchEmojis);
    const sentTest = await testChan.send(matchText);
    await react(sentTest, matchEmojis);
  }

  await setValue(REFS.song, curSong);
};

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
