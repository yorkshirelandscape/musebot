import lda from 'lda';
import fs from 'fs';

// Lifted from MDN https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#sequence_generator_range
// Sequence generator function (commonly referred to as "range", e.g. Clojure, PHP etc)
const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1}, (_, i) => start + (i * step));

const readJSON = (path) => JSON.parse(fs.readFileSync(path));

const writeJSON = (path, data) => fs.writeFileSync(path, JSON.stringify(data));

const summarizeText = (text) => lda(text.match(/[^.!?\n]+[.!?\]}]+/g), 1, 3);

export default const utils = { range, readJSON, writeJSON, summarizeText };
export utils;
