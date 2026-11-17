import { ASK_VALUES } from './structured.js';

export const LABELS = {
  red: 'Red flags found',
  warn: 'Looks suspicious - not confirmed',
  none: 'No red flags found - not a guarantee',
  cant: "Verify first - the text alone can't settle this"
};

const LIKELIHOODS = ['high', 'medium', 'low'];

const ASK_TEXT = {
  pay_money: 'pay money',
  share_code_or_pin: 'share a code or PIN',
  share_documents_or_details: 'share documents or personal details',
  install_app_or_remote_access: 'install an app or give remote access',
  click_link: 'open a link',
  call_or_message_number: 'call or message a number',
  join_group_or_chat: 'join a group or chat',
  other: 'do something else'
};

export function describeAsks(opinion) {
  if (!opinion || opinion.asks.length === 0) {
    return 'nothing';
  }
  return opinion.asks.map((ask) => ASK_TEXT[ask]).join(', ');
}

export function parseOpinion(raw) {
  let parsed;
  try {
    parsed = JSON.parse(String(raw).trim());
  } catch {
    return null;
  }
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    !LIKELIHOODS.includes(parsed.scam_likelihood)
  ) {
    return null;
  }
  const asks = Array.isArray(parsed.asks_reader_to)
    ? [...new Set(parsed.asks_reader_to.filter((ask) => ASK_VALUES.includes(ask)))]
    : [];
  return {
    likelihood: parsed.scam_likelihood,
    asks,
    directed: parsed.addresses_reviewer === true
  };
}

export function hasOtpCode(text) {
  return (
    /\b(?:otp|one[- ]time (?:password|code|pin)|verification code|login code)\b/i.test(text) &&
    /\b\d{4,8}\b/.test(text)
  );
}

function evidenceLevel(signals) {
  const strong = signals.filter((signal) => signal.strength === 'strong');
  const weakKinds = new Set(
    signals.filter((signal) => signal.strength === 'weak').map((signal) => signal.id)
  );
  if (strong.length > 0 || weakKinds.size >= 2) {
    return 'strong';
  }
  return weakKinds.size === 1 ? 'weak' : 'none';
}

export function modelOnlyKey(opinion) {
  if (!opinion) {
    return null;
  }
  if (opinion.likelihood === 'high') {
    return 'red';
  }
  if (opinion.directed) {
    return 'warn';
  }
  return opinion.likelihood === 'medium' ? 'cant' : 'none';
}

function effectiveLikelihood(opinion, mediumWithoutAsksIsLow) {
  if (!opinion) {
    return null;
  }
  if (
    mediumWithoutAsksIsLow &&
    opinion.likelihood === 'medium' &&
    opinion.asks.length === 0
  ) {
    return 'low';
  }
  return opinion.likelihood;
}

export function decide(signals, opinion, text, { mediumWithoutAsksIsLow = false } = {}) {
  const level = evidenceLevel(signals);
  const likelihood = effectiveLikelihood(opinion, mediumWithoutAsksIsLow);

  if (level === 'strong') {
    return { key: 'red', code: 'strong_rules', reason: 'concrete red flags found by the rules' };
  }
  if (opinion && opinion.directed) {
    return {
      key: 'warn',
      code: 'directed',
      reason: 'the AI saw text in the message that is written for an AI reader, not for you'
    };
  }
  if (hasOtpCode(text)) {
    return {
      key: 'cant',
      code: 'otp',
      reason: 'a one-time code is present and the text cannot show what it is for'
    };
  }
  if (likelihood === 'high') {
    return {
      key: 'warn',
      code: level === 'weak' ? 'uneasy_weak' : 'uneasy',
      reason:
        level === 'weak'
          ? 'one weak sign from the rules and the on-device AI is uneasy'
          : 'the on-device AI is uneasy but the rules found no concrete red flag'
    };
  }
  if (level === 'weak') {
    return { key: 'cant', code: 'weak_only', reason: 'one weak sign that nothing else confirms' };
  }
  if (likelihood === 'medium') {
    return {
      key: 'cant',
      code: 'unsure',
      reason: 'the on-device AI is unsure and the rules found nothing concrete'
    };
  }
  return { key: 'none', code: 'clear', reason: 'no red flags from the rules or the on-device AI' };
}

export function decideWithModel(signals, opinion, text, options) {
  const result = decide(signals, opinion, text, options);
  if (opinion || result.key !== 'none') {
    return result;
  }
  return {
    key: 'cant',
    code: 'no_model',
    reason: 'the on-device check gave no usable answer and the rules found nothing concrete'
  };
}

export function mergeOpinions(device, cloud) {
  if (!cloud) {
    return device;
  }
  if (!device) {
    return cloud;
  }
  let likelihood;
  if (cloud.likelihood === 'low') {
    likelihood = device.likelihood === 'high' ? 'medium' : 'low';
  } else if (cloud.likelihood === 'high' || device.likelihood === 'high') {
    likelihood = 'high';
  } else {
    likelihood = 'medium';
  }
  return { likelihood, asks: cloud.asks, directed: Boolean(device.directed || cloud.directed) };
}
