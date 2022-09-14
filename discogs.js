/* eslint-disable no-console */
/* eslint-disable max-len */
const dotenv = require('dotenv');

const DraftLog = require('draftlog');

DraftLog(console);

dotenv.config();

const { Client, Intents } = require('discord.js');

const client = new Client({
  intents:
  [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MEMBERS],
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

const Discogs = require('disconnect').Client;

const disc = new Discogs('MuseBot/1.0', { userToken: process.env.DISCOGS }).database();

// let skipstat = false;
let testing = false;
let gArg = false;
let yArg = false;
// let cArg = false;

process.argv.forEach((val) => {
  // if (val === '-s') { skipstat = true; }
  if (val === '-t') { testing = true; }
  if (val === '-g') { gArg = true; }
  if (val === '-y') { yArg = true; }
//   if (val === '-c') { cArg = true; }
});

const MASTER_ID = '1mBjOr2bNpNbPHmRGcPmxpAi3GlF6a5WhtRcjt8TvvP0';
const HISTORICAL_ID = '1MkRLpTvUiB5yKtRCexD7ooC0dbeUBrrQjrLyAocaT-4';
const TESTING_ID = '1-xVpzfIVr76dSuJO8SO-Im55WQZd0F07IQNt-hhu_po';
let SPREADSHEET_ID = (testing === true ? TESTING_ID : MASTER_ID);

const { DateTime, Duration } = require('luxon');

// const GUILD_ID = (testing === true ? '782213860337647636' : '212660788786102272');
// const SKYNET = '864768873270345788';
// const TEST_VOTES = '876135378346733628';
// const DOM_MUSIC = '246342398123311104';
// const DOM_VOTES = '751893730117812225';
// const CHANNEL_ID = (testing === true ? TEST_VOTES : DOM_VOTES);
// const MUSIC_ID = (testing === true ? SKYNET : DOM_MUSIC);

const GENRE_RANGES = {
  READ_RANGE: 'Discogs!E2:O',
  WRITE_RANGE: 'Discogs!H2:I',
  COPY_RANGE: 'Discogs!D2:D',
};

const YEAR_RANGES = {
  READ_RANGE: 'Test!G2:J',
  WRITE_RANGE: 'Test!J2:J',
  COPY_RANGE: 'Test!I2:I',
  SUBMITTERS: 'Test!F2:F',
  ACTIVE_YEAR: 'Lists!L2',
  TEST_YEAR: 'Lists!L8',
};

// const CHECK_RANGES = {
//   READ_RANGE: 'TestBracket!F2:K',
//   WRITE_RANGE: 'TestBracket!K2:K',
//   ACTIVE_YEAR: 'Dashboard!B1',
// };

// Input progess goes from 0 to 100
const ProgressBar = (progress) => {
  // Make it 50 characters length
  const units = Math.round(progress / 2);
  return `[${'='.repeat(units)}${' '.repeat(50 - units)}] ${Math.round(progress * 10) / 10}%`;
};

const barLine = console.draft('Preparing API Call...');
const callProgress = (progress) => {
  barLine(ProgressBar(progress));
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

const loadCredentials = () => {
  // Load client secrets from a local file.
  try {
    return JSON.parse(fs.readFileSync('credentials.json'));
  } catch (err) {
    console.log('Error loading client secret file:', err);
    throw err;
  }
};

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

const getAuthClient = async () => authorize(loadCredentials());

const clearRngs = async (rng, auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.batchClear({
      spreadsheetId: SPREADSHEET_ID,
      ranges: rng,
    });
    return response.data;
  } catch (err) {
    console.log(`clearRngs API returned an error for range "${rng}"`, err);
    throw err;
  }
};

const getMsgs = async (rng, cell, ss, auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ss,
      range: rng,
    });
    return cell === true ? response.data.values[0][0] : response.data.values;
  } catch (err) {
    console.log(`getMsg API returned an error for range "${rng}"`, err);
    throw err;
  }
};

const setMsgs = async (rng, val, auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const confirm = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: rng,
      valueInputOption: 'USER_ENTERED',
      resource: {
        majorDimension: 'ROWS',
        values: val,
      },
    });
    return confirm.config.data.values[0];
  } catch (err) {
    console.log(`setMsg API returned an error for range "${rng}" and value "${val}"`, err);
    throw err;
  }
};

const clearRanges = async (rng) => clearRngs(rng, await getAuthClient());
const getValues = async (rng, cell = false, ss = SPREADSHEET_ID) => getMsgs(rng, cell, ss, await getAuthClient());
const setValues = async (rng, val) => setMsgs(rng, val, await getAuthClient());

const sleep = async (interval) => new Promise((r) => setTimeout(r, interval));

const genreCall = async () => {
  SPREADSHEET_ID = HISTORICAL_ID;

  const dataSet = await getValues(GENRE_RANGES.READ_RANGE);

  await clearRanges(GENRE_RANGES.COPY_RANGE);

  await setValues(GENRE_RANGES.COPY_RANGE, dataSet.map((row) => [row[0]]));

  callProgress(0);

  const dataSetLen = dataSet.length;
  let i = 0;
  let errLog = '';

  for (const r of dataSet) {
    if (typeof r[10] === 'undefined') {
      try {
        const data = await disc.search({ artist: r[1], track: r[0], type: 'release' });

        const sortMap = data.results.sort((x, y) => y.community.have - x.community.have);

        if (sortMap.length === 0) {
          r[3] = 'No Match';
          errLog += `\n${r[1]} - ${r[0]}`;
        } else {
          const {
            genre, style,
          } = sortMap[0];

          r[3] = genre.join(';');
          r[4] = style.join(';');
          console.log(r[1], '-', r[0]);
          console.log(r[3], '|', r[4]);
        }
        await sleep(1000);
      } catch (err) {
        errLog += `\n${err}`;
      }
    }
    i++;
    callProgress((i / dataSetLen) * 100);
  }

  const writeResults = dataSet.map((row) => [row[3], row[4]]);

  await setValues(GENRE_RANGES.WRITE_RANGE, writeResults);

  console.log(errLog);
};

const yearCall = async () => {
  SPREADSHEET_ID = MASTER_ID;
  const dataSet = await getValues(YEAR_RANGES.READ_RANGE);

  await clearRanges(YEAR_RANGES.COPY_RANGE);

  await setValues(YEAR_RANGES.COPY_RANGE, dataSet.map((row) => [row[0]]));

  const activeYear = await getValues(YEAR_RANGES.ACTIVE_YEAR, true);
  const testYear = await getValues(YEAR_RANGES.TEST_YEAR, true);

  const oldData = await getValues(YEAR_RANGES.WRITE_RANGE);
  const subArr = await getValues(YEAR_RANGES.SUBMITTERS);

  if (activeYear !== testYear) {
    const submitters = subArr.map((sub) => sub[0]);
    const subCount = new Set(submitters).size;
    const counts = {};

    if (oldData) {
      for (const year of oldData) {
        counts[year] = counts[year] ? counts[year] + 1 : 1;
      }

      const isUpdated = (counts[testYear] >= subCount);
      if (!isUpdated) {
        await clearRanges(YEAR_RANGES.WRITE_RANGE);
      }
    }
  }

  const dataSetLen = dataSet.length;
  let i = 0;
  let errLog = '';

  for (const r of dataSet) {
    const artist = r[1];
    const song = r[0];
    const track = song.replaceAll(/['.]/g, '');
    const yearCheck = r[3];
    if (typeof yearCheck === 'undefined') {
      try {
        const data = await disc.search({
          artist, track, type: 'release', sort: 'year', sort_order: 'asc',
        });

        const sortMap = data.results.sort((x, y) => {
          const n = x.year - y.year;
          if (n !== 0) {
            return n;
          }
          return y.community.have - x.community.have;
        });

        const filtArr = sortMap.filter((rr) => (
          !rr.format.includes('Unofficial Release')
                      && !rr.format.includes('Promo')
                      && !rr.format.includes('EP')
                      && !rr.format.includes('Test Pressing')
                      && (rr.format.includes('Album')
                      || rr.format.includes('Single')
                      || rr.format.includes('Compilation')
                      || rr.format.includes('LP'))
        ));

        if (filtArr.length === 0) {
          errLog += `No match: ${artist} ${track}`;
        } else {
          const {
            year,
          } = filtArr[0];

          const plusArtist = artist.replaceAll(/ /g, '+');
          const plusTrack = track.replaceAll(/ /g, '+');
          const searchURL = `https://www.discogs.com/search/?sort=year%2Casc&artist=${plusArtist}&track=${plusTrack}&type=release&layout=sm`;

          r[3] = `=HYPERLINK("${searchURL}", ${year})`;
        }
        await sleep(1000);
      } catch (err) {
        errLog += err;
      }
    }
    i++;
    callProgress((i / dataSetLen) * 100);
  }

  const writeResults = dataSet.map((row) => [row[3]]);

  await setValues(YEAR_RANGES.WRITE_RANGE, writeResults);

  console.log(errLog);
};

// const yearCheck = async () => {
//   SPREADSHEET_ID = MASTER_ID;
//   const guild = client.guilds.cache.get(GUILD_ID);
//   await guild.members.fetch();
//   const volfied = guild.members.cache.find((u) => u.user.username === 'volfied');

//   const dataSet = await getValues(CHECK_RANGES.READ_RANGE);
//   const activeYear = parseInt(await getValue(CHECK_RANGES.ACTIVE_YEAR));

//   let i = 0;
//   for (const r of Object.values(dataSet[0].values)) {
//     i++;
//     const username = r[0];
//     const song = r[1];
//     const artist = r[2];
//     const year = parseInt(r[4]);
//     const told = r[5];
//     const plusArtist = artist.replaceAll(/ /g, '+');
//     const plusSong = song.replaceAll(/ /g, '+');
//     const searchURL = `https://www.discogs.com/search/?sort=year%2Casc&artist=${plusArtist}&track=${plusSong}&type=release&layout=sm`;
//     if (typeof told === 'undefined' && typeof year !== 'undefined' && !isNaN(year) && year !== '' && year !== activeYear) {
//       msg = `Hello, ${username}! Discogs thinks that your submission, ${song} by ${artist}, belongs in the year ${year}. Please check the year and let volfied know your replacement song or why the original submission belongs in ${activeYear}. Here's a Discogs search to get you started: ${searchURL}`;

//       const user = guild.members.cache.find((u) => u.user.username.toLowerCase() === username.toLowerCase()
//                   || (u.nickname || '').toLowerCase() === username.toLowerCase()
//                   || u.user.username.toLowerCase().startsWith(username.toLowerCase())
//                   || (u.nickname || '').toLowerCase().startsWith(username.toLowerCase()));
//       try {
//         user.send(msg);
//         if (user !== volfied) { volfied.send(msg); }
//         const toldRange = `TestBracket!K${i + 1}`;
//         setValue(toldRange, 'X');
//         console.log(msg);
//         await sleep(1000);
//       } catch (err) {
//         volfied.send(`Failed to send: "${msg}"`);
//         console.log(`Failed to send: "${msg}"`);
//       }
//     }
//   }
// };

client.once('ready', () => {
  console.log('Ready!');
});

client.on('ready', async () => {
  if (gArg === true) {
    console.log('Running genreCall once.');
    await genreCall();
    // client.destroy();
  } else if (yArg === true) {
    console.log('Running yearCall once.');
    await yearCall();
    // client.destroy();
    // } else if (cArg === true) {
    //     console.log('Running yearCheck once.');
    //     await yearCheck();
    //     // client.destroy();
  } else {
    // run genreCall at half past odd hours
    const nowG = DateTime.now();
    const countdownGenre = Duration.fromObject({
      hours: nowG.minute > 30 ? (nowG.hour + 1) % 2 : nowG.hour % 2,
      minutes: nowG.minute > 30 ? 60 - (nowG.minute - 30) : 30 - nowG.minute,
      seconds: 60 - nowG.second,
    });
    console.log(`${nowG.toFormat('M/d/yyyy HH:mm')}: Triggering genreCall in ${(countdownGenre.toFormat('m'))} minutes`);
    setTimeout(() => {
      genreCall();
      setInterval(genreCall, 2 * 60 * 60 * 1000);
    }, countdownGenre.toMillis());

    // run yearCall at half past even hours
    const nowY = DateTime.now();
    const countdownYear = Duration.fromObject({
      hours: nowY.minute > 30 ? 1 - ((nowY.hour + 1) % 2) : 1 - (nowY.hour % 2),
      minutes: nowY.minute > 30 ? 60 - (nowY.minute - 30) : 30 - nowY.minute,
      seconds: 60 - nowY.second,
    });
    console.log(`${nowY.toFormat('M/d/yyyy HH:mm')}: Triggering yearCall in ${(countdownYear.toFormat('m'))} minutes`);
    setTimeout(() => {
      yearCall();
      setInterval(yearCall, 2 * 60 * 60 * 1000);
    }, countdownYear.toMillis());

    // // run yearCheck at quarter past even hours
    // let nowC = DateTime.now();
    // let countdownCheck = Duration.fromObject({
    //     hours: nowC.minute > 15 ? 1- ((nowC.hour + 1) % 2) : 1 - (nowC.hour % 2),
    //     minutes: nowC.minute > 15 ? 60 - (nowC.minute - 15) : 15 - nowC.minute,
    //     seconds: 60 - nowC.second,
    // });
    // console.log(`${nowC.toFormat('M/d/yyyy HH:mm')}: Triggering yearCheck in ${(countdownCheck.toFormat('m'))} minutes`);
    // setTimeout(() => {
    //     yearCheck();
    //     setInterval(yearCheck, 2 * 60 * 60 * 1000);
    // }, countdownCheck.toMillis());
  }
});

client.login(process.env.TOKEN);
