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
  [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
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

const deadbeats = async () => {
  const channel = client.channels.cache.get(CHANNEL_ID);
  const musicChan = client.channels.cache.get(MUSIC_ID);

  // fetch 200 most recent messages
  const roundMessages = await fetchMany(channel, 200);

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
  rndMatches.each((rm) => {
    const matchReacts = [];
    rm.reactions.cache.each(async (r) => {
      await r.users.fetch();
      r.users.cache.each((u) => matchReacts.push(u.username));
    });
    rndMatchesResults.push(matchReacts);
  });

  const checkIns = await getChecks(channel, 'if you plan on voting in the');
  const checkOuts = await getChecks(channel, 'you have checked in and are done voting');

  // find the check-ins without check-outs and vice versa, then calculate the pct checked in
  const missing = checkIns.filter((x) => !checkOuts.map((u) => u.user).includes(x.user));

  const missingVoted = [];
  rndMatchesResults.forEach((m) => {
    const arr = m.filter((u) => missing.map((mu) => mu.user).includes(u));
    missingVoted.push(arr);
  });

  const checkOutCheck = missing.map((m) => (
    { user: m.user, id: m.id, missing: missingVoted.every((mv) => mv.includes(m.user)) }
  ));
  const missingCheckOut = checkOutCheck.filter((u) => u.missing);
  const deadbeatTagList = missingCheckOut.map((u) => `<@!${u.id}>`).join(', ');
  await musicChan.send(`Missing Check-Outs: ${deadbeatTagList}`);
};

client.once('ready', () => {
  console.log('Ready!');
});

client.on('ready', async () => {
  deadbeats();
});

client.login(process.env.TOKEN);
