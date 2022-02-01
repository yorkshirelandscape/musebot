const dotenv = require('dotenv');

dotenv.config();

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

const HISTORICAL_ID = '1MkRLpTvUiB5yKtRCexD7ooC0dbeUBrrQjrLyAocaT-4';
let SPREADSHEET_ID = HISTORICAL_ID;

const Discogs = require('disconnect').Client;

const disc = new Discogs('MuseBot/1.0', { userToken: process.env.DISCOGS }).database();

const RANGES = {
    READ_RANGE: 'Discogs!E2:F',
    WRITE_RANGE: 'Discogs!G2:H',
    COPY_RANGE: 'Discogs!D2:D'
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
  
const clearRanges = async (rng) => clearRngs(rng, await getAuthClient());

const getValue = async (rng) => getMsg(rng, await getAuthClient());

const getValues = async (rng) => getMsgs(rng, await getAuthClient());

const setValue = async (rng, val) => setMsg(rng, val, await getAuthClient());

const setValues = async (rng, val) => setMsgs(rng, val, await getAuthClient());

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

const sleep = async (interval) => new Promise((r) => setTimeout(r, interval));

const genreCall = async () => {
    const releases = await getValues(RANGES.READ_RANGE);

    await clearRanges(RANGES.COPY_RANGE);
    
    await setValues(RANGES.COPY_RANGE, releases[0].values.map( row => [row[0]]));

    const results = [];

    for (const r of Object.values(releases[0].values)) {
        console.log(r[1], r[0]);
        const data = await disc.search({artist: r[1], track: r[0], type: 'release', sort: 'year', sort_order: 'asc'});

        const sortMap = data.results.sort((x, y) => {
            // const n = x.year - y.year;
            // if (n !== 0) {
            //   return n;
            // }
            return y.community.have - x.community.have;
        });
          
        // const filtArr = sortMap.filter((r) => (
        // !r.format.includes('Unofficial Release')
        //     && !r.format.includes('Promo')
        //     && !r.format.includes('EP')
        //     && !r.format.includes('Test Pressing')
        //     // && !r.format.includes('EP')
        //     && (r.format.includes('Album')
        //     || r.format.includes('Single')
        //     || r.format.includes('Compilation'))
        // ));

        // console.log(filtArr[0]);

        if (sortMap.length === 0) {
            console.log('No match.');
            results.push([r[1], 0, '', '']);
        } else {
            const {
                // eslint-disable-next-line camelcase
                title, year, genre, style, master_url, cover_image,
              } = sortMap[0];
      
              // console.log(`${title}\n${year}\n${genre}\n${style}`);
      
              results.push([title, year, genre.join(';'), style.join(';')]);
        }
        
        await sleep(1000);
    };

    const write_results = results.map( row => [row[2],row[3]]);

    await setValues(RANGES.WRITE_RANGE, write_results);    

}

genreCall();


