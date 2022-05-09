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

// function that pulls it all together
const checkRound = async () => {
  const channel = client.channels.cache.get(CHANNEL_ID);

  // fetch the last 200 messages (this should cover even the longest rounds)
  fetchMany(channel, 200).then(async (messages) => {
    // isolate the check-out messages and convert to an array
    // const msgDelims = messages.filter((msg) => msg.content.includes('you have checked in and are done voting') && msg.deleted === false);
    // // filter all the messages for those between the two most recent delimiters
    // const rndMatches = messages.filter((msg) => (
    //   msg.createdTimestamp < msgDelims.first(2)[0].createdTimestamp
    //   && msg.createdTimestamp > msgDelims.first(2)[1].createdTimestamp
    //   && msg.deleted === false && msg.content.includes('Match')
    // ));

    // // create an array of the reacted users for each message
    // const rndMatchesResults = await Promise.all(rndMatches.map((rm) => {
    //   const matchReacts = rm.reactions.cache.map(async (r) => {
    //     await r.users.fetch();
    //     return r.users.cache.map((u) => u.username);
    //   });
    //   return Promise.all(matchReacts);
    // }));

    // const rmrMerged = rndMatchesResults.map((mr) => mr[0].concat(mr[1]));
    // // eslint-disable-next-line max-len
    // const missingVoted = await missing.filter((m) => rmrMerged.every((r) => r.includes(m.user)));
    // console.log('Missing Voted:', missingVoted);
    const notifiedMessage = messages.find((msg) => msg.content.includes('Missing Check-Outs:'));
    console.log(notifiedMessage);
    // if (notifiedMessage) {
    //   await notifiedMessage.mentions.users.fetch();
    //   const notifiedMentions = notifiedMessage.mentions.users.cache.map((u) => u.username);
    //   console.log(notifiedMentions);
    //   // eslint-disable-next-line max-len
    //   missingVoted.filter((mv) => !notifiedMentions.includes(mv.map((mmvv) => mmvv.username)));
    //   console.log('Filtered MV:', missingVoted);
    // }
    // // eslint-disable-next-line max-len
    // const deadbeatTagList = await missingVoted.map((u) => `<@!${u.id}>`).join(', ');
    // console.log(deadbeatTagList);
    // let msg = `Missing Check-Outs: ${deadbeatTagList}`;

    // if (missingVoted.length > 0) {
    //   await musicChan.send(msg);
    //   if (testing === false) { await testMusic.send(msg); }
    // }

    // msg = 'Awaiting 80%.';
    // testMusic.send(msg);
    // // console.log(msg);
    // console.log(`${(pctCheckedIn * 100).toFixed(1)}%`);
    // console.log('MaxWarn:', roundEndTime.plus({ hours: roundMaxWarn }).toFormat('M/d/yyyy HH:mm'));
    // console.log('Missing:', missingList);
    // console.log('Extra:', extraList);
  });
};

client.once('ready', () => {
  console.log('Ready!');
});

client.on('ready', async () => {
  await checkRound();
});

client.login(process.env.TOKEN);
