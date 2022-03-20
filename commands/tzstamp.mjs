import { DateTime } from 'luxon';

export default function tzstamp(msg, offset = 'UTC+0', raw = false) {
  const replacer = (match) => {
    let dt = DateTime.fromFormat(match, 'yyyy/MM/dd HH:mm');
    dt = dt.setZone(offset, { keepLocalTime: true });
    if (dt.invalid) {
      throw new Error(`${dt.invalid.reason}: ${dt.invalid.explanation}`);
    }
    let replacement = `<t:${dt.valueOf() / 1000}:F>`;
    if (raw) {
      replacement = `\`${replacement}\``;
    }
    return replacement;
  };

  return msg.replaceAll(/(\d{4}\/\d{2}\/\d{2} \d{2}:?\d{2})/g, replacer);
}
