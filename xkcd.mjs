/* eslint-disable max-len */
import fetch from 'node-fetch';
import fs from 'fs';
// import MuseDiscord from './discord/muse-discord.mjs';
// import lda from 'lda';

const getComic = async (i) => {
  const response = await fetch(`https://xkcd.com/${i}/info.0.json`);
  return response.json();
};

const appendJSON = (file, data) => {
  let jFileA = fs.readFileSync(file);
  let jFileB = [];
  try {
    jFileB = JSON.parse(jFileA);
  } catch (ignore) {
  }
  jFileB.push(data);
  jFileA = JSON.stringify(jFileB, null, 2);
  fs.writeFileSync(file, jFileA);
};

const getComics = async (x, n = 1) => {
  for (let i = x; i < x + n; i++) {
    const comic = await getComic(i);
    appendJSON('xkcd.json', comic);
  }
};

const getMaxComic = (file) => {
  let jFile = fs.readFileSync(file);
  jFile = JSON.parse(jFile);
  return jFile.sort(
    (a, b) => parseFloat(b.num) - parseFloat(a.num),
  )[0].num;
};

const mc = getMaxComic('xkcd.json');

getComics(mc + 1);
