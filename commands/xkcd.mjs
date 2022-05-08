import utils from './utils.mjs';

function formatComic(comic) {
  return {
    title: comic.title,
    image: { url: comic.img },
    footer: comic.alt,
    url: `https://xkcd.com/${num}/`,
  };
}

export default async function xkcd(xkcdDb, client, channel, context=10, num=null) {
  if (num) {
    return formatComic(xkcdDb.get(num));
  }

  // Always use at least one message for context
  const messages = await client.fetchMany(channel, Math.max(1, context));
  const input = utils.summarizeText(messages.map((msg) => msg.content).join(' '));
  return formatComic(xkcdDb.getBestComic(input));
}
