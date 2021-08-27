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

const testing = false;

const CHANNEL_ID = (testing === true ? '876135378346733628' : '751893730117812225');
const SOURCE_CHANNELS = [
  { name: 'music', id: '246342398123311104' },
  { name: 'music-meta', id: '763068914480840715' },
  { name: 'skynet', id: '864768873270345788' },
];
const SPREADSHEET_ID = (testing === true ? '1-xVpzfIVr76dSuJO8SO-Im55WQZd0F07IQNt-hhu_po' : '1qQBxqku14GTL70o7rpLEQXil1ghXEHff7Qolhu0XrMs');
const READ_RANGE = 'Dashboard!H2:H129';

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()
    || !SOURCE_CHANNELS.find(({ id }) => id === interaction.channel.id)) return;

  if (interaction.commandName === 'addurl') {
    const channel = client.channels.cache.get(CHANNEL_ID);
    const match = interaction.options.getInteger('match');
    const song = interaction.options.getInteger('song');
    const url = interaction.options.getString('url');

    const messages = await channel.messages.fetch({ limit: 100 });
    const targetMatch = await messages.find((msg) => parseInt(msg.content.slice(8, msg.content.indexOf(':'))) === match);

    if (typeof targetMatch === 'undefined') {
      await interaction.reply('Could not find match.');
    } else {
      const currentText = targetMatch.content;
      let newText = '';
      if (song === 1) {
        const urlPos1 = currentText.indexOf('\n');
        const urlPos = currentText.indexOf('\n', urlPos1 + 1);
        newText = [currentText.slice(0, urlPos), ` | <${url}>`, currentText.slice(urlPos)].join('');
      } else if (song === 2) {
        newText = `${currentText} | <${url}>`;
      }
      targetMatch.edit(newText);

      const readVals = await getValue(READ_RANGE);
      const searchArr = [];
      console.log(readVals);
      readVals.map((row) => searchArr.push(row[0]));
      const songText = currentText.match(/(?<=\u200b )[^\u200b-]+(?=\s-)/g);
      const writeIndex = searchArr.indexOf(songText[song - 1]) + 2;
      const writeRange = `Dashboard!L${writeIndex}`;

      if (writeIndex > -1) {
        await setValue(writeRange, ` | ${url}`);
      } else {
        console.log('Error writing to spreadsheet.');
      }

      if (currentText === newText) {
        await interaction.reply('Replacement failed.');
      } else {
        await interaction.reply(`${interaction.user.username} added a link to song ${song} of match ${match}.`);
      }
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

const getValue = async (rng) => getMsg(rng, await getAuthClient());

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

const getMsg = async (rng, auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: rng,
    });
    return response.data.values;
  } catch (err) {
    console.log(`getMsg API returned an error for range "${rng}"`, err);
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
