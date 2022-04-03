/* eslint-disable no-console */
/* eslint-disable max-len */
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

const MASTER_ID = '1mBjOr2bNpNbPHmRGcPmxpAi3GlF6a5WhtRcjt8TvvP0';
let SPREADSHEET_ID = MASTER_ID;

const YEAR_RANGES = {
  READ_RANGE: 'TestBracket!G2:J',
  WRITE_RANGE: 'TestBracket!J2:J',
  COPY_RANGE: 'TestBracket!I2:I',
  ACTIVE_YEAR: 'Lists!L2',
  TEST_YEAR: 'Lists!L8',
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

const getValues = async (rng, cell = false, ss = SPREADSHEET_ID) => getMsgs(rng, cell, ss, await getAuthClient());

const test = async () => {
  const activeYear = await getValues(YEAR_RANGES.ACTIVE_YEAR, true);
  const testYear = await getValues(YEAR_RANGES.TEST_YEAR, true);

  if (activeYear !== testYear) {
    const oldData = await getValues(YEAR_RANGES.WRITE_RANGE);
    const isUpdated = oldData.map((y) => y[0]).includes(testYear);
    console.log(oldData);
    console.log(isUpdated);
  }
};

test();
