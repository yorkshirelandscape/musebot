/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
/* eslint-disable radix */
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

let testing = false;
let once = false;

process.argv.forEach((val) => {
  // if (val === '-s') { skipstat = true; }
  if (val === '-t') { testing = true; }
  if (val === '-o') { once = true; }
});

const SKYNET = '864768873270345788';
const TEST_VOTES = '876135378346733628';
const DOM_MUSIC = '246342398123311104';
const DOM_VOTES = '751893730117812225';
const CHANNEL_ID = (testing === true ? TEST_VOTES : DOM_VOTES);
const MUSIC_ID = (testing === true ? SKYNET : DOM_MUSIC);

const SPREADSHEET_ID = (testing === true ? '1-xVpzfIVr76dSuJO8SO-Im55WQZd0F07IQNt-hhu_po' : '1qQBxqku14GTL70o7rpLEQXil1ghXEHff7Qolhu0XrMs');

const { DateTime } = require('luxon');

const { Duration } = require('luxon');

let now = DateTime.now();

// function to fetch more than the limit of 100 messages
async function fetchMany(channel, limit = 150) {
  let sumMessages = await channel.messages.fetch({ limit: 100 });
  let lastId = sumMessages.last().id;
  let lim = Math.max(0, limit - 100);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const options = { limit: lim };
    if (lastId) {
      options.before = lastId;
    }

    // eslint-disable-next-line no-await-in-loop
    const msgs = await channel.messages.fetch(options);
    lim = Math.max(0, lim - lim);
    sumMessages = sumMessages.concat(msgs);
    lastId = msgs.last().id;

    if (lim === 0 || msgs.size !== 100 || sumMessages.length >= limit) {
      break;
    }
  }

  return sumMessages;
}

// function to feath the reactions to the most recent message with the specified content
const getChecks = (channel, search) => new Promise((resolve) => {
  const checkMsg = channel.messages.cache.find((m) => m.content.includes(search));
  checkMsg.reactions.cache.first().users.fetch().then((p) => {
    const checks = p.filter((u) => !u.bot).map((user) => ({ user: user.username, id: user.id }));
    resolve(checks);
  });
});

const sleep = async (interval) => { await new Promise((r) => setTimeout(r, interval)); };

const compare = (a, b) => {
  if (a.match < b.match) {
    return -1;
  }
  if (a.match > b.match) {
    return 1;
  }
  return 0;
};

// function that pulls it all together
const checkRound = async () => {
  const botState = await getValue(BOT_STATE_REF);
  const channel = client.channels.cache.get(CHANNEL_ID);
  const musicChan = client.channels.cache.get(MUSIC_ID);
  const testChan = client.channels.cache.get(TEST_VOTES);
  const testMusic = client.channels.cache.get(SKYNET);

  const recentSkynet = await testMusic.messages.fetch({ limit: 1 });
  const warnMsg = await recentSkynet.find((msg) => msg.content.includes('One-Hour Warning'));

  if (botState === 'STOP' && !warnMsg) {
    // Even though REFS is an object, order is guaranteed for non-string keys
    const valueRanges = await getValues(Object.values(REFS));

    const round = valueRanges[0].values[0].toString();
    const size = parseInt(valueRanges[5].values[0].toString());
    // const year = parseInt(valueRanges[6].values[0].toString());
    const rndVal = parseInt(round.slice(1));

    // fetch the last 150 messages (this should cover even the longest rounds)
    fetchMany(channel, 200).then(async (messages) => {
      // of those, find the most recent messages that begin and end a round
      const roundStart = await messages.find((msg) => msg.content.includes('Begins————'));
      const roundEnd = await messages.find((msg) => msg.content.includes('you have checked in and are done voting'));

      // if the most recent round is complete,
      // fetch the reactions from the check-in and check-out messages
      if (roundStart.createdTimestamp < roundEnd.createdTimestamp) {
        const checkIns = await getChecks(channel, 'if you plan on voting');
        const checkOuts = await getChecks(channel, 'you have checked in and are done voting');

        // find the check-ins without check-outs and vice versa, then calculate the pct checked in
        const missing = checkIns.filter((x) => !checkOuts.map((u) => u.user).includes(x.user));
        const missingList = missing.map((u) => u.user).join(', ');
        const missingTagList = missing.map((u) => `<@!${u.id}>`).join(', ');
        const extra = checkOuts.filter((x) => !checkIns.map((u) => u.user).includes(x.user));
        const extraList = extra.map((u) => u.user).join(', ');
        const extraTagList = extra.map((u) => `<@!${u.id}>`).join(', ');
        const pctCheckedIn = (checkOuts.length - extra.length) / checkIns.length;

        const roundEndTime = DateTime.fromMillis(roundEnd.createdTimestamp);

        // calculate round limits
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

        const roundMinWarn = roundMin - 1;
        let roundMaxWarn = roundMax - 1;

        if (roundEndTime.plus({ hours: roundMax }) > 20
          || roundEndTime.plus({ hours: roundMax }) < 5) {
          now = DateTime.now();
          const tmrwStart = DateTime.now();
          tmrwStart.plus({ days: 1 });
          tmrwStart.set({ hour: 5 });
          tmrwStart.set({ minute: 0 });
          tmrwStart.set({ millisecond: 0 });
          roundMaxWarn += tmrwStart.diff(roundEndTime, 'hours');
        }

        // if 80% are checked in and the round is half over OR
        // the round has one hour left to go, issue the 1-hour warning
        now = DateTime.now();
        if ((pctCheckedIn >= 0.8 && now > roundEndTime.plus({ hours: roundMinWarn }))
            || now > roundEndTime.plus({ hours: roundMaxWarn })) {
          if (pctCheckedIn < 1) {
            const msg = `One-Hour Warning
              ${(pctCheckedIn * 100).toFixed(1)}% checked in.
              Missing: ${missingTagList}
              ${extraTagList ? `\nExtra: ${extraTagList}` : ''}`;
            await musicChan.send(msg);
            await testMusic.send(msg);

            // wait an hour for the round to end, then tabulate the results
            await sleep(60 * 60 * 1000);
          }

          await musicChan.send('Round concluded. Tabulating votes.');
          await testMusic.send('Round concluded. Tabulating votes.');

          // fetch 100 most recent messages (not necessary, but I wrote this out of order)
          const roundMessages = await channel.messages.fetch({ limit: 100 });

          // isolate the check-out messages and convert to an array
          const msgDelims = roundMessages.filter((msg) => msg.content.includes('you have checked in and are done voting') && msg.deleted === false);
          // filter all the messages for those between the two most recent delimiters
          const rndMatches = roundMessages.filter((msg) => (
            msg.createdTimestamp < msgDelims.first(2)[0].createdTimestamp
            && msg.createdTimestamp > msgDelims.first(2)[1].createdTimestamp
            && msg.deleted === false && msg.content.includes('Match')
          ));
          // create an array of the reaction counts for each message
          const rndMatchesResults = [];
          rndMatches.forEach((rm) => {
            const matchNo = parseInt(rm.content.slice(8, rm.content.indexOf(':')));
            const matchReacts = [];
            rm.reactions.cache.forEach((r) => {
              const emoKey = r.emoji.id ? `<:${r.emoji.name}:${r.emoji.id}>` : r.emoji.name;
              matchReacts.push({ [emoKey]: r.count });
            });
            rndMatchesResults.push({ [matchNo]: matchReacts });
          });

          // format the results array properly
          const resultsArray = [];
          rndMatchesResults.forEach((m) => {
            Object.values(m).forEach((c) => {
              const tieRand = Math.round(Math.random());
              const tieEmoji = Object.keys(c[tieRand]).toString();
              const tieC1 = parseInt(Object.values(c[0]).toString());
              const tieC2 = parseInt(Object.values(c[1]).toString());
              const tie = tieC1 === tieC2 ? 1 : 0;
              resultsArray.push({
                c1: tie === 1 && tieRand === 0 ? tieC1 + 1 : tieC1,
                c2: tie === 1 && tieRand === 1 ? tieC2 + 1 : tieC2,
                tie,
                match: Object.keys(m)[0],
                winner: tie === 1 ? tieRand + 1 : 0,
                emoji: tie === 1 ? tieEmoji : null,
              });
            });
          });
          resultsArray.sort(compare);

          if (round === '3P') {
            const pushArray1 = [];
            const pushArray2 = [];
            resultsArray.first().forEach((r) => {
              pushArray1.push([r.c1, r.c2, r.tie]);
            });
            resultsArray.last().forEach((r) => {
              pushArray2.push([r.c1, r.c2, r.tie]);
            });

            // set the range to push the results to and push them
            let resultsRange = 'R6!K2:M2';
            await setValues(resultsRange, pushArray1);
            resultsRange = '3P!K2:M2';
            await setValues(resultsRange, pushArray2);
          } else {
            const pushArray = [];
            resultsArray.forEach((r) => {
              pushArray.push([r.c1, r.c2, r.tie]);
            });

            // set the range to push the results to and push them
            const lastRound = parseInt(round.slice(1)) - 1;
            const resultsRange = `R${lastRound}!K2:M${(2 ** (7 - rndVal)) + 1}`;
            await setValues(resultsRange, pushArray);
          }
          await setValue(BOT_STATE_REF, 'GO');

          // announce tie results
          const tiesArray = resultsArray.filter((m) => m.tie === 1);

          if (tiesArray.length > 0) {
            await musicChan.send('Settling ties.');
            await testChan.send('Settling ties.');
            tiesArray.forEach(async (t) => {
              const message = await rndMatches.find((msg) => parseInt(msg.content.slice(8, msg.content.indexOf(':'))) === parseInt(t.match));
              await musicChan.send(message.content.replace('**Match', '**Tie'));
              await testMusic.send(message.content.replace('**Match', '**Tie'));
              await sleep(5 * 1000);
              await musicChan.send(`Winner: ${t.emoji}`);
              await testMusic.send(`Winner: ${t.emoji}`);
              await sleep(3 * 1000);
            });
          }

          if (round !== '3P') {
            let msg = '';
            if (roundEndTime.plus({ hours: roundMax }) > 20
              || roundEndTime.plus({ hours: roundMax }) < 5) {
              now = DateTime.now();
              const tomorrow = now.plus({ days: 1 });
              const fiveamtomorrow = DateTime.fromObject({
                year: tomorrow.year,
                month: tomorrow.month,
                day: tomorrow.day,
                hour: 5,
              });
              msg = `The next round will begin at <t:${fiveamtomorrow.valueOf() / 1000}:F>`;
            } else {
              now = DateTime.now();
              const resumeTime = Duration.fromObject({
                hours: 1 - (now.hour % 2),
                minutes: 60 - now.minute,
              }).toFormat('h m');
              msg = `The next round will begin in ${resumeTime.hours > 0 ? `${resumeTime.hours}h` : ''}${resumeTime.minutes}m.`;
            }
            await musicChan.send(msg);
            await testChan.send(msg);
          }
        } else if (now < roundEndTime.plus({ hours: roundMinWarn })) {
          console.log('Awaiting minimum time elapsed.');
          console.log(roundEndTime.plus({ hours: roundMinWarn }).toFormat('M/d/yyyy HH:mm'));
        } else {
          console.log('Awaiting 80%.');
          console.log(`${(pctCheckedIn * 100).toFixed(1)}%`);
          console.log(roundEndTime.plus({ hours: roundMinWarn }).toFormat('M/d/yyyy HH:mm'));
          console.log('Missing:', missingList);
          console.log('Extra:', extraList);
        }
      } else { console.log('Round in progress.'); }
    });
  } else { console.log('Bot enabled. Round in progress?'); }
};

client.once('ready', () => {
  console.log('Ready!');
});

client.on('ready', async () => {
  if (once === true) {
    await checkRound();
    // client.destroy();
  } else {
    // run every half hour at quarter after and quarter to
    now = DateTime.now();
    const countdown = Duration.fromObject({
      minutes: 30 - ((now.minute + 15) % 30),
      seconds: 60 - now.second,
    });
    console.log(`${now.toFormat('M/d/yyyy HH:mm')}: Triggering in ${(countdown.minutes)} minutes`);
    setTimeout(() => {
      checkRound();
      setInterval(checkRound, 60 * 30 * 1000);
    }, countdown.toMillis());
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

client.login(process.env.TOKEN);
