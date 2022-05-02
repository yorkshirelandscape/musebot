/* eslint-disable max-len */
import fetch from 'node-fetch';
import fs from 'fs';
import lda from 'lda';
import similarity from 'sentence-similarity';
import simScore from 'similarity-score';
// import tf from '@tensorflow/tfjs';
// import use from '@tensorflow-models/universal-sentence-encoder';

const summarize = (input) => {
  const text = input.transcript;
  const documents = text.match(/[^.!?\n]+[.!?\]}]+/g);
  return lda(documents, 1, 3);
};

const getMessages = (client, lines) => {
  const messages = client.fetchMany(client.channel, lines);
  const text = { transcript: messages.map((m) => m.content).join(' ') };
  return summarize(text);
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

const getSummary = (file, n) => {
  let jFile = fs.readFileSync(file);
  jFile = JSON.parse(jFile);
  const comic = jFile.find((c) => c.num === n);
  if (!comic.hasOwnProperty('summary')) {
    return summarize(comic);
  }
  return comic.summary;
};

const getStoredComic = (file, n) => {
  let jFile = fs.readFileSync(file);
  jFile = JSON.parse(jFile);
  const comic = jFile.find((c) => c.num === n);
  return comic;
};

const getComics = async (x, n = 1) => {
  for (let i = x; i < x + n; i++) {
    let comic = null;
    try {
      comic = await getComic(i);
    } catch (err) {
      console.log(`No comic #${i}.`);
      break;
    }

    comic.summary = summarize(comic);

    try {
      appendJSON('./commands/xkcd.json', comic);
    } catch (err) {
      console.log(`Comic #${i} already imported.`);
    }
  }
};

// const getMaxComic = (file) => {
//   let jFile = fs.readFileSync(file);
//   jFile = JSON.parse(jFile);
//   return jFile.sort(
//     (a, b) => parseFloat(b.num) - parseFloat(a.num),
//   )[0].num;
// };

// const addSummary = (file, n) => {
//   let jFile = fs.readFileSync(file);
//   jFile = JSON.parse(jFile);
//   const comic = jFile.find((c) => c.num === n);
//   if (!comic.hasOwnProperty('summary')) {
//     const summary = summarize(comic);
//     comic.summary = summary;
//     jFile = JSON.stringify(jFile, null, 2);
//     fs.writeFileSync(file, jFile);
//     console.log(`Added to Comic #${n}:\n${summary.toString()}`);
//   } else { console.log(`Comic #${n} already summarized.`); }
// };

// const summary = getSummary('xkcd.json', 1);

// console.log(summary);

// addSummary('xkcd.json', 1);

// const mc = getMaxComic('xkcd.json');

// getComics(mc + 1);

// getComics(1, 2);

// const getEmbeddings = (sentences) => use.load().then((model) => model.embed(sentences));

const getTranscript = (file, n) => {
  let jFile = fs.readFileSync(file);
  jFile = JSON.parse(jFile);
  const comic = jFile.find((c) => c.num === n);
  return comic.transcript;
};

// const test = async (file, n) => {
//   const embeddings = await getEmbeddings(getTranscript(file, n));
//   console.log(embeddings);
// };

// test('./commands/xkcd.json', 1);

const getSummaries = (file, n = null, x = 1) => {
  let jFile = fs.readFileSync(file);
  jFile = JSON.parse(jFile);
  let summaries = [];
  if (n !== null) {
    jFile = jFile.filter((c) => c.num >= x && c.num <= x + n);
    summaries = jFile;
  }
  summaries = jFile.map((c) => c.summary.map((s) => s.map((t) => t.term)));
  return summaries;
};

// getComics(1, 20);

const input = getSummary('./commands/xkcd.json', 1).map((s) => s.map((t) => t.term))[0];
const corpus = getSummaries('./commands/xkcd.json');

const winkOpts = { f: simScore.winklerMetaphone, options: { threshold: 0 } };

const scores = corpus.map((c) => similarity(input, c[0], winkOpts));
console.log(scores);
