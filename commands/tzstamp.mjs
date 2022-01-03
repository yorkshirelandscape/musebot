import { DateTime } from 'luxon'

export default function timestamp(msg, offset = null, raw = false) {

    const replacer = (match) => {
        let dt = DateTime.fromFormat(match, 'yyyy/MM/dd HH:mm')
        if (offset === null) {
        dt = dt.setZone('UTC+0', {keepLocalTime: true})
        } else {
        dt = dt.setZone(offset, {keepLocalTime: true})
        }
        return `${raw ? '`' : ''}<t:${dt.valueOf() / 1000}:F>${raw ? '`' : ''}`;
    }

    const newMsg = msg.replaceAll(/((\d{4})\/(\d{2})\/(\d{2}) (\d{2}):?(\d{2}))/g, replacer);
    
    if (newMsg === msg) {
        return 'Could not find a suitable timestamp. Use yyyy/MM/dd HH:mm.';
    } else {
        return newMsg
    }

}

