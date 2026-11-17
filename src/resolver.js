const PHONE_SHAPES = [
  /(?<!\d)(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g,
  /(?<!\d)1(?:800|860|900)[\s-]?\d{2,4}[\s-]?\d{3,4}(?:[\s-]?\d{3,4})?(?!\d)/g,
  /(?<!\d)0\d{2,4}[\s-]?\d{6,8}(?!\d)/g
];

const TLDS =
  'com|in|net|org|co|co\\.in|gov\\.in|bank\\.in|app|io|me|xyz|online|site|link|info|top|club|shop|live|vip|example';

const HOSTS = new RegExp(
  String.raw`\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|tiny\.cc)\/[^\s<>"']+|(?<![@\w.-])[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:` +
    TLDS +
    String.raw`)\b(?:\/[^\s<>"']*)?`,
  'gi'
);

export function normalizeNumber(raw) {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91') && /[6-9]/.test(digits[2])) {
    digits = digits.slice(2);
  }
  return digits.replace(/^0+/, '');
}

export function hostOf(raw) {
  let value = String(raw).trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  value = value.split(/[/?#]/)[0];
  if (value.includes('@')) {
    value = value.slice(value.lastIndexOf('@') + 1);
  }
  value = value.replace(/:\d+$/, '').replace(/\.+$/, '').replace(/^www\./, '');
  return value;
}

export function hostMatches(host, official) {
  return Boolean(official) && (host === official || host.endsWith('.' + official));
}

export function extractNumbers(text) {
  const seen = new Map();
  for (const shape of PHONE_SHAPES) {
    for (const match of text.matchAll(shape)) {
      const digits = normalizeNumber(match[0]);
      if (digits && !seen.has(digits)) {
        seen.set(digits, { raw: match[0].trim(), digits });
      }
    }
  }
  return [...seen.values()];
}

export function extractHosts(text) {
  const seen = new Map();
  for (const match of text.matchAll(HOSTS)) {
    const cleaned = match[0].replace(/[.,;:!?)\]]+$/, '');
    const host = hostOf(cleaned);
    if (host && host.includes('.') && !seen.has(host)) {
      seen.set(host, { raw: cleaned, host });
    }
  }
  return [...seen.values()];
}

export function describeMessage(text) {
  return { numbers: extractNumbers(text), hosts: extractHosts(text) };
}

export function compare(text, { number = '', site = '' } = {}) {
  const found = describeMessage(text);
  const result = { numbers: found.numbers, hosts: found.hosts, number: 'not-given', site: 'not-given' };

  const typedNumber = normalizeNumber(number);
  if (String(number).trim() !== '') {
    if (typedNumber.length < 6) {
      result.number = 'invalid';
    } else if (found.numbers.length === 0) {
      result.number = 'absent';
    } else {
      result.number = found.numbers.some((item) => item.digits === typedNumber) ? 'match' : 'mismatch';
    }
  }

  const typedSite = hostOf(site);
  if (String(site).trim() !== '') {
    if (!typedSite.includes('.')) {
      result.site = 'invalid';
    } else if (found.hosts.length === 0) {
      result.site = 'absent';
    } else {
      result.site = found.hosts.some((item) => hostMatches(item.host, typedSite)) ? 'match' : 'mismatch';
    }
  }

  result.mismatch = result.number === 'mismatch' || result.site === 'mismatch';
  result.matched = !result.mismatch && (result.number === 'match' || result.site === 'match');
  return result;
}
