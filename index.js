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
const enm = require("emoji-name-map");
const one = enm.get('one');
const two = enm.get('two');

client.once('ready', () => {
	console.log('Ready!');
});

client.on('ready', () => {
	const guild = client.guilds.cache.get("212660788786102272"); //782213860337647636
	const channel = client.channels.cache.get('864768873270345788'); //751893730117812225

	let rnd = "Dashboard!B2";
	let sng = "Dashboard!B3";
	let botStat = "Dashboard!B4";
	let header = 'Dashboard!D1';
	let footer = 'Dashboard!D8';
	let match = 'Dashboard!D3:E6';
	
	let now = new Date();
	let sixam = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0, 0);
	let tenpm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0, 0);

	getValue(botStat).then(function(bStat) {

		if (now >= sixam && now <= tenpm && bStat === 'GO' ) {

			let rngArr = [rnd, sng, header, footer, match];

			getValues(rngArr).then((val) => {
				let rndVal = val[0].values[0].toString();
				let sngVal = parseInt(val[1].values[0].toString());
				let headVal = ('values' in val[2] ) ? val[2].values[0].toString() : null;
				let footVal = ('values' in val[3] ) ? val[3].values[0].toString() : null;
				
				if (headVal ? true : false) { channel.send(headVal); }

				let matchArr = [];
				val[4].values.forEach((row) => {
					matchArr.push(row[0] + ((typeof row[1] != 'undefined') ? ` ${row[1]}` : '') );
				});
				matchStr = matchArr.join('\n');
				let eMatch = matchStr.match(/:.+?:/g);
				let eCustom = [];
				if (eMatch) { 
					eMatch.forEach( eM => {
						eCustom.push( {text: eM, name: eM.match(/[a-zA-Z0-9_]+/g).toString()} );
					});
					if (eCustom) {
						(function eCust() {
							return new Promise(resolve => {
								eCustom.forEach( eC => {
									// console.log(eC);
									customEmoji(eC.name).then((eRes) => {
										// console.log(eRes);
										try {
											eC.id = eRes.id;
										} catch (err) { 
											console.log(err);
										}
									});
								});
							resolve(eCustom);
							});	
						})().then(function(eC1) {
							return new Promise(resolve => {
								let eC2 = eC1.filter( function(eCSet){
									return eCSet.hasOwnProperty('id');
								})
								resolve(eC2);
							});
						}).then(function(eC3) {
							return new Promise(resolve => {
								console.log(eC3);
								eC3.forEach( eC4 => {
									matchStr.replace(eC4.text, `<${eC4.text}${eC4.id}>`);
								});
								resolve(matchStr);
							});
						}).then((mStr) => {
							console.log(mStr);
							if (mStr ? true : false ) {
								channel.send(mStr).then((sent) => {
									let emo = emote(mStr);
									if (emo) {
										let i = 0;
										emo.forEach( e => {
											if (typeof e.id != 'undefined') {
												sent.react(e.id);
											} else if (typeof e.unicode != 'undefined' ) {
												sent.react(e.unicode);
											} else { sent.react( i === 0 ? one : two ) };
											i++;
										})
									}
								});
								console.log(sngVal);					
								sngVal = sngVal + 1;
								setValue(sng, sngVal).then((val) => {
									console.log(val);
								});
							}
						});
					}
				}

				if (footVal ? true : false) { 
					channel.send(footVal).then((sent) => {
						let emo = emote(footVal);
						if (emo) {
							let i = 0;
							emo.forEach( e => {
								if (typeof e.id != 'undefined') {
									sent.react(e.id);
								} else if (typeof e.unicode != 'undefined' ) {
									sent.react(e.unicode);
								} else { sent.react( i === 0 ? one : two ) };
								i++;
							})
						}
					});
					if (typeof rndVal != 'undefined') { 
						rndVal = 'R' + (parseInt(rndVal.slice(1,2)) + 1);
						setValue(rnd, rndVal).then((val) => {
							console.log(val);
						});
					}
					setValue(sng, 1).then((val) => {
						console.log(val);
					});
					setValue(botStat, 'STOP').then((val) => {
						console.log(val);
					});
				}
			});
		}
	});
	
	function customEmoji(emoName) {
		return new Promise(resolve => {
			try {
				// console.log(guild.emojis.cache.find(ident => ident.name === emoName));
				resolve( guild.emojis.cache.find(ident => ident.name === emoName) );
			} catch (err) {
				console.log('Not a custom emoji.');
				resolve(null);
			};			
		});
	}
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


function getValues(rng) {
	return new Promise(resolve => {
		// Load client secrets from a local file.
		try {
			var content = JSON.parse(fs.readFileSync('credentials.json'))
		} catch (err) {
			resolve(console.log('Error loading client secret file:', err));
		}
		resolve( authorize(content).then((auth) => getMsgs(rng, auth)) );
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

async function getMsgs(rng, auth) {
	const sheets = google.sheets({version: 'v4', auth});
	try {
	  var response = await sheets.spreadsheets.values.batchGet({
		spreadsheetId: '1qQBxqku14GTL70o7rpLEQXil1ghXEHff7Qolhu0XrMs',
		ranges: rng,
	  })
	} catch (err) {
	  console.log('The API returned an error: ' + err);
	  throw(err);
	}
	return response.data.valueRanges;
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



var result = [];

var emoji1
var emoji2

function emote(e) {
	let e1 = [];
	let e2 = [];

	e1 = e.match(/:.+?:/g);
	// console.log(e1);
	if (e1) { 
		e1.forEach( e => {
			e2.push( {name: e.match(/[a-zA-Z0-9_]+/g).toString(), id: null, unicode: null} );
		})
	}

	if (e2) {
		e2.forEach( e => {
			try {
				e.id = client.emojis.cache.find(emoji => emoji.name === e.name);
			} catch (err) {
				console.log(err);
			};
			try {
				result = [];
				getNames(dismoji, e.name);
				e.unicode = result[0].toString();
			} catch (err) {
				console.log('Custom or missing emoji');
			}
		})
	}

	let eArr = [];
	if (e2) {
		e2.forEach( e => {
			eArr.push(e);
		});
	}
	return eArr;
}

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