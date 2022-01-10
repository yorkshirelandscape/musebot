import tzstamp from './tzstamp.mjs';

export default class SlashCommander {
  static get CONFIG() {
    return {
      tzstamp2: {
        handler: 'tzstamp',
        global: true,
        channels: false,
        name: 'tzstamp2',
        description: 'Replaces a message\'s datetimes in yyyy/MM/dd HH:mm format with Discord dynamic time zone format.',
        options: [
          {
            name: 'msg',
            type: 'STRING',
            description: 'The message containing the datetime.',
            required: true,
          },
          {
            name: 'offset',
            type: 'STRING',
            description: 'The offset from UTC in the format "UTC[+/-]X". Defaults to UTC.',
            required: false,
            defaultValue: 'UTC+0',
          },
          {
            name: 'raw',
            type: 'BOOLEAN',
            description: 'Return the timestamp code in a codeblock.',
            required: false,
            defaultValue: false,
          },
        ],
      },
    };
  }

  static getCommandData(config) {
    // We overload this config setup, so make a deep copy and drop some stuff
    const data = JSON.parse(JSON.stringify(config));
    delete data.handler;
    delete data.global;
    delete data.channels;
    for (const option of data.options) {
      delete option.defaultValue;
    }
    return data;
  }

  static getOption(options, name, type, defaultValue) {
    let val = null;
    switch (type) {
      case 'STRING':
        val = options.getString(name);
        break;
      case 'BOOLEAN':
        val = options.getBoolean(name);
        break;
      default:
        throw new Error(`Unrecognized option type ${type}`);
    }
    if (val === null) {
      val = defaultValue;
    }
    return val;
  }

  static getArgs(configOptions, interaction) {
    return configOptions.map((configOption) => SlashCommander.getOption(
      interaction.options,
      configOption.name,
      configOption.type,
      configOption.defaultValue,
    ));
  }

  isValidChannel(command, interaction) {
    const config = SlashCommander.CONFIG[command];
    if (typeof config === 'undefined') {
      throw new Error(`Unknown command '${command}'`);
    }
    if (config.global || !config.channels) {
      // All channels allowed
      return true;
    }
    if (!interaction.guildId || !interaction.channel) {
      // Now it needs to have a channel
      return false;
    }
    return config.channels.some(
      (channelName) => this.client[channelName].id === interaction.channel.id,
    );
  }

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
   * Initialization function which makes sure the Discord client is ready.
   *
   * Must be called before doing any real work with the SlashCommander.
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

  /**
   * Registers the handler for the given slash commands.
   *
   * By default, handles all known slash commands. If a list of commands is
   * specified, only those in the list will be handled.
   *
   * @param {string[]} commands - Array of string command names to restrict
   *   handling to. If not given, handles all known commands
   */
  async start(commands = []) {
    this.client.client.on('interactionCreate', async (interaction) => {
      // this.logger.info(interaction);
      if (!interaction.isCommand()) {
        this.logger.debug('Interaction is not a command');
        return;
      }
      if (
        (commands.length && !commands.includes(interaction.commandName))
        || !SlashCommander.CONFIG.hasOwnProperty(interaction.commandName)
      ) {
        this.logger.debug(`Not handling command '${interaction.commandName}'`);
        return;
      }
      if (!this.isValidChannel(interaction.commandName, interaction.channel)) {
        this.logger.debug(`Not handling command '${interaction.commandName}' in channel ${interaction.channel?.id}`);
        return;
      }
      // Now we should have a command we can actually handle
      this.dispatch(
        interaction.commandName,
        SlashCommander.getArgs(
          SlashCommander.CONFIG[interaction.commandName].options,
          interaction,
        ),
        interaction,
      );
    });
  }

  async dispatch(command, args, interaction = false) {
    this.logger.debug({ command, args }, 'Dispatching slash command');
    if (!SlashCommander.CONFIG.hasOwnProperty(command)) {
      throw new Error(`Unrecognized slash command ${command}`);
    }
    this[SlashCommander.CONFIG[command].handler](interaction, args);
  }

  async tzstamp(interaction, args) {
    if (interaction) {
      this.logger.debug({ args }, 'Handling tzstamp command.');
      await interaction.reply(tzstamp(...args));
    } else {
      this.logger.info({ args }, 'Testing tzstamp.');
      if (!args.length) {
        this.logger.debug('No arguments given, using default');
        // eslint-disable-next-line no-param-reassign
        args = ['2022/01/03 16:50'];
      }
      this.logger.info(tzstamp(...args));
    }
  }

  async createCommands(commands = []) {
    if (!commands.length) {
      // eslint-disable-next-line no-param-reassign
      commands = Object.keys(SlashCommander.CONFIG);
    }
    this.logger.info({ commands }, 'Creating slash commands');
    for (const command of commands) {
      const config = SlashCommander.CONFIG[command];
      let manager = null;
      if (config.global) {
        manager = this.client.client.application.commands;
      } else {
        manager = this.client.guild.commands;
      }
      // If the command already exists, will be updated instead
      // eslint-disable-next-line no-await-in-loop
      this.logger.info(await manager.create(SlashCommander.getCommandData(config)));
    }
  }

  async getCommandId(commandName) {
    const config = SlashCommander.CONFIG[commandName];
    let commands = null;
    if (config.global) {
      commands = this.client.client.application.commands;
    } else {
      commands = this.client.guild.commands;
    }
    return Object.values(commands).findValue((command) => command.name === commandName)?.id;
  }

  async getCommandIds() {
    return Object.keys(SlashCommander.CONFIG).map(
      (commandName) => this.client.client.application.commands.findValue(
        (command) => command.name === commandName,
      ),
    );
  }
}