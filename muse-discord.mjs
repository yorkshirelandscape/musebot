/* eslint-disable max-classes-per-file */

import { Client, Intents } from 'discord.js';

import dismoji from 'discord-emoji';
import enm from 'emoji-name-map';
// const EMOJI_ONE = enm.get('one');
// const EMOJI_TWO = enm.get('two');
const EMOJI_BOOM = enm.get('boom');

/**
 * Container object for information about a Discord emoji
 */
class Emoji {
  constructor(text, name, unicode, replacement) {
    this.text = text;
    this.name = name;
    this.id = null;
    this.unicode = unicode || null;
    this.replacement = replacement || null;
  }
}

export default class MuseDiscord {
  /**
   * Creates a new Discord Client instance
   * @constructor
   */
  constructor(logger) {
    this.logger = logger.child({ class: 'MuseDiscord' });
    this.client = new Client({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      ],
    });
    this.initialized = false;
  }

  /**
   * Initialization function which logs the client in.
   *
   * Must be called before doing any real work with the client.
   */
  async init() {
    await this.client.login(process.env.TOKEN);
    this.logger.info('Discord client ready');
    this.guild = this.client.guilds.cache.get(process.env.GUILD_ID);
    this.channel = this.client.channels.cache.get(process.env.CHANNEL_ID);
    this.initialized = true;
  }

  /**
   * Destroys the Discord client instance, freeing resources and ensuring all
   * requested actions are fully completed.
   *
   * TODO: Is the above accurate?
   */
  destroy() {
    this.client.destroy();
  }

  /**
   * Internal function to check that the client has been initialized.
   *
   * If the client is not initialized when this is invoked, it throws an error.
   */
  requireInit() {
    if (!this.initialized) {
      throw new Error('Discord client was not initialized');
    }
  }

  /**
   * Given a string name, searches all categories for an emoji corresponding to
   * that name and returns the emoji.
   *
   * @param {string} name - Emoji name
   * @returns {?string} Unicode character corresponding to the given name
   */
  static getDismojiByName(name) {
    for (const category of Object.values(dismoji)) {
      if (typeof category[name] !== 'undefined') {
        return category[name];
      }
    }
    return null;
  }

  /**
   * Given a Unicode character representing an emoji, returns a Boolean indicating
   * whether that's a valid Discord emoji.
   *
   * @param {string} Single Unicode emoji character
   * @returns {boolean} Boolean indicating whether the character was found to be a
   *   valid Discord emoji
   */
  static getDismojiByUnicode(symbol) {
    return Object.values(dismoji).some(
      (category) => Object.values(category).some((emoji) => emoji === symbol),
    );
  }

  /**
   * Returns emoji objects for all emoji found in the given text.
   *
   * Uses the zero-width unicode character \u200b inserted when creating the
   * message as a delimiter to detect the emoji strings.
   *
   * For each emoji it finds, fetches information from dismoji and the client's
   * guild to build the emoji object returned.
   *
   * @param {string} text - Input message string to find emoji in
   * @returns {Emoji[]} Array of Emoji instances describing each emoji found
   */
  async findEmojis(text) {
    return Promise.all(
      Array.from(
        text.matchAll(/(?<=\u200b):?([^:\n]+):?(?=\u200b)/g),
        this.getEmoji,
        this,
      ),
    );
  }

  /**
   * Replace emoji text in the given message with the replacements indicated in
   * the array of Emoji objects.
   *
   * For each Emoji, if the Emoji indicates a replacement, search and replace the
   * emoji's text within the message text with the emoji's replacement text.
   *
   * @param {string} text - Message text to replace in
   * @param {Emoji[]} - List of Emoji objects
   * @returns {string} New copy of text with emoji text replaced
   */
  static replaceEmojis(text, emojis) {
    return emojis.filter((emoji) => emoji.replacement)
      .reduce(
        (curText, emoji) => curText.replace(emoji.text, emoji.replacement),
        text,
      );
  }

  /**
   * Given a regex match object where the first element is the verbatim emoji text
   * and the second is the name of the emoji, returns an Emoji object describing
   * the emoji as it exists within the current Discord client's guild.
   *
   * @param {string[]} match - Match array where the first element is the literal
   *   emoji text verbatim and the second element is just the name of the emoji.
   * @returns {Emoji} An Emoji class with information describing the requested
   *   emoji as it exists in the client's current guild.
   */
  async getEmoji(match) {
    const [text, name] = match;
    const matchFunc = (ident) => ident.name === name;

    const emoji = new Emoji(text, name);

    try {
      const guildEmoji = await this.guild.emojis.cache.find(matchFunc);
      emoji.id = guildEmoji.id;
      emoji.replacement = `<${text}${guildEmoji.id}>`;
      this.logger.debug(`Custom emoji found for "${name}": ${guildEmoji.id}`);
    } catch {
      this.logger.debug(`No custom emoji found for "${name}"`);
      try {
        const clientEmoji = await this.client.emojis.cache.find(matchFunc);
        emoji.id = clientEmoji.id;
        emoji.replacement = `<${text}${clientEmoji.id}>`;
        this.logger.debug(`Client emoji found for "${name}": ${clientEmoji.id}`);
      } catch {
        this.logger.debug(`No client emoji found for "${name}"`);
      }
      const symbol = MuseDiscord.getDismojiByName(name);
      if (symbol) {
        emoji.unicode = symbol;
        this.logger.debug(`Dismoji emoji found for "${name}": ${symbol}`);
      } else {
        this.logger.debug(`No dismoji emoji found for "${name}"`);
      }
      if (!text.match(/^:([a-zA-Z0-9_]+):$/)) {
        if (MuseDiscord.getDismojiByUnicode(text)) {
          emoji.unicode = text;
          this.logger.debug(`Dismoji verified for "${text}"`);
        } else {
          this.logger.debug(`Dismoji not found for "${text}"`);
        }
      }
    }
    if (!emoji.id && !emoji.unicode) {
      this.logger.error(`Emoji not found for "${text}"`);
      return new Emoji(text, name, EMOJI_BOOM, EMOJI_BOOM);
    }
    return emoji;
  }

  /**
   * Tell the Discord client to react to the given message with the given emojis
   *
   * Reacts with the emoji in the order given in the array, waiting for each
   * reaction to complete in turn.
   *
   * @param message - Discord message instance to react to
   * @param emojis {Emoji[]} - Array of emojis to react with
   */
  async react(message, emojis) {
    for (const emoji of emojis) {
      if (typeof emoji.id !== 'undefined') {
        // eslint-disable-next-line no-await-in-loop
        await message.react(emoji.id);
      } else if (typeof emoji.unicode !== 'undefined') {
        // eslint-disable-next-line no-await-in-loop
        await message.react(emoji.unicode);
      } else {
        this.logger.error(`Can't react with invalid emoji "${emoji.name}"`);
      }
    }
  }
}
