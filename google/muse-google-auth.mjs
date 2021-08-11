import { promises as fs } from 'fs';
import readline from 'readline';
import { promisify } from 'util';

import { google } from 'googleapis';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export default class MuseGoogleAuth {
  /**
   * Creates a new Google OAuth2 client instance
   * @constructor
   */
  constructor(logger) {
    this.logger = logger.child({ class: 'MuseGoogleAuth' });
    this.oAuth2Client = null;

    // Path to file containing client secrets
    this.credentialsPath = process.env.GOOGLE_CREDENTIALS || 'credentials.json';

    // This file stores the user's access and refresh tokens, and is created
    // automatically when the authorization flow completes for the first time
    this.tokenPath = process.env.GOOGLE_TOKEN || 'token.json';
  }

  async getAuthorizedClient() {
    const credentials = await this.getClientSecrets();
    // eslint-disable-next-line camelcase
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    await this.authorizeClient();
    return this.oAuth2Client;
  }

  async getClientSecrets() {
    // Load client secrets from a local file
    try {
      const credentials = await fs.readFile(this.credentialsPath);
      return JSON.parse(credentials);
    } catch (err) {
      this.logger.info(err, `Error loading client secret from file '${this.credentialsPath}'`);
      throw err;
    }
  }

  async authorizeClient() {
    this.logger.info('Getting OAuth2 client token');
    const token = await this.getToken();
    this.logger.info('Setting OAuth2 client credentials');
    this.logger.debug(token, 'Setting tokens');
    this.oAuth2Client.setCredentials(token);
  }

  async readToken() {
    try {
      const tokens = await fs.readFile(this.tokenPath);
      return JSON.parse(tokens);
    } catch (err) {
      this.logger.info(err, `Unable to load tokens from file '${this.tokenPath}'`);
      throw err;
    }
  }

  async writeToken(tokens) {
    try {
      await fs.writeFile(this.tokenPath, JSON.stringify(tokens));
      this.logger.info(`New tokens stored to file '${this.tokenPath}'`);
    } catch (err) {
      this.logger.info(err, `Error while writing new tokens to file '${this.tokenPath}'`);
      throw err;
    }
  }

  async getToken() {
    try {
      return await this.readToken();
    } catch (err) {
      this.logger.error(err, `Unable to load tokens, getting new token from user`);
      return this.getNewToken();
    }
  }

  async getNewToken() {
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    this.logger.info('Querying user for new token');
    // eslint-disable-next-line no-console
    console.log(`Authorize this app by visiting this url: '${authUrl}'`);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const question = promisify(rl.question).bind(rl);
    const code = await question('Enter the code from that page here: ');
    rl.close();
    let tokens = null;
    try {
      tokens = await this.oAuth2Client.getToken(code);
    } catch (err) {
      this.logger.info(err, 'Error while trying to retrieve access token');
      throw err;
    }
    tokens = tokens.tokens;
    await this.writeToken();
    return tokens;
  }
}
