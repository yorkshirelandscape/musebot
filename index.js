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

const dismoji = require('discord-emoji');
const enm = require('emoji-name-map');

const EMOJI_ONE = enm.get('one');
// const EMOJI_TWO = enm.get('two');
const EMOJI_BOOM = enm.get('boom');

const BOT_STATE_REF = 'Dashboard!B4';

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
const CHANNEL_ID = (testing === true ? '864768873270345788' : '751893730117812225');
const SPREADSHEET_ID = (testing === true ? '1-xVpzfIVr76dSuJO8SO-Im55WQZd0F07IQNt-hhu_po' : '1qQBxqku14GTL70o7rpLEQXil1ghXEHff7Qolhu0XrMs');

const START_TIME = (skipstat === true ? 0 : 5);
const END_TIME = (skipstat === true ? 24 : 21);

const now = new Date();

const addHours = (date, h) => {
  const tmpDate = new Date(date);
  tmpDate.setTime(tmpDate.getTime() + (h * 60 * 60 * 1000));
  return tmpDate;
};

const isBotEnabled = (botState) => {
  const nowHour = new Date().getHours();
  return botState === 'GO' && START_TIME < nowHour && nowHour < END_TIME;
};

const formatMatchRow = (row) => `\u200b${row[0].trim()}\u200b${(typeof row[1] !== 'undefined') ? ` ${row[1]}` : ''}`;
const replacement = '\u200b$1\u200b';
const formatOther = (text) => text.replaceAll(/(:[^:\n]+:)/g, replacement);

const getMatchText = (rows) => rows.map(formatMatchRow).join('\n');

const getDismojiByName = (name) => {
  for (const cat of Object.values(dismoji)) {
    if (typeof cat[name] !== 'undefined') {
      return cat[name];
    }
  }
  return null;
};

const getDismojiByUnicode = (uni) => {
  for (const cat of Object.values(dismoji)) {
    for (const emo of Object.values(cat)) {
      if (emo === uni) {
        return true;
      }
    }
  }
  return false;
};

const findEmojis = async (text) => Promise.all(Array.from(text.matchAll(/(?<=\u200b):?([^:\n]+):?(?=\u200b)/g), getEmoji));

const replaceEmojis = (text, emojis) => (
  emojis.filter((emoji) => emoji.replacement)
    .reduce((curText, emoji) => (
      curText.replace(emoji.text, emoji.replacement)
    ), text)
);

const getEmoji = async (match) => {
  const guild = client.guilds.cache.get(GUILD_ID);

  const text = match[0];
  const name = match[1];

  const emoji = {
    text,
    name,
    replacement: false,
  };
  const matchFunc = (ident) => ident.name === name;
  try {
    const guildEmoji = await guild.emojis.cache.find(matchFunc);
    emoji.id = guildEmoji.id;
    emoji.replacement = `<${text}${guildEmoji.id}>`;
    console.log(`Custom emoji found for "${name}"`, guildEmoji.id);
  } catch (err) {
    console.log(`No custom emoji found for "${name}"`);
    try {
      const clientEmoji = await client.emojis.cache.find(matchFunc);
      emoji.id = clientEmoji.id;
      emoji.replacement = `<${text}${clientEmoji.id}>`;
      console.log(`Client emoji found for "${name}"`, clientEmoji.id);
    } catch (errClient) {
      console.log(`No client emoji found for "${name}"`);
    }
    const sym = getDismojiByName(name);
    if (sym) {
      emoji.unicode = sym;
      console.log(`Dismoji emoji found for "${name}"`, sym);
    } else {
      console.log(`No dismoji emoji found for "${name}"`);
    }
    const uniTest = Array.from(text.matchAll(/:([a-zA-Z0-9_]+):/g));
    if (uniTest.length === 0) {
      const uniMatch = getDismojiByUnicode(text);
      if (uniMatch === true) {
        emoji.unicode = text;
        console.log(`Dismoji verified for "${text}"`);
      } else {
        console.log(`Dismoji not found for "${text}"`);
      }
    }
  }
  if (!emoji.id && !emoji.unicode) {
    console.log(`Emoji not found for "${name}"`);
    return {
      text,
      name,
      replacement: EMOJI_BOOM,
      unicode: EMOJI_BOOM,
    };
  }
  return emoji;
};

const react = async (message, emojis) => {
  emojis.forEach(async (emoji) => {
    if (typeof emoji.id !== 'undefined') {
      await message.react(emoji.id);
    } else if (typeof emoji.unicode !== 'undefined') {
      await message.react(emoji.unicode);
    } else {
      console.log(`Can't react with invalid emoji "${emoji.name}"`);
    }
  });
};

// eslint-disable-next-line no-nested-ternary, max-len
const getMatchesCount = (round, size) => Math.min(round === 4 ? 4 : (round === 5 ? 2 : (round === 6 ? 2 : 8)), 2 ** (round - (size > 64 ? 0 : (size > 32 ? 1 : 2))));

const nextMatch = async (matches) => {
  const channel = client.channels.cache.get(CHANNEL_ID);

  const botState = await getValue(BOT_STATE_REF);

  if (!isBotEnabled(botState) && !skipstat) {
    console.log(`${now}: Bot disabled, exiting`);
    return;
  }

  // Even though REFS is an object, order is guaranteed for non-string keys
  const valueRanges = await getValues(Object.values(REFS));

  const round = valueRanges[0].values[0].toString();
  const song = parseInt(valueRanges[1].values[0].toString());
  const header = ('values' in valueRanges[2]) ? valueRanges[2].values[0].toString() : null;
  const footer = ('values' in valueRanges[3]) ? valueRanges[3].values[0].toString() : null;
  const size = parseInt(valueRanges[5].values[0].toString());
  const year = parseInt(valueRanges[6].values[0].toString());
  const rndVal = parseInt(round.slice(1));

  if (typeof matches === 'undefined') {
    // eslint-disable-next-line no-param-reassign
    matches = getMatchesCount(rndVal, size);
    console.log(`${now}: Posting ${matches} matches this iteration`);
  }
  console.log(`${matches} matches left to post`);

  if (song === 1
      && (
        ((size === 128 || size === 96) && rndVal === 0)
        || ((size === 64 || size === 48) && rndVal === 1)
        || (size === 32 && rndVal === 2)
      )
  ) {
    const sent = await channel.send(`React with 🎵 if you plan on voting in the ${year} bracket.`);
    await sent.react('🎵');
    await sent.pin();
  }

  if (header) {
    const sent = await channel.send(header);
    await sent.pin();
  }

  let matchText = getMatchText(valueRanges[4].values).replaceAll(/<([^<>]+) >/g, '<$1>');
  const matchEmojis = await findEmojis(matchText);
  if (matchEmojis[0].name === matchEmojis[1].name) {
    matchEmojis[0].replacement = EMOJI_ONE;
    matchEmojis[0].unicode = EMOJI_ONE;
  }
  matchText = replaceEmojis(matchText, matchEmojis);

  if (matchText) {
    const sent = await channel.send(matchText);
    await react(sent, matchEmojis);
  }

  await setValue(REFS.song, song + 1);

  if (footer) {
    let roundMin = 12;
    let roundMax = 24;
    if (rndVal === 0
      || (rndVal === 1 && size === 96)
      || (rndVal === 2 && (size === 64 || size === 48))
      || (rndVal === 3 && size < 64)) {
      roundMin = 24;
      roundMax = 36;
    } else if (round === '3P') {
      roundMin = 24;
      roundMax = 24;
    }
    const footMsg = footer.replace('$1', roundMin)
      .replace('$2', addHours(now, roundMin).toLocaleString())
      .replace('$3', roundMax)
      .replace('$4', addHours(now, roundMax).toLocaleString());
    const sent = await channel.send(footMsg);
    const footText = formatOther(footer);
    const footEmojis = await findEmojis(footText);
    await react(sent, footEmojis);

    if (typeof round !== 'undefined') {
      await setValue(REFS.round, rndVal === 6 || round === '3P' ? '3P' : `R${rndVal + 1}`);
    }
    await setValue(REFS.song, 1);
    await setValue(BOT_STATE_REF, 'STOP');
  }

  if (round === 'R6') {
    await setValue(REFS.round, '3P');
    await setValue(REFS.song, 1);
  }

  if (matches > 1) {
    await nextMatch(matches - 1);
  }
};

client.once('ready', () => {
  console.log('Ready!');
});

client.on('ready', async () => {
  if (once === true) {
    await nextMatch();
    // client.destroy();
  } else {
    // Number of seconds until the next even hour
    const countdown = ((60 - now.getSeconds()) + 60
      * (60 - now.getMinutes()) + 60 * 60 * ((1 - now.getHours()) % 2));
    console.log(`${now}: Triggering in ${countdown / 60} minutes`);
    setTimeout(() => {
      nextMatch();
      setInterval(nextMatch, 2 * 60 * 60 * 1000);
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

const getValue = async (rng) => getMsg(rng, await getAuthClient());

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

const getMsg = async (rng, auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: rng,
    });
    return response.data.values[0][0];
  } catch (err) {
    console.log(`getMsg API returned an error for range "${rng}"`, err);
    throw err;
  }
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
