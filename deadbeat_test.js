/* eslint-disable max-len */
/* eslint-disable no-unreachable */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
/* eslint-disable radix */
const dotenv = require('dotenv');

dotenv.config();

const { Client, Intents, Collection } = require('discord.js');

const client = new Client({
  intents:
  [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MEMBERS],
});

let testing = false;

process.argv.forEach((val) => {
  // if (val === '-s') { skipstat = true; }
  if (val === '-t') { testing = true; }
});

const SKYNET = '864768873270345788';
const TEST_VOTES = '876135378346733628';
const DOM_MUSIC = '246342398123311104';
const DOM_VOTES = '751893730117812225';
const CHANNEL_ID = (testing === true ? TEST_VOTES : DOM_VOTES);
const MUSIC_ID = (testing === true ? SKYNET : DOM_MUSIC);

// function to fetch more than the limit of 100 messages
async function fetchMany(channel, limit = 250) {
  if (!channel) {
    throw new Error(`Expected channel, got ${typeof channel}.`);
  }
  if (limit <= 100) {
    return channel.messages.fetch({ limit });
  }

  let collection = new Collection();
  let lastId = null;
  const options = {};
  let remaining = limit;

  while (remaining > 0) {
    options.limit = remaining > 100 ? 100 : remaining;
    remaining = remaining > 100 ? remaining - 100 : 0;

    if (lastId) {
      options.before = lastId;
    }

    // eslint-disable-next-line no-await-in-loop
    const messages = await channel.messages.fetch(options);

    if (!messages.last()) {
      break;
    }

    collection = collection.concat(messages);
    lastId = messages.last().id;
  }

  return collection;
}

// function to fetch the reactions to the most recent message with the specified content
const getChecks = (channel, search) => new Promise((resolve) => {
  const checkMsg = channel.messages.cache.find((m) => m.content.includes(search));
  checkMsg.reactions.cache.first().users.fetch().then((p) => {
    const checks = p.filter((u) => !u.bot).map((user) => ({ user: user.username, id: user.id }));
    resolve(checks);
  });
});

// function that pulls it all together
const checkRound = async () => {
  const channel = client.channels.cache.get(CHANNEL_ID);
  const musicChan = client.channels.cache.get(MUSIC_ID);
  const testMusic = client.channels.cache.get(SKYNET);

  // fetch the last 200 messages (this should cover even the longest rounds)
  const messages = await fetchMany(channel, 200);
  // if the most recent round is complete,
  // fetch the reactions from the check-in and check-out messages

  const checkIns = await getChecks(channel, 'if you plan on voting in the');
  console.log('CheckIns:', checkIns);
  const checkOuts = await getChecks(channel, 'you have checked in and are done voting');
  console.log('CheckOuts:', checkOuts);

  // find the check-ins without check-outs and vice versa, then calculate the pct checked in
  const missing = await checkIns.filter((x) => !checkOuts.map((u) => u.user).includes(x.user));

  console.log('Missing:', missing);

  // isolate the check-out messages and convert to an array
  const msgDelims = await messages.filter((msg) => msg.content.includes('you have checked in and are done voting') && msg.deleted === false);
  // filter all the messages for those between the two most recent delimiters
  const rndMatches = await messages.filter((msg) => (
    msg.createdTimestamp < msgDelims.first(2)[0].createdTimestamp
      && msg.createdTimestamp > msgDelims.first(2)[1].createdTimestamp
      && msg.deleted === false && msg.content.includes('Match')
  ));

  // create an array of the reacted users for each message
  const rndMatchesResults = await Promise.all(rndMatches.map((rm) => {
    const matchReacts = rm.reactions.cache.map(async (r) => {
      await r.users.fetch();
      return r.users.cache.map((u) => u.username);
    });
    return Promise.all(matchReacts);
  }));

  const rmrMerged = rndMatchesResults.map((mr) => mr[0].concat(mr[1]));
  const missingVoted = await missing.filter((m) => rmrMerged.every((r) => r.includes(m.user)));
  console.log('Missing Voted:', missingVoted);
  const deadbeatTagList = await missingVoted.map((u) => `<@!${u.id}>`).join(', ');
  const msg = `Missing Check-Outs: ${deadbeatTagList}`;

  if (missingVoted.length > 0) {
    await musicChan.send(msg);
    if (testing === false) { await testMusic.send(msg); }
  }
};

client.once('ready', () => {
  console.log('Ready!');
});

client.on('ready', async () => {
  await checkRound();
});

client.login(process.env.TOKEN);
