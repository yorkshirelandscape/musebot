/*
  master file for all slash commands
  Includes:
    - addurl
    - discogs (/disc)
    - listSongs (/songs)
    - replaceAll
    - replaceURL
    - timestamp (/tzstamp)
*/

/* eslint-disable consistent-return */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
/* eslint-disable no-nested-ternary */

const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents, MessageEmbed } = require('discord.js');

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

// const { DateTime } = require('luxon');

const testing = false;

const CHANNEL_ID = (testing === true ? '876135378346733628' : '751893730117812225');
const SOURCE_CHANNELS = [
  { name: 'music', id: '246342398123311104' },
  { name: 'music-meta', id: '763068914480840715' },
  { name: 'skynet', id: '864768873270345788' },
];

const MASTER_ID = '1mBjOr2bNpNbPHmRGcPmxpAi3GlF6a5WhtRcjt8TvvP0';
const HISTORICAL_ID = '1MkRLpTvUiB5yKtRCexD7ooC0dbeUBrrQjrLyAocaT-4';
const TESTING_ID = '1-xVpzfIVr76dSuJO8SO-Im55WQZd0F07IQNt-hhu_po';
let SPREADSHEET_ID = (testing === true ? TESTING_ID : MASTER_ID);

const ADDURL = {
  READ_RANGE: 'Dashboard!H2:H129',
};

const LISTSONGS = {
  READ_RANGE: 'SongsStaging!B2:K',
  HIST_RANGE: 'Submissions!A2:G',
  YEAR_RANGE: 'Lists!K2',
  ACTIVE_YEAR: 'Dashboard!B1',
};

const REMATCH = {
  ROUND_RANGE: 'Dashboard!B2',
  MATCH_RANGE: 'Dashboard!B3',
};

const ADMINS = [
  { name: 'DonaldX', id: '268846196888567810' },
  { name: 'volfied', id: '426730219790008320' },
  { name: 'Bluey', id: '596373234262474764' },
  { name: 'alatar224', id: '807760790244294709' },
];

const Discogs = require('disconnect').Client;

const disc = new Discogs('MuseBot/1.0', { userToken: process.env.DISCOGS }).database();

function removeCols(array, remIndices) {
  return array.map((arr) => arr.filter((_col, index) => !remIndices.includes(index)));
}

function replaceOccurrence(string, regex, n, replace) {
  let i = 0;
  return string.replace(regex, (match) => {
    i += 1;
    if (i === n) return replace;
    return match;
  });
}

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
  );
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()
  || (!(interaction.commandName === 'tzstamp') && !(interaction.guildId === null
    || SOURCE_CHANNELS.find(({ id }) => id === interaction.channel?.id)))) return;

  if (testing === false) SPREADSHEET_ID = MASTER_ID;

  const channel = client.channels.cache.get(CHANNEL_ID);

  // BEGIN discogs
  if (interaction.commandName === 'disc') {
    const searchArtist = interaction.options.getString('artist');
    const searchTrack = interaction.options.getString('title');
    const cleanTrack = searchTrack.replaceAll(/['.]/g, '');

    const data = await disc.search({
      artist: searchArtist, track: cleanTrack, type: 'release', sort: 'year', sort_order: 'asc',
    });

    const sortMap = data.results.sort((x, y) => {
      const n = x.year - y.year;
      if (n !== 0) {
        return n;
      }
      return y.community.have - x.community.have;
    });

    const filtArr = sortMap.filter((r) => (
      !r.format.includes('Unofficial Release')
        && !r.format.includes('Promo')
        && !r.format.includes('EP')
        && !r.format.includes('Test Pressing')
        && (r.format.includes('Album')
          || r.format.includes('Single')
          || r.format.includes('Compilation')
          || r.format.includes('LP'))
    ));

    const plusArtist = searchArtist.replaceAll(/ /g, '+');
    const plusTrack = searchTrack.replaceAll(/ /g, '+');
    const searchURL = `https://www.discogs.com/search/?sort=year%2Casc&artist=${plusArtist}&track=${plusTrack}&type=release&layout=sm`;

    if (filtArr.length === 0) await interaction.reply(`No match. [Discogs Search](${searchURL})`);

    const {
      // eslint-disable-next-line camelcase
      title, year, genre, style, master_url, cover_image,
    } = filtArr[0];

    const embed = new MessageEmbed()
      .setTitle(`${title} (${year})`)
      .setDescription(`${toTitleCase(searchTrack)}\n\n${genre.join(', ')} (${style.join(', ')})`)
      .setImage(cover_image)
      .setURL(master_url)
      .addField('\u200B', `[Discogs Search](${searchURL})`);

    if (typeof year === 'undefined') {
      await interaction.reply('No match.');
    } else {
      await interaction.reply({ embeds: [embed] });
    }
  }
  // END discogs

  // BEGIN addurl
  if (interaction.commandName === 'addurl' && SOURCE_CHANNELS.find(({ id }) => id === interaction.channel?.id)) {
    await interaction.reply('Please wait...');
    const match = interaction.options.getInteger('match');
    const song = interaction.options.getInteger('song');
    const url = interaction.options.getString('url');

    const messages = await channel.messages.fetch({ limit: 100 });
    const targetMatch = await messages.find((msg) => parseInt(msg.content.slice(8, msg.content.indexOf(':'))) === match);

    if (typeof targetMatch === 'undefined') {
      await interaction.editReply('Could not find match.');
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

      const readVals = await getValue(ADDURL.READ_RANGE);
      const searchArr = [];
      readVals.map((row) => searchArr.push(row[0]));
      const songText = currentText.match(/(?<=\u200b )[^\u200b-]+(?=\s-)/g);
      const writeIndex = searchArr.indexOf(songText[song - 1]) + 2;
      const writeRange = `Dashboard!L${writeIndex}`;

      if (writeIndex > -1) {
        await setValue(writeRange, ` | <${url}>`);
      } else {
        await interaction.editReply(`${interaction.user.username} added a link to song ${song} of match ${match}, but error writing to spreadsheet.`);
      }

      await interaction.editReply(`${interaction.user.username} added a link to song ${song} of match ${match}.`);
    }
  }
  // END addurl

  // BEGIN listSongs
  let hist = false;
  if (interaction.commandName === 'songs') {
    await interaction.reply('Please wait...');
    const histYear = interaction.options.getString('year');
    const currYear = (await getValue(LISTSONGS.YEAR_RANGE, SPREADSHEET_ID)).toString();
    const activeYear = (await getValue(LISTSONGS.ACTIVE_YEAR, SPREADSHEET_ID)).toString();
    const year = (histYear !== null ? (histYear === activeYear ? activeYear : histYear) : currYear);
    if (histYear !== null && histYear !== currYear && histYear !== activeYear) hist = true;
    SPREADSHEET_ID = (hist === true ? HISTORICAL_ID : MASTER_ID);
    // eslint-disable-next-line max-len
    const readVals = await getValue((hist === true ? LISTSONGS.HIST_RANGE : LISTSONGS.READ_RANGE), SPREADSHEET_ID);
    if (histYear !== null && histYear === activeYear && currYear !== activeYear) hist = true;

    const filtArr = readVals.filter((s) => s[4] === year
    && (interaction.user.username.startsWith(s[3])
    || ((typeof interaction.member?.nickname !== 'undefined' && interaction.member?.nickname !== null) ? interaction.member?.nickname.startsWith(s[3]) : false)));

    const thinArr = removeCols(filtArr, [3, 4, 7, 8]);
    const strArr = thinArr.map((r) => r.join('\t'));
    const table = `${interaction.user.username} : ${year}\n${strArr.join('\n')}`;

    if (typeof table !== 'string') {
      await interaction.editReply('Could not find any submissions.');
    } else if (interaction.guildId === null || hist === true) {
      await interaction.editReply(`${table}`);
    } else {
      interaction.user.send(table);
      await interaction.editReply('List sent. Check your DMs.');
    }
  }
  // END listSongs

  // BEGIN replaceAll
  if (!interaction.isCommand() || !ADMINS.find(({ id }) => id === interaction.user.id)) return;

  if (interaction.commandName === 'replaceall' && ADMINS.find(({ id }) => id === interaction.user.id)) {
    const match = interaction.options.getInteger('match');
    const song = interaction.options.getInteger('song');
    const replacement = interaction.options.getString('replacement');

    const messages = await channel.messages.fetch({ limit: 100 });
    const targetMatch = await messages.find((msg) => parseInt(msg.content.slice(8, msg.content.indexOf(':'))) === match);

    if (typeof targetMatch === 'undefined') {
      interaction.reply('Could not find match.');
    } else {
      const currentText = targetMatch.content;
      let newText = '';
      if (song === 1) {
        newText = replaceOccurrence(currentText, /[^\n]+/g, 2, replacement);
      } else if (song === 2) {
        newText = replaceOccurrence(currentText, /[^\n]+/g, 4, replacement);
      }
      await targetMatch.edit(newText);

      if (currentText === newText) {
        await interaction.reply('No match.');
      } else {
        await interaction.reply(`${interaction.user.username} replaced song ${song} of match ${match}.`);
      }
    }
  }
  // END replaceAll

  // BEGIN replaceurl
  if (interaction.commandName === 'replaceurl' && SOURCE_CHANNELS.find(({ id }) => id === interaction.channel?.id)) {
    const match = interaction.options.getInteger('match');
    const song = interaction.options.getInteger('song');
    const url = interaction.options.getString('url');

    const messages = await channel.messages.fetch({ limit: 100 });
    const targetMatch = await messages.find((msg) => parseInt(msg.content.slice(8, msg.content.indexOf(':'))) === match);

    if (typeof targetMatch === 'undefined') {
      interaction.reply('Could not find match.');
    } else {
      const currentText = targetMatch.content;
      let newText = '';
      if (song === 1) {
        newText = currentText.replace(/<*(https?|ftp):\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?>*[^\n]*/, url);
      } else if (song === 2) {
        newText = replaceOccurrence(currentText, /<*(https?|ftp):\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?>*[^\n]*/g, 2, url);
      }
      await targetMatch.edit(newText);

      if (currentText === newText) {
        await interaction.reply('No matching URL.');
      } else {
        await interaction.reply(`${interaction.user.username} replaced the link for song ${song} of match ${match}.`);
      }
    }
  }
  // END replaceurl

  // // BEGIN tzstamp
  // if (interaction.commandName === 'tzstamp') {
  //   const msg = interaction.options.getString('msg');
  //   const offset = interaction.options.getString('offset');
  //   const raw = interaction.options.getBoolean('raw');
  //   const replacer = (match) => {
  //     let dt = DateTime.fromFormat(match, 'yyyy/MM/dd HH:mm')
  //     if (offset === null) {
  //       dt = dt.setZone('UTC+0', {keepLocalTime: true})
  //     } else {
  //       dt = dt.setZone(offset, {keepLocalTime: true})
  //     }
  //     return `${raw ? '`' : ''}<t:${dt.valueOf() / 1000}:F>${raw ? '`' : ''}`;
  //   }
  //   const newMsg = msg.replaceAll(/((\d{4})\/(\d{2})\/(\d{2}) (\d{2}):?(\d{2}))/g, replacer);
  //   if (newMsg === msg) {
  //     await interaction.reply('Could not find a suitable timestamp. Use yyyy/MM/dd HH:mm.');
  //   } else {
  //     await interaction.reply(newMsg);
  //   }
  // }
  // // END tzstamp

  // BEGIN rematch
  if (interaction.commandName === 'rematch') {
    if (ADMINS.includes(interaction.user.id)) {
      const match = interaction.options.getInteger('match');
      const round = parseInt(getValue(REMATCH.ROUND_RANGE).substring(1));
      const currMatch = getValue(REMATCH.MATCH_RANGE);
      const roundMatch = match - (128 - 2 ** (Math.log2(128) - round));
      await channel.messages.fetch({ limit: 100 });
      const msg = await channel.messages.cache.find((m) => m.content.includes(`Match ${match}`));
      await msg.delete();
      await setValue(REMATCH.MATCH_RANGE, roundMatch);
      // post match here
      await setValue(REMATCH.MATCH_RANGE, currMatch);
      await interaction.reply('Match replaced.');
    } else { await interaction.reply('User not authorized.'); }
  }

  // END rematch
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

const getValue = async (rng, ss = SPREADSHEET_ID) => getMsg(rng, ss, await getAuthClient());

// eslint-disable-next-line max-len
const setValue = async (rng, val, ss = SPREADSHEET_ID) => setMsg(rng, ss, val, await getAuthClient());

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

const setMsg = async (rng, ss, val, auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const confirm = await sheets.spreadsheets.values.update({
      spreadsheetId: ss,
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
