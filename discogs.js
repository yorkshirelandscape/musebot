/* eslint-disable camelcase */
/* eslint-disable consistent-return */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
const dotenv = require('dotenv');

dotenv.config();

const Discogs = require('disconnect').Client;

const disc = new Discogs('MuseBot/1.0', { userToken: process.env.DISCOGS }).database();

const { Client, Intents, MessageEmbed } = require('discord.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'disc') {
    const searchArtist = interaction.options.getString('artist');
    const searchTrack = interaction.options.getString('title');

    const data = await disc.search({
      artist: searchArtist, track: searchTrack, type: 'release', sort: 'year', sort_order: 'asc',
    });

    const sortMap = data.results.sort((x, y) => {
      const n = x.year - y.year;
      if (n !== 0) {
        return n;
      }
      // if (x.country !== y.country) {
      //   // if (x.country === ('US' || 'UK') && y.country === ('US' || 'UK')) { return 0; }
      //   if (x.country === 'US' && y.country === 'UK') { return 0; }
      //   if (x.country === 'UK' && y.country === 'US') { return 0; }
      //   // if (x.country === ('US' || 'UK')) { return -1; }
      //   // if (y.country === ('US' || 'UK')) { return 1; }
      //   // if (x.country === 'UK') { return -1; }
      //   // if (y.country === 'UK') { return 1; }
      //   return y.country.localeCompare(x.country);
      // }
      return y.community.have - x.community.have;
    });

    console.log(sortMap);

    const filtArr = sortMap.filter((r) => (
      !r.format.includes('Unofficial Release')
        && !r.format.includes('Promo')
        && !r.format.includes('EP')
        && !r.format.includes('Test Pressing')
        // && !r.format.includes('EP')
        && (r.format.includes('Album')
          || r.format.includes('Single')
          || r.format.includes('Compilation'))
    ));

    if (typeof year === 'undefined') await interaction.reply('No match.');

    const {
      title, year, genre, style, master_url, cover_image,
    } = filtArr[0];

    const plusArtist = searchArtist.replaceAll(/ /g, '+');
    const plusTrack = searchTrack.replaceAll(/ /g, '+');
    const searchURL = `https://www.discogs.com/search/?sort=year%2Casc&artist=${plusArtist}&track=${plusTrack}&type=release&layout=sm`;

    console.log(filtArr);

    const embed = new MessageEmbed()
      .setTitle(`${title} (${year})`)
      .setDescription(`${genre.join(', ')} (${style.join(', ')})`)
      .setImage(cover_image)
      .setURL(master_url)
      .addField('\u200B', `[Discogs Search](${searchURL})`);

    if (typeof year === 'undefined') {
      await interaction.reply('No match.');
    } else {
      await interaction.reply({ embeds: [embed] });
    }
  }
});

client.login(process.env.TOKEN);
