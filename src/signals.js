const ALL_TARGETS =
  'otp|pin|cvv|password|passcode|one[- ]time (?:password|code|pin)|verification code|security code|(?:the|this|that) code (?:you (?:just )?(?:received|receive|get|got)|you|that|sent|just received|just|received)';
const SECRET_TARGETS = 'pin|cvv|password|passcode';
const SHARE_VERBS = 'share|send|forward|tell|give|read out|provide|reply with';
const ENTER_VERBS = 'enter|type|submit|confirm';
const HINGLISH_VERBS = 'bhejo|bhej do|bhejiye|batao|bata do|share karo';

const NEGATION_BEFORE =
  /\b(?:never|not|don'?t|won'?t|shouldn'?t|mat|nahi|nahin)\s+(?:\w+\s+){0,2}$/i;
const NEGATION_GAP = /\b(?:mat|nahi|nahin)\b/i;
const DELIVERY_CONTEXT = /\bdelivery\s+(?:partner|agent|executive|person|boy)\b/i;

const FEE_PHRASE =
  /\b(?:registration|processing|security|refundable|joining|verification|customs|clearance|activation|release|insurance)\s+(?:fees?|charges?|deposit|amount)\b/gi;
const NO_FEE_BEFORE = /\b(?:no|zero|nil|without|free)\s+$/i;
const UPI_ID = /\b[a-z0-9._-]{2,}@[a-z][a-z0-9]+\b(?!\.[a-z])/gi;
const PAY_VERB = /\b(?:pay|send|transfer|deposit|remit|bhejo|bhej do|bhejiye)\b/i;
const PAY_WEAK =
  /\b(?:pay|transfer|deposit|remit|send)\b[^.!?\n]{0,50}?(?:\brs\.?\s?\d[\d,]*(?:\.\d+)?|₹\s?\d[\d,]*(?:\.\d+)?|\brupees\b|\binr\b|\bamount\b|\bmoney\b|\bfees?\b|\bcharges?\b|\bdues?\b)/gi;

const AUTHORITY =
  /\b(?:officer|inspector|police|cbi|cyber cell|cyber crime|customs|narcotics|income tax|court)\b/i;
const THREAT =
  /\b(?:digital arrest|under arrest|arrested|arrest|warrant|illegal items|illegal|money laundering|legal action|case (?:against|registered|filed)|seized)\b/i;

const REMOTE =
  /\b(?:anydesk|teamviewer|quick ?support|rustdesk|screen ?shar(?:e|ing)|share your screen|remote (?:access|support|control)|stay on (?:this|the) (?:video )?call|(?:do not|don't|dont) (?:disconnect|hang up|cut) (?:the |this )?call)\b|\.apk\b/gi;

const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|tiny\.cc)\/[^\s<>"']+/gi;
const SHORTENER_HOST = /^(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|tiny\.cc)$/;
const LINK_KEYWORDS = /kyc|verify|login|update|secure|refund|claim|reward|prize|bonus|lucky/;

const URGENCY =
  /\b(?:urgent(?:ly)?|immediately|right now|act now|last chance|final notice|expires? today|(?:will|shall) be (?:blocked|suspended|disconnected|deactivated|closed|frozen)|(?:blocked|suspended|disconnected) (?:today|tonight)|turant|jaldi|block ho jayega)\b/gi;

export const SIGNAL_LABELS = {
  otp_ask: 'Asks you to share a code or PIN',
  payment: 'Asks you to pay money',
  remote: 'Asks you to install an app or stay on a call',
  impersonation: 'Claims to be an official and threatens you',
  link: 'Suspicious-looking link',
  urgency: 'Pressures you to act fast'
};

function scanAsk(text, verbs, targets) {
  const found = [];
  const verbPattern = new RegExp(
    '\\b(?:' + verbs + ')\\b(?=[^.!?\\n]{0,40}?\\b(?:' + targets + ')\\b)',
    'gi'
  );
  const targetPattern = new RegExp('\\b(?:' + targets + ')\\b', 'i');
  for (const match of text.matchAll(verbPattern)) {
    const start = match.index;
    const verbEnd = start + match[0].length;
    const target = targetPattern.exec(text.slice(verbEnd));
    if (!target) {
      continue;
    }
    const end = verbEnd + target.index + target[0].length;
    if (NEGATION_BEFORE.test(text.slice(0, start))) {
      continue;
    }
    if (DELIVERY_CONTEXT.test(text.slice(start, end + 60))) {
      continue;
    }
    found.push({ start, end });
  }
  return found;
}

function scanHinglishAsk(text) {
  const found = [];
  const pattern = new RegExp(
    '\\b(?:' + ALL_TARGETS + ')\\b([^.!?\\n]{0,20}?)\\b(?:' + HINGLISH_VERBS + ')\\b',
    'gi'
  );
  for (const match of text.matchAll(pattern)) {
    if (NEGATION_GAP.test(match[1])) {
      continue;
    }
    found.push({ start: match.index, end: match.index + match[0].length });
  }
  return found;
}

function otpSignals(text) {
  return [
    ...scanAsk(text, SHARE_VERBS, ALL_TARGETS),
    ...scanAsk(text, ENTER_VERBS, SECRET_TARGETS),
    ...scanHinglishAsk(text)
  ];
}

function strongPaymentSignals(text) {
  const found = [];
  for (const match of text.matchAll(FEE_PHRASE)) {
    if (NO_FEE_BEFORE.test(text.slice(0, match.index))) {
      continue;
    }
    found.push({ start: match.index, end: match.index + match[0].length });
  }
  if (PAY_VERB.test(text)) {
    for (const match of text.matchAll(UPI_ID)) {
      found.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return found;
}

function weakPaymentSignals(text) {
  return [...text.matchAll(PAY_WEAK)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length
  }));
}

function impersonationSignals(text) {
  const authority = AUTHORITY.exec(text);
  const threat = THREAT.exec(text);
  if (!authority || !threat) {
    return [];
  }
  return [authority, threat].map((match) => ({
    start: match.index,
    end: match.index + match[0].length
  }));
}

function plainMatches(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length
  }));
}

function isSuspiciousLink(url) {
  const lower = url.toLowerCase();
  if (lower.startsWith('http://')) {
    return true;
  }
  const host = lower.replace(/^https?:\/\//, '').split(/[/?#]/)[0];
  return (
    SHORTENER_HOST.test(host) ||
    /^\d{1,3}(?:\.\d{1,3}){3}/.test(host) ||
    host.includes('@') ||
    LINK_KEYWORDS.test(lower)
  );
}

function linkSignals(text) {
  const found = [];
  for (const match of text.matchAll(URL_PATTERN)) {
    const cleaned = match[0].replace(/[.,;:!?)\]]+$/, '');
    if (cleaned && isSuspiciousLink(cleaned)) {
      found.push({ start: match.index, end: match.index + cleaned.length });
    }
  }
  return found;
}

export function findSignals(text) {
  const signals = [];
  const add = (id, strength, ranges) => {
    ranges.forEach(({ start, end }) => {
      signals.push({ id, strength, start, end, text: text.slice(start, end) });
    });
  };

  add('otp_ask', 'strong', otpSignals(text));

  const strongPayment = strongPaymentSignals(text);
  if (strongPayment.length > 0) {
    add('payment', 'strong', strongPayment);
  } else {
    add('payment', 'weak', weakPaymentSignals(text));
  }

  add('remote', 'strong', plainMatches(text, REMOTE));
  add('impersonation', 'strong', impersonationSignals(text));
  add('link', 'weak', linkSignals(text));
  add('urgency', 'weak', plainMatches(text, URGENCY));

  return signals.sort((a, b) => a.start - b.start);
}
