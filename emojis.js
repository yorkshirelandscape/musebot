const dismoji = require('discord-emoji');
const enm = require('emoji-name-map');


export default class Emoji {
    constructor(logger) {
        this.logger = logger.child({ class: 'Emoji' });
        this.initialized = false;
    }

    async init() {
        this.EMOJI_ONE = enm.get('one');
        // const EMOJI_TWO = enm.get('two');
        this.EMOJI_BOOM = enm.get('boom');
    }
    

    async getDismojiByName(name) {
        for (const cat of Object.values(dismoji)) {
        if (typeof cat[name] !== 'undefined') {
            return cat[name];
        }
        }
        return null;
    };
    
    async getDismojiByUnicode(uni) {
        for (const cat of Object.values(dismoji)) {
        for (const emo of Object.values(cat)) {
            if (emo === uni) {
            return true;
            }
        }
        }
        return false;
    };
    
    async findEmojis(text) { Promise.all(Array.from(text.matchAll(/(?<=\u200b):?([^:\n]+):?(?=\u200b)/g), getEmoji)) };
    
    async replaceEmojis(text, emojis) {
        emojis.filter((emoji) => emoji.replacement)
        .reduce((curText, emoji) => (
            curText.replace(emoji.text, emoji.replacement)
        ), text)
    };
    
    async getEmoji(match) {
        const guild = client.guilds.cache.get(GUILD_ID);
    
        const text = match[0];
        const name = match[1];
    
        const emoji = {
        text,
        name,
        replacement: false,
        };
        const matchFunc = (ident) => ident.name === name;
        try {
        const guildEmoji = await guild.emojis.cache.find(matchFunc);
        emoji.id = guildEmoji.id;
        emoji.replacement = `<${text}${guildEmoji.id}>`;
        console.log(`Custom emoji found for "${name}"`, guildEmoji.id);
        } catch (err) {
        console.log(`No custom emoji found for "${name}"`);
        try {
            const clientEmoji = await client.emojis.cache.find(matchFunc);
            emoji.id = clientEmoji.id;
            emoji.replacement = `<${text}${clientEmoji.id}>`;
            console.log(`Client emoji found for "${name}"`, clientEmoji.id);
        } catch (errClient) {
            console.log(`No client emoji found for "${name}"`);
        }
        const sym = getDismojiByName(name);
        if (sym) {
            emoji.unicode = sym;
            console.log(`Dismoji emoji found for "${name}"`, sym);
        } else {
            console.log(`No dismoji emoji found for "${name}"`);
        }
        const uniTest = Array.from(text.matchAll(/:([a-zA-Z0-9_]+):/g));
        if (uniTest.length === 0) {
            const uniMatch = getDismojiByUnicode(text);
            if (uniMatch === true) {
            emoji.unicode = text;
            console.log(`Dismoji verified for "${text}"`);
            } else {
            console.log(`Dismoji not found for "${text}"`);
            }
        }
        }
        if (!emoji.id && !emoji.unicode) {
        console.log(`Emoji not found for "${name}"`);
        return {
            text,
            name,
            replacement: EMOJI_BOOM,
            unicode: EMOJI_BOOM,
        };
        }
        return emoji;
    };
    
    async react(message, emojis) {
        emojis.forEach(async (emoji) => {
        if (typeof emoji.id !== 'undefined' && emoji.id !== null) {
            await message.react(emoji.id);
        } else if (typeof emoji.unicode !== 'undefined') {
            await message.react(emoji.unicode);
        } else {
            console.log(`Can't react with invalid emoji "${emoji.name}"`);
        }
        });
    };
}