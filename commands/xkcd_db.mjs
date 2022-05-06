/* eslint-disable max-len */
import fetch from 'node-fetch';
import fs from 'fs';
import lda from 'lda';
import _ from 'underscore';

const summarize = (input) => {
  const documents = input.match(/[^.!?\n]+[.!?\]}]+/g);
  return lda(documents, 1, 3);
};

const appendJSON = (file, data) => {
  let jFile;
  let jFileTemp = [];

  try {
    jFile = fs.readFileSync(file);
    jFileTemp = JSON.parse(jFile);
  } catch (ignore) { }

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

const getComics = async (x, n = 1) => {
  for (let i = x; i < x + n; i++) {
    let comic = null;
    try {
      comic = await getComic(i);
    } catch (err) {
      console.log(`No comic #${i}.`);
      continue;
    }

    comic.summary = summarize(comic.transcript);

    try {
      appendJSON('./commands/xkcd.json', comic);
    } catch (err) {
      console.log(`Comic #${i} already imported.`);
    }
  }
};

const getMaxComic = (file) => {
  let jFile = fs.readFileSync(file);
  jFile = JSON.parse(jFile);
  return _.max(jFile.map((c) => c.num));
};

setTimeout(() => {
  const mc = getMaxComic('./commands/xkcd.json');
  getComics(mc + 1);
}, 24 * 60 * 60 * 1000);
