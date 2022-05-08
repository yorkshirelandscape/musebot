import fetch from 'node-fetch';
import fs from 'fs';
import similarity from 'sentence-similarity';
import simScore from 'similarity-score';

import utils from './utils.mjs';

DB_PATH = process.env.XKCD_DB_PATH || './commands/xkcd.json';

SIMILARITY_OPTIONS = { f: simScore.winklerMetaphone, options: { threshold: 0 } };


export default class xkcd {
  /**
   * Creates a new SlashCommander
   * @constructor
   */
  constructor(logger, dbPath) {
    this.logger = logger.child({ class: 'xkcd' });
    this.dbPath = dbPath || DB_PATH;
    this.db = null;
    this.dbLoaded = false;
    this.dbSynced = false;
  }

  /**
   * Initialization function which loads the db file into memory
   */
  async init() {
    this.logger.info({ dbPath: this.dbPath }, 'Initializing XKCD DB');
    await this.loadDb();
    if (this.db === null) {
      this.logger.warning({ dbPath: this.dbPath }, 'No database loaded, initializing a new one');
      this.db = {};
      this.dbLoaded = true;
      this.saveDb();
    }
  }

  /**
   * Internal function to check that the client has been initialized.
   *
   * If the client is not initialized when this is invoked, it throws an error.
   */
  requireInit() {
    if (!this.dbLoaded) {
      throw new Error('XKCD DB was not initialized');
    }
  }

  static getComicSummary(comic) {
    return utils.summarizeText([comic.title, comic.transcript, comic.alt].join(' '));
  }

  async loadDb() {
    this.logger.debug({ dbPath: this.dbPath }, 'Reading XKCD database');
    try {
      this.db = utils.readJSON(this.dbPath);
      this.dbLoaded = true;
      this.dbSynced = true;
    } catch (err) {
      this.logger.error(err, 'Error while reading XKCD database');
      return;
    }
    this.logger.debug({ dbPath: this.dbPath }, 'Done reading XKCD database');
  }

  async saveDb() {
    this.requireInit();

    this.logger.debug({ dbPath: this.dbPath }, 'Saving XKCD database');

    if (this.dbSynced) {
      this.logger.debug({ dbPath: this.dbPath }, 'Database already saved');
    }

    try {
      utils.writeJSON(this.dbPath, this.db);
      this.dbSynced = true;
    } catch (err) {
      this.logger.error(err, 'Error while writing XKCD database');
      return;
    }
    this.logger.debug({ dbPath: this.dbPath }, 'Done writing XKCD database');
  }

  async insert(key, value, sync = false) {
    this.requireInit();
    this.dbSynced = false;
    this.logger.debug({ key, value }, 'Inserting into XKCD db');
    this.db[key] = value;
    if (sync) {
      await this.saveDb();
    }
  }

  /**
   * Gets a specific comic's data, either from the DB or xkcd.com
   *
   * If a comic doesn't exist in the DB (or ``force`` is ``true``), will attempt
   * to fetch from xkcd.com and insert into the database (overwriting the
   * existing entry, if forced).
   *
   * If unable to fetch a comic from xkcd.com, will insert a ``null`` value into
   * the DB.
   *
   * When fetching a new comic, may leave the DB in an unsynced state, requiring
   * saveDb be called to store new results.
   *
   * @param {int} key - The integer index of the comic to fetch
   * @param {bool} force - Optional parameter to ignore whatever is currently in
   *   the DB and force fetching
   * @returns {dict} JSON data for the relevant comic, or null if comic does not
   *   exist
   */
  async get(key, force = false) {
    this.requireInit();
    if (force || typeof this.db[key] === 'undefined') {
      this.logger.warning({ force, key }, 'Unable to find comic or forced to refetch');
      let data = null;
      try {
        data = this.fetch(key);
      } catch (err) {
        this.logger.error(err, 'Error fetching comic from server');
        // We let data remain null here so that the database remembers not to
        // try this comic again unless forced to
      }
      this.insert(key, data);
    }
    return this.db[key];
  }

  /**
   * Function to fetch data for the given comic from xkcd.com
   *
   * Both fetching and parsing JSON may raise exceptions that likely indicate
   * that a comic index is invalid.
   *
   * If a comic is successfully fetched, also adds the ``summary`` attribute
   *
   * @param {int} key - The integer index of the comic to fetch
   * @returns {dict} JSON data loaded from xkcd.com for the relevant comic
   *
   * N.B. This function should be static but Node does not support static async
   */
  async fetch(key) {
    const response = await fetch(`https://xkcd.com/${key}/info.0.json`);
    const comic = response.json();
    comic.summary = xkcd.getComicSummary(comic);
    return comic;
  }

  async fetchRange(start, stop) {
    return Promise.all(utils.range(start, stop).map((key) => this.fetch(key)));
  }

  async getSummaries() {
    this.requireInit();
    return Object.values(this.db).map((comic) => comic.summary.map((summary) => summary.map((topic) => topic.term)));
  }

  async getScore(input, key) {
    this.requireInit();
    const comic = this.get(key);
    const topicTerms = comic.summary.map((topic) => topic.map((term) => term.term));
    return Math.max(...topicTerms.map((topic) => similarity(input, topic, SIMILARITY_OPTIONS)));
  }

  /**
  * Returns the comic most similar to the given input string.
  *
  * Searches all (and only) comics already in the database.
  */
  async getBestComic(input) {
    const scores = Object.keys(this.db).map((k) => { k, score: this.getScore(input, k) });
    return this.get(scores.reduce((prev, current) => (prev.score > current.score) ? prev : current));
  }

  async getLatestIndexFromDb() {
    this.requireInit();
    return Math.max(...Object.keys(this.db));
  }

  async getLatestIndexFromServer() {
    const response = await fetch('https://xkcd.com/rss.xml');
    const text = await response.text();
    // We grab the first link with a number in it as the most recent is at the top
    return parseInt(text.match(/\<link>https:\/\/xkcd.com\/(\d+)\/\<\/link>/)[1]);
  }

  async update(start, stop) {
    this.requireInit();
    this.logger.info('Updating XKCD DB to latest comic');

    if (start) {
      this.logger.debug({ start }, 'Start set manually, going to force fetch');
    } else {
      // We already have this, so start fetching on the next one
      start = this.getLatestIndexFromDb() + 1;
      this.logger.debug({ start }, 'Starting after latest comic already in the DB');
    }

    // We'll fetch up to but not including stop, so add one here
    // If stop was provided, make sure to cap at the latest comic
    stop = Math.min(stop || Infinity, this.getLatestIndexFromServer() + 1);
    this.logger.debug({ stop }, 'Latest comic determined from server');

    this.logger.debug({ start, stop }, 'Fetching new comics from the server')
    const comics = await this.fetchRange(start, stop);

    this.logger.debug({ start, stop }, 'Inserting new comics into the DB');
    await Promise.all(comics.map((comic) => this.insert(comic.num, comic)));
    this.saveDb();

    this.logger.info('Done updating XKCD DB');
  }
}
