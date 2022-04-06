/* eslint-disable max-len */
import fetch from 'node-fetch';
import fs from 'fs';
import lda from 'lda';
// import MuseDiscord from './discord/muse-discord.mjs';

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

const getComic = async (i) => {
  const response = await fetch(`https://xkcd.com/${i}/info.0.json`);
  return response.json();
};

const getComics = async (x, n = 1) => {
  for (let i = x; i < x + n; i++) {
    try {
      const comic = await getComic(i);
      appendJSON('xkcd.json', comic);
    } catch (err) {
      console.log(`No comic #${i}.`);
      break;
    }
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

// getComics(mc + 1);

const summarize = (file, n) => {
  let jFile = fs.readFileSync(file);
  jFile = JSON.parse(jFile);
  const text = jFile.find((c) => c.num === n).transcript;
  const documents = text.match(/[^.!?]+[.!?]+/g);
  return lda(documents, 1, 3);
};

const summary = summarize('xkcd.json', 2);

console.log(summary);
