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
}

const GUILD_ID = '212660788786102272';  // 782213860337647636
const CHANNEL_ID = '864768873270345788';  // 751893730117812225

const START_TIME = 4
const END_TIME = 22


const isBotEnabled = botState => {
  let now = new Date().getHours();
  return botState === 'GO' && START_TIME < now && now < END_TIME;
}


const formatMatchRow = row => row[0] + ((typeof row[1] != 'undefined') ? ` ${row[1]}` : '');


const getMatchText = rows => rows.map(formatMatchRow).join('\n');


const getDismojiByName = name => {
  for (let cat of Object.values(dismoji)) {
    if (typeof cat[name] != 'undefined') {
      return cat[name];
    }
  }
  return null;
}


const findEmojis = async text => await Promise.allSettled(Array.from(text.matchAll(/:([a-zA-Z0-9_]+):/g), getEmoji));


const replaceEmojis = (text, emojis) => emojis.filter(emoji => emoji.replacement).reduce((curText, emoji) => curText.replace(emoji.text, emoji.replacement), text);


const getEmoji = async match => {
  const guild = client.guilds.cache.get(GUILD_ID);

  let text = match[0]
  let name = match[1];

  let emoji = {
    'text': text,
    'name': name,
    'replacement': false,
  };
  let matchFunc = ident => ident.name === name;
  try {
    let guildEmoji = await guild.emojis.cache.find(matchFunc);
    emoji.id = guildEmoji.id;
    emoji.replacement = `<${text}${guildEmoji.id}>`;
    console.log(`Custom emoji found for "${name}"`, guildEmoji.id);
  } catch (err) {
    console.log(`No custom emoji found for "${name}"`, err);
    try {
      let clientEmoji = await client.emojis.cache.find(matchFunc);
      emoji.id = clientEmoji.id;
      console.log(`Client emoji found for "${name}"`, clientEmoji.id)
    } catch (err) {
      console.log(`No client emoji found for "${name}"`, err);
    };
    let sym = getDismojiByName(name);
    if (sym) {
      emoji.unicode = sym;
      console.log(`Dismoji emoji found for "${name}"`, sym);
    } else {
      console.log(`No dismoji emoji found for "${name}"`);
    }
  }
  if (!emoji.id && !emoji.unicode) {
    console.log(`Emoji not found for "${name}"`);
    return null;
  }
  return emoji;
}


const react = async (message, emojis) => {
  for (let emoji of emojis) {
    if (typeof emoji.id != 'undefined') {
      await sent.react(emoji.id);
    } else if (typeof emoji.unicode != 'undefined' ) {
      await sent.react(emoji.unicode);
    } else {
      console.log(`Can't react with invalid emoji "${emoji.name}"`);
    }
  }
}


client.once('ready', () => {
  console.log('Ready!');
});


client.on('ready', async () => {
  const channel = client.channels.cache.get(CHANNEL_ID);

  let botState = await getValue(BOT_STATE_REF)

  if (!isBotEnabled(botState)) {
    console.log('Bot disabled, exiting');
    return;
  }

  // Even though REFS is an object, order is guaranteed for non-string keys
  let valueRanges = await getValues(Object.values(REFS));

  let round = valueRanges[0].values[0].toString();
  let song = parseInt(valueRanges[1].values[0].toString());
  let header = ('values' in valueRanges[2]) ? valueRanges[2].values[0].toString() : null;
  let footer = ('values' in valueRanges[3]) ? valueRanges[3].values[0].toString() : null;

  if (header) {
    await channel.send(header);
  }

  let matchText = getMatchText(valueRanges[4].values);
  let emojis = await findEmojis(matchText);
  matchText = replaceEmojis(matchText);

  if (matchText) {
    let sent = await channel.send(mStr);
    await react(sent, emojis);
  }

  await setValue(REFS.song, song + 1);

  if (footer) {
    let sent = await channel.send(footer);
    let emojis = await findEmojis(footer);
    await react(sent, emojis);

    if (typeof round != 'undefined') {
      await setValue(REFS.round, 'R' + (parseInt(round.slice(1, 2)) + 1));
    }
    await setValue(REFS.song, 1);
    await setValue(BOT_STATE_REF, 'STOP');
  }
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


const getValue = async rng => {
  let auth = await getAuthClient();
  return getMsg(rng, auth);
}


const getValues = async rng => {
  let auth = await getAuthClient();
  return getMsgs(rng, auth);
}


const setValue = async (rng, val) => {
  let auth = await getAuthClient();
  return setMsg(rng, val, auth);
}


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
