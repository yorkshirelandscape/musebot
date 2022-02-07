const dotenv = require('dotenv');

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
let cArg = false;

process.argv.forEach((val) => {
    // if (val === '-s') { skipstat = true; }
    if (val === '-t') { testing = true; }
    if (val === '-g') { gArg = true; }
    if (val === '-y') { yArg = true; }
    if (val === '-c') { cArg = true; }
});

const MASTER_ID = '1mBjOr2bNpNbPHmRGcPmxpAi3GlF6a5WhtRcjt8TvvP0';
const HISTORICAL_ID = '1MkRLpTvUiB5yKtRCexD7ooC0dbeUBrrQjrLyAocaT-4';
const TESTING_ID = '1-xVpzfIVr76dSuJO8SO-Im55WQZd0F07IQNt-hhu_po';
let SPREADSHEET_ID = (testing === true ? TESTING_ID : MASTER_ID);

const { DateTime, Duration } = require('luxon');

const GUILD_ID = (testing === true ? '782213860337647636' : '212660788786102272');
const SKYNET = '864768873270345788';
const TEST_VOTES = '876135378346733628';
const DOM_MUSIC = '246342398123311104';
const DOM_VOTES = '751893730117812225';
const CHANNEL_ID = (testing === true ? TEST_VOTES : DOM_VOTES);
const MUSIC_ID = (testing === true ? SKYNET : DOM_MUSIC);

const GENRE_RANGES = {
    READ_RANGE: 'Discogs!E2:M',
    WRITE_RANGE: 'Discogs!H2:I',
    COPY_RANGE: 'Discogs!D2:D',
};

const YEAR_RANGES = {
    READ_RANGE: 'TestBracket!G2:J',
    WRITE_RANGE: 'TestBracket!J2:J',
    COPY_RANGE: 'TestBracket!I2:I',
};

const CHECK_RANGES = {
    READ_RANGE: 'TestBracket!F2:K',
    WRITE_RANGE: 'TestBracket!K2:K',
    ACTIVE_YEAR: 'Dashboard!B1',
};


const genreCall = async () => {
    SPREADSHEET_ID = HISTORICAL_ID;

    const dataSet = await getValues(GENRE_RANGES.READ_RANGE);

    await clearRanges(GENRE_RANGES.COPY_RANGE);
    
    await setValues(GENRE_RANGES.COPY_RANGE, dataSet[0].values.map( row => [row[0]]));

    for (const r of Object.values(dataSet[0].values)) {
        if (typeof r[8] === 'undefined') {
            try {
                const data = await disc.search({artist: r[1], track: r[0], type: 'release'});
    
                const sortMap = data.results.sort((x, y) => {
                    return y.community.have - x.community.have;
                });
        
                if (sortMap.length === 0) {
                    console.log('No match.');
                } else {
                    const {
                        title, year, genre, style, master_url, cover_image,
                      } = sortMap[0];
              
                      r[3] = genre.join(';');
                      r[4] = style.join(';');
                }   
                await sleep(1000);
            } catch (err) {
                console.log(err);
            }
        }
    };

    const write_results = dataSet[0].values.map( row => [row[3],row[4]]);

    await setValues(GENRE_RANGES.WRITE_RANGE, write_results);    
}


const yearCall = async () => {
    SPREADSHEET_ID = MASTER_ID;
    const dataSet = await getValues(YEAR_RANGES.READ_RANGE);

    await clearRanges(YEAR_RANGES.COPY_RANGE);
    
    await setValues(YEAR_RANGES.COPY_RANGE, dataSet[0].values.map( row => [row[0]]));

    for (const r of Object.values(dataSet[0].values)) {
        const artist = r[1];
        const song = r[0];
        const track = song.replaceAll(/['.]/g, '');
        const yearCheck = r[3];
        if (typeof yearCheck === 'undefined') {
            try {
                const data = await disc.search({artist: artist, track: track, type: 'release', sort: 'year', sort_order: 'asc'});
                
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
        
                if (filtArr.length === 0) {
                    console.log(`No match: ${artist} ${track}`);
                } else {
                    const {
                        title, year, genre, style, master_url, cover_image,
                      } = filtArr[0];
              
                      r[3] = year
                }
                await sleep(1000);
            } catch (err) {
                console.log(err);
            }
        };
    }

    const write_results = dataSet[0].values.map( row => [row[3]]);

    await setValues(YEAR_RANGES.WRITE_RANGE, write_results);    
}


const yearCheck = async () => {
    SPREADSHEET_ID = MASTER_ID;
    const guild = client.guilds.cache.get(GUILD_ID);
    await guild.members.fetch();
    const volfied = guild.members.cache.find((u) => u.user.username === 'volfied');
  
    const dataSet = await getValues(CHECK_RANGES.READ_RANGE);
    const activeYear = parseInt(await getValue(CHECK_RANGES.ACTIVE_YEAR));

    let i = 0;
    for (const r of Object.values(dataSet[0].values)) {
        i++;
        const username = r[0];
        const song = r[1];
        const artist = r[2];
        const year = parseInt(r[4]);
        const told = r[5];
        const plusArtist = artist.replaceAll(/ /g, '+');
        const plusSong = song.replaceAll(/ /g, '+');
        const searchURL = `https://www.discogs.com/search/?sort=year%2Casc&artist=${plusArtist}&track=${plusSong}&type=release&layout=sm`;
        if (typeof told === 'undefined' && typeof year !== 'undefined' && !isNaN(year)  && year !== '' && year !== activeYear) {
            msg = `Hello, ${username}! Discogs thinks that your submission, ${song} by ${artist}, belongs in the year ${year}. Please check the year and let volfied know your replacement song or why the original submission belongs in ${activeYear}. Here's a Discogs search to get you started: ${searchURL}`;

            const user = guild.members.cache.find((u) => u.user.username.toLowerCase() === username.toLowerCase()
                || (u.nickname || '').toLowerCase() === username.toLowerCase()
                || u.user.username.toLowerCase().startsWith(username.toLowerCase())
                || (u.nickname || '').toLowerCase().startsWith(username.toLowerCase()));
            try {
                user.send(msg);
                if (user !== volfied) { volfied.send(msg); }
                const toldRange = `TestBracket!K${i + 1}`;
                setValue(toldRange, 'X');
                console.log(msg);
                await sleep(1000);
            } catch(err) {
                volfied.send(`Failed to send: "${msg}"`)
                console.log(`Failed to send: "${msg}"`);
            }
        }
    }
}

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
        let nowG = DateTime.now();
        let countdownGenre = Duration.fromObject({
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
        let nowY = DateTime.now();
        let countdownYear = Duration.fromObject({
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


const loadCredentials = () => {
    // Load client secrets from a local file.
    try {
        return JSON.parse(fs.readFileSync('credentials.json'));
    } catch (err) {
        console.log('Error loading client secret file:', err);
        throw err;
    }
};
  
const clearRanges = async (rng) => clearRngs(rng, await getAuthClient());
const getValues = async (rng) => getMsgs(rng, await getAuthClient());
const getValue = async (rng) => getMsg(rng, await getAuthClient());
const setValues = async (rng, val) => setMsgs(rng, val, await getAuthClient());
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

const sleep = async (interval) => new Promise((r) => setTimeout(r, interval));

client.login(process.env.TOKEN);