export const LABELS = {
  red: 'Red flags found',
  none: 'No red flags found - not a guarantee',
  cant: "Can't judge from text alone"
};

const LIKELIHOODS = ['high', 'medium', 'low'];

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
  return {
    likelihood: parsed.scam_likelihood,
    category: typeof parsed.category === 'string' ? parsed.category : 'unknown'
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
  return opinion.likelihood === 'medium' ? 'cant' : 'none';
}

export function decideWithModel(signals, opinion, text) {
  const result = decide(signals, opinion, text);
  if (opinion || result.key !== 'none') {
    return result;
  }
  return {
    key: 'cant',
    reason: 'the on-device check gave no usable answer and the rules found nothing concrete'
  };
}

export function decide(signals, opinion, text) {
  const level = evidenceLevel(signals);
  const likelihood = opinion ? opinion.likelihood : null;

  if (level === 'strong') {
    return { key: 'red', reason: 'concrete red flags found by the rules' };
  }
  if (hasOtpCode(text)) {
    return { key: 'cant', reason: 'a one-time code is present and the text cannot show what it is for' };
  }
  if (level === 'weak') {
    if (likelihood === 'high') {
      return { key: 'red', reason: 'one weak sign and the model agrees' };
    }
    return { key: 'cant', reason: 'one weak sign that nothing else confirms' };
  }
  if (likelihood === 'high' || likelihood === 'medium') {
    return { key: 'cant', reason: 'the model is suspicious but the rules found nothing concrete' };
  }
  return { key: 'none', reason: 'no red flags from the rules or the model' };
}
