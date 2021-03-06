import Discogs from 'disconnect';

const CLIENT_USER_AGENT = 'MuseBot/1.0';

function getDiscogsClient(userAgent = CLIENT_USER_AGENT) {
  return new Discogs.Client(userAgent, { userToken: process.env.DISCOGS }).database();
}

function isValidRelease(release) {
  const { format } = release;
  const required = ['Album', 'Single', 'Compilation', 'LP', 'EP', 'Shellac'];
  const forbidden = ['Unofficial Release', 'Promo', 'Test Pressing', 'TP', 'Jukebox'];

  return (
    required.some((type) => format.includes(type))
    && !forbidden.some((type) => format.includes(type))
  );
}

const getMasterUrl = (masterId) => `https://www.discogs.com/master/${masterId}`;

function formatResult(result, track, url) {
  if (!result?.year) {
    throw Error(`No match. [Discogs Search](${url})`);
  }

  return {
    title: `${result.title} (${result.year})`,
    description: `${track}\n\n${(result.genre || []).join(', ')} (${(result.style || []).join(', ')})`,
    image: { url: result.cover_image },
    url: getMasterUrl(result.master_id),
    fields: [{ name: '\u200b', value: `[Discogs Search](${url})` }],
  };
}

export default async function disc(artist, track) {
  const discogs = getDiscogsClient();

  const url = new URL('https://www.discogs.com/search/');
  url.search = new URLSearchParams({
    artist,
    track,
    type: 'release',
    sort: 'year,asc',
    layout: 'sm',
  });

  const sortFn = (x, y) => x.year - y.year || y.community.have - x.community.have;

  const data = await discogs.search({
    artist,
    track,
    type: 'release',
    sort: 'year',
    sort_order: 'asc',
  });

  const results = data.results.sort(sortFn).filter(isValidRelease);
  return formatResult(results[0], track, url.href);
}
