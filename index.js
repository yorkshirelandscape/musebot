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

client.once('ready', () => {
	console.log('Ready!');
});

client.on('ready', () => {
	const channel = client.channels.cache.get('864768873270345788'); //751893730117812225

	let rnd = "Dashboard!B2";
	let sng = "Dashboard!B3";
	let botStat = "Dashboard!B4";
	let header = 'Dashboard!D1';
	let footer = 'Dashboard!D8';
	let match = 'Dashboard!D3:E6';
	
	let now = new Date();
	let sixam = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0);
	let tenpm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0, 0);

	getValue(botStat).then(function(bStat) {

		if (now >= sixam && now <= tenpm && bStat === 'GO' ) {
		
			getValue(header).then((val) => {
					if (typeof val != 'undefined') { channel.send(val); }
				});
			

			getValue(match).then((val) => {
					console.log(val);
					// channel.send(val);
				});
			var sngVal;
			getValue(sng).then((val) => {
					if (typeof val != 'undefined') { 
						sngVal = parseInt(val) + 1;
						setValue(sng, sngVal).then((val) => {
							console.log(val);
						});
					 }
				});

				
			getValue(footer).then((val) => {
				if (typeof val != 'undefined') { 
					channel.send(val); 
					// rnd.setValue('R' + rnd.getValue().slice(1) + 1);
					// sng.setValue(1);
					// botStat.setValue('STOP');
				}
			});
		}
	});
});


function getValue(rng) {
	return new Promise(resolve => {
		// Load client secrets from a local file.
		try {
			var content = JSON.parse(fs.readFileSync('credentials.json'))
		} catch (err) {
			resolve(console.log('Error loading client secret file:', err));
		}
		resolve( authorize(content).then((auth) => getMsg(rng, auth)) );
	});
}


function setValue(rng, val) {
	return new Promise(resolve => {
		// Load client secrets from a local file.
		try {
			var content = JSON.parse(fs.readFileSync('credentials.json'))
		} catch (err) {
			resolve(console.log('Error loading client secret file:', err));
		}
		resolve( authorize(content).then((auth) => setMsg(rng, val, auth)) );
	});
}


async function authorize(credentials) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  try {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
  } catch (err) {
    await getNewToken(oAuth2Client);
  }
  return oAuth2Client;
}


async function getNewToken(oAuth2Client) {
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


async function getMsg(rng, auth) {
  const sheets = google.sheets({version: 'v4', auth});
  try {
    var response = await sheets.spreadsheets.values.get({
      spreadsheetId: '1qQBxqku14GTL70o7rpLEQXil1ghXEHff7Qolhu0XrMs',
      range: rng,
    })
  } catch (err) {
    console.log('The API returned an error: ' + err);
    throw(err);
  }

  var msg;
  var msgArr = [];

  const rows = response.data.values;
  if (typeof rows != 'undefined') {
    // Print columns A and E, which correspond to indices 0 and 4.
    rows.map((row) => {
		msgArr.push(row[0] + ((typeof row[1] != 'undefined') ? ` ${row[1]}` : '') );
    });
	msg = msgArr.join('\n');
  } else {
    console.log('No data found.');
  }
  return msg;
}


async function setMsg(rng, val, auth) {
	const sheets = google.sheets({version: 'v4', auth});
	try {
	  var confirm = await sheets.spreadsheets.values.update( {
		spreadsheetId: '1qQBxqku14GTL70o7rpLEQXil1ghXEHff7Qolhu0XrMs',
		range: rng,
		valueInputOption: 'USER_ENTERED',
		resource: {
			majorDimension: 'ROWS',
			values: [[val]]
		}
	  });
	} catch (err) {
	  console.log('The API returned an error: ' + err);
	  throw(err);
	}
	return confirm.config.data.values[0];
  }

client.login(process.env.TOKEN);