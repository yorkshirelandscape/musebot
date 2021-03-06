/* eslint-disable consistent-return */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
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

const SOURCE_CHANNELS = [
  { name: 'music', id: '246342398123311104' },
  { name: 'music-meta', id: '763068914480840715' },
  { name: 'skynet', id: '864768873270345788' },
];

function removeCols(array, remIndices) {
  return array.map((arr) => arr.filter((_col, index) => !remIndices.includes(index)));
}

const MASTER_ID = '1mBjOr2bNpNbPHmRGcPmxpAi3GlF6a5WhtRcjt8TvvP0';
const HISTORICAL_ID = '1MkRLpTvUiB5yKtRCexD7ooC0dbeUBrrQjrLyAocaT-4';
// const TESTING_ID = '1-xVpzfIVr76dSuJO8SO-Im55WQZd0F07IQNt-hhu_po';
let SPREADSHEET_ID = MASTER_ID;
const READ_RANGE = 'SongsStaging!B2:G';
const HIST_RANGE = 'Submissions!A2:F';
const YEAR_RANGE = 'Lists!K2';

client.on('interactionCreate', async (interaction) => {
  let hist = false;
  SPREADSHEET_ID = MASTER_ID;
  if (!interaction.isCommand()
    || !(interaction.guildId === null
      || SOURCE_CHANNELS.find(({ id }) => id === interaction.channel?.id))) return;

  if (interaction.commandName === 'songs') {
    const histYear = interaction.options.getString('year');
    const currYear = (await getValue(YEAR_RANGE, SPREADSHEET_ID)).toString();
    const year = (histYear !== null ? histYear : currYear);
    if (histYear !== null && histYear !== currYear) hist = true;
    SPREADSHEET_ID = (hist === true ? HISTORICAL_ID : MASTER_ID);
    const readVals = await getValue((
      histYear !== null && histYear !== currYear ? HIST_RANGE : READ_RANGE
    ), SPREADSHEET_ID);

    const filtArr = readVals.filter((s) => s[3] === year
    && (interaction.user.username.startsWith(s[2])
    || ((typeof interaction.member?.nickname !== 'undefined' && interaction.member?.nickname !== null) ? interaction.member?.nickname.startsWith(s[2]) : false)));
    const thinArr = removeCols(filtArr, [2, 3]);
    const strArr = thinArr.map((r) => r.join('\t'));
    const table = `${interaction.user.username} : ${year}\n${strArr.join('\n')}`;

    if (typeof table !== 'string') {
      await interaction.reply('Could not find any submissions.');
    } else if (interaction.guildId === null || hist === true) {
      await interaction.reply(`${table}`);
    } else {
      interaction.user.send(table);
      await interaction.reply('List sent. Check your DMs.');
    }
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

const getValue = async (rng, ss) => getMsg(rng, ss, await getAuthClient());

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

const getMsg = async (rng, ss, auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ss,
      range: rng,
    });
    return response.data.values;
  } catch (err) {
    console.log(`getMsg API returned an error for range "${rng}"`, err);
    throw err;
  }
};

client.login(process.env.TOKEN);
