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

const testing = false;

const SOURCE_CHANNELS = [
  { name: 'music', id: '246342398123311104' },
  { name: 'music-meta', id: '763068914480840715' },
  { name: 'skynet', id: '864768873270345788' },
];

const TEST_VOTES = '876135378346733628';
const DOM_VOTES = '751893730117812225';
const CHANNEL_ID = (testing === true ? TEST_VOTES : DOM_VOTES);

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

const compare = (a, b) => {
  if (a.match < b.match) {
    return -1;
  }
  if (a.match > b.match) {
    return 1;
  }
  return 0;
};

// function to fetch the reactions to the most recent message with the specified content
const getChecks = (channel, search) => new Promise((resolve) => {
  const checkMsg = channel.messages.cache.find((m) => m.content.includes(search));
  checkMsg.reactions.cache.first().users.fetch().then((p) => {
    const checks = p.filter((u) => !u.bot).map((user) => ({ user: user.username, id: user.id }));
    resolve(checks);
  });
});

// function that pulls it all together
const checkRound = async (close) => {
  const channel = client.channels.cache.get(CHANNEL_ID);

  // fetch the last 200 messages (this should cover even the longest rounds)
  const messages = await fetchMany(channel, 200);

  // if the most recent round is complete,
  // fetch the reactions from the check-in and check-out messages
  const checkIns = await getChecks(channel, 'if you plan on voting in the');
  const checkOuts = await getChecks(channel, 'you have checked in and are done voting');

  // find the check-ins without check-outs and vice versa, then calculate the pct checked in
  const missing = checkIns.filter((x) => !checkOuts.map((u) => u.user).includes(x.user));
  const missingCount = missing.length;

  const msgDelims = messages.filter((msg) => msg.content.includes('you have checked in and are done voting') && msg.deleted === false);

  // filter all the messages for those between the two most recent delimiters
  const rndMatches = messages.filter((msg) => (
    msg.createdTimestamp < msgDelims.first(2)[0].createdTimestamp
        && msg.createdTimestamp > msgDelims.first(2)[1].createdTimestamp
        && msg.deleted === false && msg.content.includes('Match') && !msg.content.includes('Play')
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
      const c1 = parseInt(Object.values(c[0]).toString());
      const e1 = Object.keys(c[0]).toString();
      const c2 = parseInt(Object.values(c[1]).toString());
      const e2 = Object.keys(c[1]).toString();
      const flippable = Math.abs(c1 - c2) <= missingCount ? 1 : 0;
      const closeOne = Math.abs(c1 - c2) <= 1 ? 1 : 0;
      resultsArray.push({
        flippable,
        closeOne,
        match: parseInt(Object.keys(m)[0]),
        c1,
        e1,
        c2,
        e2,
      });
    });
  });
  resultsArray.sort(compare);

  // announce tie results
  const flipArray = resultsArray.filter((m) => (close === true ? m.closeOne : m.flippable) === 1);

  let msg = 'Flippable Matches:';
  for (const flip of flipArray) {
    const cArr = ['', flip.c1, '', flip.c2];
    const message = rndMatches.find((rm) => parseInt(rm.content.slice(8, rm.content.indexOf(':'))) === parseInt(flip.match));
    const msgA = message.content.replace(/\s-\s<*(https?|ftp):\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?>*[^\n]*/g, '');
    const msgArr = msgA.match(/^[\u200B].*$/gm);
    const matchArr = [];
    msgArr.forEach((song, i) => {
      matchArr.push(`[${cArr[i]}] ${song}`);
    });
    const msgB = `**Match ${flip.match}:**\n${matchArr[1]}\n${matchArr[3]}`;
    msg = `${msg}\n\n${msgB}`;
  }

  if (msg === 'Flippable Matches:') {
    return 'None.';
  }
  // console.log(msg);
  // await musicChan.send(msg);
  return msg;
};
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()
    || !(SOURCE_CHANNELS.find(({ id }) => id === interaction.channel?.id))) return;

  if (interaction.commandName === 'flips') {
    const close = interaction.options.getBoolean('close');

    const msg = await checkRound(close);

    if (typeof msg === 'undefined') {
      await interaction.reply('Oops. Something went wrong.');
    } else {
      await interaction.reply(msg);
    }
  }
});

client.login(process.env.TOKEN);
