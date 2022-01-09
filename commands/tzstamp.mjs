import { DateTime } from 'luxon';

export default function tzstamp(msg, offset = 'UTC+0', raw = false) {
  const replacer = (match) => {
    let dt = DateTime.fromFormat(match, 'yyyy/MM/dd HH:mm');
    dt = dt.setZone(offset, { keepLocalTime: true });
    let replacement = `<t:${dt.valueOf() / 1000}:F>`;
    if (raw) {
      replacement = `\`${replacement}\``;
    }
    return replacement;
  };

  const newMsg = msg.replaceAll(/(\d{4}\/\d{2}\/\d{2} \d{2}:?\d{2})/g, replacer);

  if (newMsg === msg) {
    return 'Could not find a suitable timestamp. Use yyyy/MM/dd HH:mm.';
  }
  return newMsg;
}
