import tzstamp from './tzstamp.mjs';

export default class SlashCommander {
  /**
   * Creates a new SlashCommander
   * @constructor
   */
  constructor(logger, client) {
    this.logger = logger.child({ class: 'SlashCommander' });
    this.client = client;
    this.initialized = false;
  }

  /**
   * Initialization function which logs the client in.
   *
   * Must be called before doing any real work with the client.
   */
  async init() {
    this.logger.info('Initializing SlashCommander');
    await this.client.ready();
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
      throw new Error('SlashCommander was not initialized');
    }
  }

  async dispatch(command, args, test = false) {
    const logger = this.logger.child({ command, args });
    logger.debug('Dispatching slash command');
    switch (command) {
      case 'tzstamp':
        if (test) {
          logger.info('Testing tzstamp.');
          if (!args.length) {
            logger.debug('No arguments given, using default');
            this.testTzstamp('2022/01/03 16:50');
          } else {
            for (const msg of args) {
              this.testTzstamp(msg);
            }
          }
        } else {
          // Do something cool
        }
        break;
      default:
        throw new Error(`Unrecognized slash command ${command}`);
    }
  }

  testTzstamp(msg) {
    this.logger.info(tzstamp(msg));
  }
}
