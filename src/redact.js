const RULES = [
  {
    label: 'link',
    token: '[link]',
    pattern:
      /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|tiny\.cc)\/[^\s<>"']+/gi
  },
  {
    label: 'email address',
    token: '[email address]',
    pattern: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
  },
  {
    label: 'UPI ID',
    token: '[UPI ID]',
    pattern: /\b[a-z0-9._-]{2,}@[a-z][a-z0-9]+\b/gi
  },
  {
    label: 'phone number',
    token: '[phone number]',
    pattern: /(?<!\d)(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g
  },
  {
    label: 'card or ID number',
    token: '[number]',
    pattern: /\b\d{4}[ -]\d{4}[ -]\d{4}(?:[ -]\d{4})?\b/g
  },
  {
    label: 'tax ID',
    token: '[ID]',
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g
  },
  {
    label: 'long number',
    token: '[number]',
    pattern: /\b\d{6,}\b/g
  }
];

export function redact(text) {
  let output = text;
  const items = [];
  for (const rule of RULES) {
    let count = 0;
    output = output.replace(rule.pattern, () => {
      count += 1;
      return rule.token;
    });
    if (count > 0) {
      items.push({ label: rule.label, count });
    }
  }
  return { text: output, items };
}

export function describeRedactions(items) {
  if (items.length === 0) {
    return 'Nothing needed hiding.';
  }
  const parts = items.map(
    ({ label, count }) => count + ' ' + label + (count > 1 ? 's' : '')
  );
  return 'Hidden automatically: ' + parts.join(', ') + '.';
}
