/* eslint-disable max-classes-per-file */

import { Client, Intents, Collection } from 'discord.js';

import Emoji from './emoji.mjs';

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
        Intents.FLAGS.GUILD_MEMBERS,
      ],
    });
    this.initialized = false;
    this.initPromise = new Promise((resolve, reject) => {
      this.client.once('error', reject);
      this.client.once('ready', () => {
        this.logger.info('Discord client ready');
        this.client.off('error', reject);
        resolve();
      });
    });
  }

  /**
   * Initialization function which logs the client in.
   *
   * Must be called before doing any real work with the client.
   */
  async init() {
    await this.client.login(process.env.TOKEN);
    await this.initPromise;
    this.guild = this.client.guilds.cache.get(process.env.GUILD_ID);
    this.infoChannel = this.client.channels.cache.get(process.env.INFO_CHANNEL_ID);
    this.voteChannel = this.client.channels.cache.get(process.env.VOTE_CHANNEL_ID);
    this.initialized = true;
  }

  async ready() {
    return this.initPromise;
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
    this.requireInit();
    return Promise.all(
      Array.from(
        text.matchAll(/(?<=\u200b):?([^:\n]+):?(?=\u200b)/g),
        this.getEmoji,
        this,
      ),
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
    this.requireInit();
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
      const symbol = Emoji.getDismojiByName(name);
      if (symbol) {
        emoji.unicode = symbol;
        this.logger.debug(`Dismoji emoji found for "${name}": ${symbol}`);
      } else {
        this.logger.debug(`No dismoji emoji found for "${name}"`);
      }
      if (!text.match(/^:([a-zA-Z0-9_]+):$/)) {
        if (Emoji.getDismojiByUnicode(text)) {
          emoji.unicode = text;
          this.logger.debug(`Dismoji verified for "${text}"`);
        } else {
          this.logger.debug(`Dismoji not found for "${text}"`);
        }
      }
    }
    if (!emoji.id && !emoji.unicode) {
      this.logger.error(`Emoji not found for "${text}"`);
      return Emoji.boom(text, name);
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
    this.requireInit();
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

  async getLastMessage(channel) {
    this.requireInit();
    const messages = await channel.messages.fetch({ limit: 1 });
    if (messages.size !== 1) {
      throw new Error('No messages found in specified channel');
    }
    return messages.first();
  }

  /**
   * Tests the client configuration by retrieving the most recent message.
   */
  async testAuthorization() {
    this.requireInit();
    this.logger.info('Testing that client is able to access messages');
    try {
      const message = await this.getLastMessage(this.infoChannel);
      this.logger.debug(`Found message: ${message.content}`);
    } catch (err) {
      this.logger.error(err, 'Unable to access messages');
      throw err;
    }
    this.logger.info('Successfully accessed Discord messages');
    return true;
  }

  async findRecentEmoji() {
    this.requireInit();
    this.logger.info('Looking for emoji in most recent message in vote channel');
    const message = await this.getLastMessage(this.voteChannel);
    this.logger.debug(`Found message: ${message.content}`);
    const emojis = await this.findEmojis(message.content);
    this.logger.info(`Found ${emojis.length} emoji in message`);
    emojis.forEach((emoji) => {
      this.logger.debug(`Found emoji: ${emoji}`);
    });
  }

  async postMessage(channel, message) {
    this.requireInit();
    this.logger.info(`Posting message to channel ${channel.id}`);
    this.logger.debug({ channelId: channel.id, message }, `Posting to channel ${channel.id} message ${message}`);
    await channel.send(message);
    this.logger.info('Message successfully posted');
  }

  // function to fetch more than the limit of 100 messages
  async fetchMany(channel, limit = 250) {
    this.requireInit();
    this.logger.info(`Fetching ${limit} messages from channel ${channel.id}`);
    this.logger.debug({ channelId: channel.id }, `Fetching ${limit} messages from channel ${channel.id}`);

    if (!channel) {
      throw new Error(`Expected channel, got ${typeof channel}.`);
    }
    if (limit <= 100) {
      return channel.messages.fetch({ limit });
    }

    let collection = new Collection();
    let lastId = null;
    const options = {};
    let remaining = limit;
    while (remaining > 0) {
      options.limit = remaining > 100 ? 100 : remaining;
      remaining = remaining > 100 ? remaining - 100 : 0;
      if (lastId) {
        options.before = lastId;
      }
      // eslint-disable-next-line no-await-in-loop
      const messages = await channel.messages.fetch(options);
      if (!messages.last()) {
        break;
      }
      collection = collection.concat(messages);
      lastId = messages.last().id;
    }
    this.logger.info('Messages fetched.');
    return collection;
  }

  // function to fetch the reactions to the most recent message with the specified content
  async getChecks(channel, search) {
    this.requireInit();
    this.logger.info(`Getting most recent set of checks from channel ${channel.id}`);
    this.logger.debug({ channelId: channel.id }, `Getting most recent set of checks from channel ${channel.id}`);
    const checkMsg = channel.messages.cache.find((m) => m.content.includes(search));
    const checksReturn = checkMsg.reactions.cache.first().users.fetch().then((p) => {
      const checks = p.filter((u) => !u.bot).map((user) => ({ user: user.username, id: user.id }));
      return checks;
    });
    return checksReturn;
  }
}
