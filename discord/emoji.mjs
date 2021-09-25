import dismoji from 'discord-emoji';
import enm from 'emoji-name-map';

// const EMOJI_ONE = enm.get('one');
// const EMOJI_TWO = enm.get('two');
const BOOM = enm.get('boom');

/**
 * Container object for information about a Discord emoji
 */
export default class Emoji {
  constructor(text, name, unicode, replacement) {
    this.text = text;
    this.name = name;
    this.id = null;
    this.unicode = unicode || null;
    this.replacement = replacement || null;
  }

  toString() {
    return (
      'Emoji('
      + `text:'${this.text}', `
      + `name:'${this.name}', `
      + `unicode:'${this.unicode}', `
      + `replacement:'${this.replacement}'`
      + ')'
    );
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
   * Given a Unicode character representing an emoji, returns a Boolean
   * indicating whether that's a valid Discord emoji.
   *
   * @param {string} symbol - Single Unicode emoji character
   * @returns {boolean} Boolean indicating whether the character was found to be
   *   a valid Discord emoji
   */
  static getDismojiByUnicode(symbol) {
    return Object.values(dismoji).some(
      (category) => Object.values(category).some((emoji) => emoji === symbol),
    );
  }

  /**
   * Replace emoji text in the given message with the replacements indicated in
   * the array of Emoji objects.
   *
   * For each Emoji, if the Emoji indicates a replacement, search and replace
   * the emoji's text within the message text with the emoji's replacement text.
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
   * Return placeholder BOOM emoji for the given text/name.
   * @param {string} text - Full raw text of the emoji as it is in the message
   * @param {string} name - Name of the emoji without colons
   * @returns {Emoji} new Emoji instance with the given text and name using the
   *   bomb emoji, `boom`
   */
  static boom(text, name) {
    return new Emoji(text, name, BOOM, BOOM);
  }
}
