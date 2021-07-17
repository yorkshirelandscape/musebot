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

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
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
      callback(oAuth2Client);
    });
  });
}


client.once('ready', () => {
	console.log('Ready!');
});

client.on('ready', () => {
	const channel = client.channels.cache.get('864768873270345788'); //751893730117812225
	postMsg('Dashboard!D3:E6');
	// setInterval( postMsg('Dashboard!D3:E6'), 7200000);

	function postMsg(rng) {
		// Load client secrets from a local file.
		fs.readFile('credentials.json', (err, content) => {
			if (err) return console.log('Error loading client secret file:', err);
			let msg = getValue(rng);
			// Authorize a client with credentials, then call the Google Sheets API.
			authorize(JSON.parse(content), channel.send(msg));
		});
	}

});



function getValue(rng) {
	const sheets = google.sheets({version: 'v4', auth});
	let msg = '';
	sheets.spreadsheets.values.get({
	  spreadsheetId: '1qQBxqku14GTL70o7rpLEQXil1ghXEHff7Qolhu0XrMs',
	  range: rng,
	}, (err, res) => {
	  if (err) return console.log('The API returned an error: ' + err);
	  const rows = res.data.values;
	  if (rows.length) {
		// Print columns A and E, which correspond to indices 0 and 4.
		rows.map((row) => {
			msg = msg.concat('\n',`${row[0]} ${row[1]}`);
		});
	  } else {
		msg = '';
		console.log('No data found.');
	  }
	});
	return msg;
  }





const dismoji = require('discord-emoji');
var result = [];

var emoji1
var emoji2

client.on('message', message => {

	if (message.channel.name === 'music-votes') {

	// console.log(message.content);

	const enm = require("emoji-name-map");
	const one = enm.get('one');
	const two = enm.get('two');

	let e1 = [];
	let e2 = [];

	e1 = message.content.match(/:.+?:/g);
	// console.log(e1);
	if (e1) { 
		e1.forEach( e => {
			e2.push( {name: e.match(/[a-zA-Z0-9_]+/g).toString(), id: null, unicode: null} );
		})
	}
	// console.log(e2);
	if (e2) {
		e2.forEach( e => {
			try {
				e.id = client.emojis.cache.find(emoji => emoji.name === e.name);
			} catch (err) {
				console.log(err);
			};
			try {
				// e.unicode = enm.get(e.name);
				result = [];
				getNames(dismoji, e.name);
				e.unicode = result[0].toString();
			} catch (err) {
				console.log(err);
			}
		})
	}
	// console.log(e2);
	if (e2) {
		let i = 0;
		e2.forEach( e => {
			if (typeof e.id != 'undefined') {
				message.react(e.id);
			} else if (typeof e.unicode != 'undefined' ) {
				message.react(e.unicode);
			} else { message.react( i === 0 ? one : two ) };
			i++;
		})
	}
	}
});

function getNames(obj, name) {
	for (var key in obj) {
	  if (obj.hasOwnProperty(key)) {
		if ("object" == typeof(obj[key])) {
		  getNames(obj[key], name);
		} else if (key == name) {
		  result.push(obj[key]);
		}
	  }
	}
  }

client.login(process.env.TOKEN);