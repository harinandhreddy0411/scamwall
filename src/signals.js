const ALL_TARGETS =
  'otp|pin|cvv|password|passcode|one[- ]time (?:password|code|pin)|verification code|security code|(?:the|this|that) code (?:you (?:just )?(?:received|receive|get|got)|you|that|sent|just received|just|received)';
const SECRET_TARGETS = 'pin|cvv|password|passcode';
const SHARE_VERBS =
  'shar(?:e|ing)|send(?:ing)?|forward(?:ing)?|tell(?:ing)?|giv(?:e|ing)|read out|provid(?:e|ing)|reply(?:ing)? with';
const DOC_VERBS = SHARE_VERBS + '|upload(?:ing)?|submit(?:ting)?|attach(?:ing)?';
const DOC_TARGETS =
  'aadhaar|aadhar|pan(?: card| numbers?)?|passport|id proof|photo id|voter id|driving licen[cs]e|selfie|card number|card details|account number|bank statement';
const ENTER_VERBS = 'enter|type|submit|confirm';
const HINGLISH_VERBS =
  'bhejo|bhej do|bhej kar|bhejiye|bhejein|batao|bata do|batayein|share karo';

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
  /\b(?:digital arrest|under arrest|arrested|arrest|warrant|illegal items|illegal|prohibited (?:material|items|goods)|contraband|money laundering|legal action|case (?:(?:has been|have been|is|was) )?(?:against|registered|filed|lodged)|seized)\b/i;

const REMOTE =
  /\b(?:anydesk|teamviewer|quick ?support|rustdesk|screen ?shar(?:e|ing)|share your screen|remote (?:access|support|control)|stay on (?:this|the) (?:video )?call|(?:do not|don't|dont) (?:disconnect|hang up|cut) (?:the |this )?call)\b|\.apk\b|\*\d{2,3}\*\d{8,}#?/gi;

const PHONE = String.raw`(?<!\d)(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)`;
const CALLBACK = new RegExp(
  String.raw`\b(?:call(?:ing)?|contact|dial|whatsapp|message|text|reach(?:able)?(?:\s+us)?(?:\s+(?:on|at))?)\b(?!\s+me\b)[^.!?\n]{0,40}?` + PHONE,
  'gi'
);
const WINDFALL =
  /\b(?:lucky draw|lottery|jackpot|you (?:have )?won|dear winner|claim your (?:prize|reward|gift)|gift parcel|inheritance)\b/gi;
const TOO_GOOD =
  /\b(?:(?:earn|make)\b[^.!?\n]{0,25}?\b(?:daily|per day|a day|every day|per week|a week|per month|a month|monthly)|guaranteed (?:returns?|profit|income)|risk[- ]free (?:returns?|profit)|(?:double|triple) your (?:money|investment)|stock tips?|\d{2,3}% returns|(?:instant|quick) loans?|no (?:credit|cibil) (?:check|score)|no documents? (?:needed|required)|without (?:any )?documents?)\b/gi;
const PRETEXT =
  /\bkyc\b[^.!?\n]{0,40}?\b(?:expired|pending|update|updation|suspended|incomplete|verify|verification)\b|\b(?:update|complete|verify)\b[^.!?\n]{0,20}?\bkyc\b/gi;
const PRETEXT_SAFE = /\b(?:successful(?:ly)?|completed|already done)\b/i;
const INSTALL_APP = /\b(?:download|install)\b[^.!?\n]{0,30}?\bapp\b/gi;

const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|tiny\.cc)\/[^\s<>"']+/gi;
const SHORTENER_HOST = /^(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|tiny\.cc)$/;
const LINK_KEYWORDS = /kyc|verify|login|update|secure|refund|claim|reward|prize|bonus|lucky/;

const URGENCY =
  /\b(?:urgent(?:ly)?|immediately|right now|act now|last chance|final notice|expires? today|(?:will|shall) be (?:blocked|suspended|disconnected|deactivated|closed|frozen|cut)|(?:blocked|suspended|disconnected) (?:today|tonight)|turant|jaldi|(?:block|band|freeze|suspend|cancel) ho jaye(?:ga|nga))\b/gi;

export const SIGNAL_LABELS = {
  otp_ask: 'Asks for a code, PIN or personal documents',
  payment: 'Asks you to pay money',
  remote: 'Asks you to install an app, dial a code or stay on a call',
  impersonation: 'Claims to be an official and threatens you',
  link: 'Suspicious-looking link',
  urgency: 'Pressures you to act fast',
  callback: 'Tells you to call or message a mobile number',
  windfall: 'Promises a prize or windfall',
  too_good: 'Promises easy money, returns or loans',
  pretext: 'Uses a KYC or account-update pretext'
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
    '\\b(?:' + ALL_TARGETS + '|' + DOC_TARGETS + ')\\b([^.!?\\n]{0,20}?)\\b(?:' + HINGLISH_VERBS + ')\\b',
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
    ...scanAsk(text, DOC_VERBS, DOC_TARGETS),
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

function sentenceAround(text, index) {
  const before = text.slice(0, index).search(/[.!?\n][^.!?\n]*$/);
  const start = before === -1 ? 0 : before + 1;
  const after = text.slice(index).search(/[.!?\n]/);
  const end = after === -1 ? text.length : index + after;
  return text.slice(start, end);
}

function pretextSignals(text) {
  return plainMatches(text, PRETEXT).filter(
    ({ start }) => !PRETEXT_SAFE.test(sentenceAround(text, start))
  );
}

function installSignals(text) {
  return plainMatches(text, INSTALL_APP).filter(
    ({ start }) => !NEGATION_BEFORE.test(text.slice(0, start))
  );
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

  const remoteStrong = plainMatches(text, REMOTE);
  if (remoteStrong.length > 0) {
    add('remote', 'strong', remoteStrong);
  } else {
    add('remote', 'weak', installSignals(text));
  }
  add('impersonation', 'strong', impersonationSignals(text));
  add('link', 'weak', linkSignals(text));
  add('urgency', 'weak', plainMatches(text, URGENCY));
  add('callback', 'weak', plainMatches(text, CALLBACK));
  add('windfall', 'weak', plainMatches(text, WINDFALL));
  add('too_good', 'weak', plainMatches(text, TOO_GOOD));
  add('pretext', 'weak', pretextSignals(text));

  return signals.sort((a, b) => a.start - b.start);
}
