#!/usr/bin/env node

import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import pino from 'pino';
import Getopt from 'node-getopt';

import MuseBot from './muse-bot.mjs';

/**
 * Configures Getopt and returns parsed command line arguments
 * @returns Initialized and parsed options object
 */
const getOptions = () => new Getopt([
  ['t', 'testing', 'Use test spreadsheet and Discord server'],
  ['n', 'dry-run', "Don't post to Discord or modify any spreadsheets"],
  ['f', 'force', 'Skip checking if the bot should be active and force action'],
  ['h', 'help', 'Display this help message'],
  ['v', 'verbose', 'Print more debug messages'],
  ['', 'json', 'Format log messages as JSON objects'],
]).bindHelp().parseSystem();

/**
 * Gets the log level based on the LOG_LEVEL environment variable and the
 * `verbose` argument.
 *
 * If set, the environment variable will override the verbose flag.
 *
 * @param {boolean} verbose - Flag indicating whether to default to setting
 *   the log level to `info` or the more verbose `debug`
 */
const getLogLevel = (verbose) => process.env.LOG_LEVEL || (verbose ? 'debug' : 'info');

/**
 * Creates a new pino logger instance and initializes it to the given log level.
 *
 * @param {string} level - The log level to configure the new logger with
 */
const getLogger = (level, pretty) => pino({ level, prettyPrint: pretty });

const main = async () => {
  const opt = getOptions();
  dotenv.config({ path: opt.options.testing ? 'dev.env' : 'prod.env' });
  const logger = getLogger(getLogLevel(opt.options.verbose), !opt.options.json);
  const bot = new MuseBot(logger, opt.options);
  try {
    await bot.init();
    await bot.process(opt.argv || []);
    await bot.teardown();
  } catch (e) {
    logger.error(e, 'Uncaught exception');
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Script is invoked directly rather than imported
  await main();
}
