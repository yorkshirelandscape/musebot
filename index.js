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
	let botStat = "Dashboard!B3";
	let header = '';
	let footer = '';
	let match = '';
  
	let now = new Date();
	let sixam = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0);
	let tenpm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0, 0);

	// setInterval( postMatch(), 7200000 );
	// postMatch;

	match = getValue("Dashboard!D3:E6");
	console.log(match);
	
	// function postMatch() {
	// 	if (now >= sixam && now <= tenpm && getValue(botStat) === 'GO' ) {
			
	// 		header = getValue("Dashboard!D1");
	// 		footer = getValue("Dashboard!D8");
	// 		match = getValue("Dashboard!D3:E6");
			
	// 		if (header != '') { 
	// 			console.log(header);
	// 			// channel.send(header); 
	// 		}
		
	// 		// sng.setValue(sng.getValue() + 1);
	// 		console.log(match);
	// 		// channel.send(match);
	
	// 		if (footer != '') { 
	// 			console.log(footer);
	// 			//   channel.send(footer);
	// 			//   rnd.setValue('R' + rnd.getValue().slice(1) + 1);
	// 			//   sng.setValue(1);
	// 			//   botStat.setValue('STOP');
	// 		}
	// 	}
	// }

	async function getValue(rng) {
		// Load client secrets from a local file.

		// fs.readFile('credentials.json', (err, content) => {
		// 	if (err) return console.log('Error loading client secret file:', err);
		// 	// Authorize a client with credentials, then call the Google Sheets API.
		// 	var val = authorize(JSON.parse(content), rng, getMsg);
		// });

		try {
			let content = fs.readFileSync('credentials.json')
			var val = await authorize(JSON.parse(content), rng, getMsg);
		  } catch (err) {
			return console.log('Error loading client secret file:', err);
		  }

		console.log(val);
		return val;

	}
});


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, rng, callback) {
		const {client_secret, client_id, redirect_uris} = credentials.installed;
		const oAuth2Client = new google.auth.OAuth2(
			client_id, client_secret, redirect_uris[0]);

		// Check if we have previously stored a token.
		//   fs.readFile(TOKEN_PATH, (err, token) => {
		//     if (err) return getNewToken(oAuth2Client, callback);
		//     oAuth2Client.setCredentials(JSON.parse(token));
		//   });

		try {
			let token = fs.readFileSync(TOKEN_PATH)
			oAuth2Client.setCredentials(JSON.parse(token));
		} catch (err) {
			resolve(getNewToken(oAuth2Client, callback));
			// return getNewToken(oAuth2Client, callback);
		}

		return await callback(rng, oAuth2Client);
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


function getMsg(rng, auth) {
	return new Promise(resolve => {
		const sheets = google.sheets({version: 'v4', auth});
		var msg = '';
		sheets.spreadsheets.values.get({
		spreadsheetId: '1qQBxqku14GTL70o7rpLEQXil1ghXEHff7Qolhu0XrMs',
		range: rng,
		}, (err, res) => {
		if (err) return console.log('The API returned an error: ' + err);
		const rows = res.data.values;
		if (rows.length) {
			// Print columns A and E, which correspond to indices 0 and 4.
			rows.map((row) => {
				msg = msg.concat('\n',`${row[0]} ${(row[1] || '')}`);
			});
		} else {
			msg = '';
			console.log('No data found.');
		}
		resolve(msg);
		});
	});
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