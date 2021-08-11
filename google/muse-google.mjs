import { google } from 'googleapis';

import MuseGoogleAuth from './muse-google-auth.mjs';

const REFS = {
  BOT_STATE: 'Dashboard!B4',
  round: 'Dashboard!B2',
  song: 'Dashboard!B3',
  header: 'Dashboard!D1',
  footer: 'Dashboard!D8',
  match: 'Dashboard!D3:E6',
  size: 'Dashboard!B5',
  year: 'Dashboard!B1',
};

export default class MuseGoogle {
  /**
   * Creates a new MuseGoogle instance to let MuseBot interact with Sheets
   * @constructor
   */
  constructor(logger) {
    this.logger = logger.child({ class: 'MuseGoogle' });
    this.museGoogleAuth = new MuseGoogleAuth(this.logger);
    this.oAuth2Client = null;
    this.spreadsheetId = null;
    this.initialized = false;
  }

  /**
   * Initialization function which authorizes the client.
   *
   * Must be called before doing any real work with the client.
   */
  async init() {
    this.spreadsheetId = process.env.SPREADSHEET_ID;
    this.oAuth2Client = await this.museGoogleAuth.getAuthorizedClient();
    this.initialized = true;
  }

  /**
   * Internal function to check that the client has been initialized.
   *
   * If the client is not initialized when this is invoked, it throws an error.
   */
  requireInit() {
    if (!this.initialized) {
      throw new Error('MuseGoogle client was not initialized');
    }
  }

  async testAuthorization() {
    this.requireInit();
    this.logger.info('Testing that client is able to access the sheet');
    try {
      const val = await this.getBotState();
      this.logger.debug(`Found botState value: ${val}`);
    } catch (err) {
      this.logger.error(err, 'Unable to access sheet');
      throw err;
    }
    this.logger.info('Successfully accessed Google sheet');
    return true;
  }

  getSheets() {
    this.requireInit();
    return google.sheets({ version: 'v4', auth: this.oAuth2Client });
  }

  async getValue(range) {
    this.requireInit();
    const sheets = this.getSheets();
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });
      return response.data.values[0][0];
    } catch (err) {
      this.logger.error(err, `getValue API returned an error for range "${range}"`);
      throw err;
    }
  }

  async getValues(range) {
    this.requireInit();
    const sheets = this.getSheets();
    try {
      const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: range,
      });
      return response.data.valueRanges;
    } catch (err) {
      this.logger.error(err, `getValues API returned an error for ranges "${range}"`);
      throw err;
    }
  }

  async setValue(range, val) {
    this.requireInit();
    const sheets = this.getSheets();
    try {
      const confirm = await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          majorDimension: 'ROWS',
          values: [[val]],
        },
      });
      return confirm.config.data.values[0];
    } catch (err) {
      this.logger.error(err, `setValue API returned an error for range "${range}" and value "${val}"`);
      throw err;
    }
  }

  async getBotState() {
    this.requireInit();
    return this.getValue(REFS.BOT_STATE);
  }
}
