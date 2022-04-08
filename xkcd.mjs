/* eslint-disable max-len */
import fetch from 'node-fetch';
import fs from 'fs';
import lda from 'lda';
// import MuseDiscord from './discord/muse-discord.mjs';

const appendJSON = (file, data) => {
  let jFile = fs.readFileSync(file);
  let jFileTemp = [];
  try {
    jFileTemp = JSON.parse(jFile);
  } catch (ignore) {
  }
  const cNum = data.num;
  if (!jFileTemp.map((c) => c.num).includes(cNum)) {
    jFileTemp.push(data);
    jFile = JSON.stringify(jFileTemp, null, 2);
    fs.writeFileSync(file, jFile);
  }
};

const getComic = async (i) => {
  const response = await fetch(`https://xkcd.com/${i}/info.0.json`);
  return response.json();
};

const getSummary = (comic) => {
  const text = comic.transcript;
  const documents = text.match(/[^.!?]+[.!?]+/g);
  return lda(documents, 1, 3);
};

// const summarize = (file, n) => {
//   let jFile = fs.readFileSync(file);
//   jFile = JSON.parse(jFile);
//   const comic = jFile.find((c) => c.num === n);
//   if (!comic.hasOwnProperty('summary')) {
//     return getSummary(comic);
//   }
//   return comic.summary;
// };

const getComics = async (x, n = 1) => {
  for (let i = x; i < x + n; i++) {
    let comic = null;
    try {
      comic = await getComic(i);
    } catch (err) {
      console.log(`No comic #${i}.`);
      break;
    }

    comic.summary = getSummary(comic);

    try {
      appendJSON('xkcd.json', comic);
    } catch (err) {
      console.log(`Comic #${i} already imported.`);
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

// const addSummary = (file, n) => {
//   let jFile = fs.readFileSync(file);
//   jFile = JSON.parse(jFile);
//   const comic = jFile.find((c) => c.num === n);
//   if (!comic.hasOwnProperty('summary')) {
//     const summary = getSummary(comic);
//     comic.summary = summary;
//     jFile = JSON.stringify(jFile, null, 2);
//     fs.writeFileSync(file, jFile);
//     console.log(`Added to Comic #${n}:\n${summary.toString()}`);
//   } else { console.log(`Comic #${n} already summarized.`); }
// };

// const summary = summarize('xkcd.json', 2);

// console.log(summary);

// addSummary('xkcd.json', 1);

const mc = getMaxComic('xkcd.json');

getComics(mc + 1);

// getComics(1, 2);
