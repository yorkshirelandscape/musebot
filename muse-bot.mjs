import MuseDiscord from './discord/muse-discord.mjs';
import MuseGoogle from './google/muse-google.mjs';
import SlashCommander from './commands/slash-commander.mjs';

const START_TIME = 5;
const END_TIME = 21;

/**
 * MuseBot class for initializing and running the Discord bot.
 */
export default class MuseBot {
  static get ACTIONS() {
    return [
      'match',
      'start',
      'status',
      'testGoogle',
      'testDiscord',
      'testEmoji',
      'slash',
    ];
  }

  constructor(logger, options) {
    this.logger = logger.child({ class: 'MuseBot' });
    this.options = options;
    this.startTime = new Date();
    this.endTime = null;
    this.initialized = false;
    this.discordClient = null;
    this.googleClient = null;
    this.slashCommander = null;
    this.destroyClient = true;
  }

  /**
   * Initializes the bot. This includes the following:
   * - Initializes the Discord client
   */
  async init() {
    this.logger.info('Initializing Discord client');
    this.discordClient = new MuseDiscord(this.logger);
    this.googleClient = new MuseGoogle(this.logger);
    this.slashCommander = new SlashCommander(this.logger, this.discordClient);
    await Promise.all([
      this.discordClient.init(),
      this.googleClient.init(),
      this.slashCommander.init(),
    ]);
    this.initialized = true;
  }

  /**
   * Internal function to check that the bot has been initialized.
   *
   * If the bot is not initialized when this is invoked, it throws an error.
   */
  requireInit() {
    if (!this.initialized) {
      throw new Error('Bot was not initialized');
    }
  }

  /**
   * Async function that says whether the bot should be enabled.
   *
   * If the `force` option is set, this will always return `true`. Otherwise,
   * will only return `true` if the bot's state is set to `GO` in the
   * spreadsheet and the current time is in the bot's allowed operating window.
   */
  async isBotEnabled() {
    const botState = await this.googleClient.getBotState();
    const nowHour = new Date().getHours();
    return botState === 'GO' && START_TIME < nowHour && nowHour < END_TIME;
  }

  /**
   * Iterates through the command line arguments to perform the requested
   * actions.
   *
   * Destroys the input array.
   *
   * Requires the bot to have been initialized first.
   *
   * Though async, this function waits for each action to fully complete before
   * moving on to the next action.
   *
   * See handleAction method for information about allowed actions.
   *
   * @param {string[]} actions - Array of actions to perform. Destroyed during
   *   processing
   */
  async process(actions) {
    this.requireInit();
    while (actions.length) {
      if (!MuseBot.ACTIONS.includes(actions[0])) {
        throw new Error(`Invalid action ${actions[0]}`);
      }
      const i = actions.slice(1).findIndex((element) => MuseBot.ACTIONS.includes(element));
      const toHandle = i === -1 ? actions.splice(0) : actions.splice(0, i + 1);
      // eslint-disable-next-line no-await-in-loop
      await this.handleAction(toHandle[0], toHandle.slice(1));
    }
  }

  /**
   * Dispatcher function to handle individual actions.
   *
   * Possible actions are:
   * - `match` Posts a single match
   * - `start` Starts the daemon to post matches, count reactions, etc.
   * - `status` Prints the status of the current round
   *
   * This function is synchronous and waits for the action to fully complete
   * before returning.
   *
   * @param {string} action - The name of the action to perform, as described
   *   above.
   * @param {array} args - Optional list of string arguments to pass to the
   *   action handler.
   */
  async handleAction(action, args = []) {
    this.requireInit();
    this.logger.debug(`Processing argument "${action}"`);
    switch (action) {
      case 'match':
        // Post one match
        this.logger.info('Posting one match');
        // this.client.postMatch(options);
        break;
      case 'start':
        // Do all the bot things, keep running:
        // * Start round
        // * Post matches
        // * Collect reactions
        // * End round when appropriate
        this.logger.info('Starting daemon');
        // this.client.start(options)
        this.destroyClient = false;
        break;
      case 'status':
        // Print out status of current bracket/round
        this.logger.info('Status of current round');
        break;
      case 'testGoogle':
        // We authorize the client on init, this is to verify that worked
        this.logger.info('Test Google API authorization');
        await this.googleClient.testAuthorization();
        break;
      case 'testDiscord':
        // We authorize the client on init, this is to verify that worked
        this.logger.info('Test Discord API authorization');
        await this.discordClient.testAuthorization();
        break;
      case 'testEmoji':
        this.logger.info('Test finding emoji');
        await this.discordClient.findRecentEmoji();
        break;
      case 'slash':
        if (!args.length) {
          this.logger.error('`slash` action requires command name argument');
          break;
        }
        this.logger.info(`Testing slash command ${args[0]}`);
        this.logger.debug({ command: args[0], args: args.slice(1) }, 'Testing slash command with given arguments');
        await this.slashCommander.dispatch(args[0], args.slice(1), true);
        this.logger.debug({ command: args[0], args: args.slice(1) }, 'Slash command completed');
        break;
      default:
        this.logger.error(`Unknown action: "${action}"`);
    }
  }

  /**
   * This function tears down the bot.
   *
   * This includes the following actions:
   * - Logging the elapsed time
   * - Destroying the Discord client (if applicable)
   */
  teardown() {
    this.requireInit();
    this.endTime = new Date();
    const elapsed = ((this.endTime - this.startTime) / 1000).toFixed(3);
    this.logger.info(`Completed processing arguments. Elapsed time ${elapsed}s`);
    if (this.destroyClient) {
      this.logger.info('Destroying Discord client');
      this.discordClient.destroy();
    }
    this.initialized = false;
  }
}
