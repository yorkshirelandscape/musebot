import MuseDiscord from '../discord/muse-discord.mjs';

const CHANNEL_ID = '751893730117812225';

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
const checkRound = async (tightest) => {
  const channel = MuseDiscord.client.channels.cache.get(CHANNEL_ID);

  // fetch the last 200 messages (this should cover even the longest rounds)
  const messages = await MuseDiscord.fetchMany(channel, 200);

  // if the most recent round is complete,
  // fetch the reactions from the check-in and check-out messages
  const checkIns = await MuseDiscord.getChecks(channel, 'if you plan on voting in the');
  const checkOuts = await MuseDiscord.getChecks(channel, 'you have checked in and are done voting');

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
  // eslint-disable-next-line max-len
  const flipArray = resultsArray.filter((m) => (tightest === true ? m.closeOne : m.flippable) === 1);

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

export default async function tight(tightest) {
  return checkRound(tightest);
}
