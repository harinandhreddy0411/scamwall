const LIKELIHOOD = ['high', 'medium', 'low'];
const CATEGORY = [
  'kyc',
  'payment_request',
  'courier',
  'job_offer',
  'impersonation',
  'otp_only',
  'other',
  'none'
];

export const SCHEMA = {
  type: 'object',
  properties: {
    scam_likelihood: { type: 'string', enum: LIKELIHOOD },
    category: { type: 'string', enum: CATEGORY },
    red_flag_phrases: { type: 'array', items: { type: 'string' } },
    needs_more_context: { type: 'boolean' }
  },
  required: [
    'scam_likelihood',
    'category',
    'red_flag_phrases',
    'needs_more_context'
  ]
};

export const MESSAGES = [
  {
    id: 'S1',
    expect: 'scam',
    text: 'URGENT: Your ExampleBank account will be blocked today. Update your KYC now at http://examplebank-kyc-verify.example/login and share the OTP you receive.'
  },
  {
    id: 'S2',
    expect: 'scam',
    text: 'This is Officer Rana from the Example Cyber Cell. A parcel in your name contains illegal items and you are under digital arrest. Stay on this video call and transfer a security deposit to clear your case.'
  },
  {
    id: 'S3',
    expect: 'scam',
    text: 'Congratulations! You are selected for a work-from-home job at ExampleCorp. Earn 5000 per day. Pay a registration fee of 999 to examplehr@exampleupi to confirm your seat.'
  },
  {
    id: 'S4',
    expect: 'scam, needs context',
    text: 'Sorry, I sent my OTP to your number by mistake. Please forward the code you just received.'
  },
  {
    id: 'L1',
    expect: 'legitimate',
    text: 'ExampleBank: Rs 1,250.00 debited from A/c XX1234 on 14-Nov at ExampleMart. If this was not you, call the number on the back of your card. Never share your OTP with anyone.'
  },
  {
    id: 'L2',
    expect: 'legitimate',
    text: 'ExampleCourier: Your parcel is out for delivery today between 2 PM and 6 PM. Track it in the ExampleCourier app. No payment is needed.'
  },
  {
    id: 'O1',
    expect: 'needs context',
    text: '482913 is your one-time password for ExampleApp login. It is valid for 10 minutes. Do not share it with anyone.'
  }
];

export function buildStructuredPrompt(message) {
  return [
    'You review one message that someone received and that may be a scam.',
    'Answer only with JSON that follows the schema.',
    '- scam_likelihood: how likely the message is a scam, judged from the text alone.',
    '- category: the kind of scam it resembles, or "none" if it looks ordinary.',
    '- red_flag_phrases: up to 5 phrases copied exactly, character for character, from the message. Use an empty list if there are none.',
    '- needs_more_context: true if the text alone cannot settle it, for example a message that only contains a one-time code.',
    '',
    'Message:',
    message
  ].join('\n');
}

function evaluate(raw, message) {
  let parsed;
  try {
    parsed = JSON.parse(String(raw).trim());
  } catch {
    return { validJson: false, schemaOk: false, parsed: null, phrases: 0, exact: 0 };
  }
  if (parsed === null || typeof parsed !== 'object') {
    return { validJson: false, schemaOk: false, parsed: null, phrases: 0, exact: 0 };
  }
  const list = Array.isArray(parsed.red_flag_phrases)
    ? parsed.red_flag_phrases
    : [];
  const strings = list.filter((item) => typeof item === 'string');
  const schemaOk =
    LIKELIHOOD.includes(parsed.scam_likelihood) &&
    CATEGORY.includes(parsed.category) &&
    typeof parsed.needs_more_context === 'boolean' &&
    Array.isArray(parsed.red_flag_phrases) &&
    strings.length === list.length;
  const exact = strings.filter(
    (item) => item.length > 0 && message.includes(item)
  ).length;
  return { validJson: true, schemaOk, parsed, phrases: list.length, exact };
}

function tally(values) {
  const counts = new Map();
  values.forEach((value) => {
    const key = String(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()].map(([key, n]) => key + ' x' + n).join(', ');
}

export function summarize(item, runs) {
  const total = runs.length;
  const failed = runs.filter((run) => run.error);
  const answered = runs.filter((run) => !run.error);
  const evaluations = answered.map((run) => evaluate(run.raw, item.text));
  const parsedOnly = evaluations.filter((entry) => entry.parsed);
  const times = answered.map((run) => run.ms);

  const lines = [];
  const head = item.id + ' [expect: ' + item.expect + ']';

  if (failed.length > 0) {
    lines.push(
      head + ' | errors ' + failed.length + '/' + total + ' | first error: ' + failed[0].error
    );
  }
  if (answered.length === 0) {
    return lines;
  }

  const average = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  lines.push(
    head +
      ' | sources: ' + tally(answered.map((run) => run.source)) +
      ' | json valid ' + evaluations.filter((e) => e.validJson).length + '/' + answered.length +
      ' | schema ok ' + evaluations.filter((e) => e.schemaOk).length + '/' + answered.length +
      ' | latency avg ' + average + ' ms (min ' + Math.min(...times) + ', max ' + Math.max(...times) + ')'
  );

  if (parsedOnly.length > 0) {
    const phrasesTotal = parsedOnly.reduce((sum, e) => sum + e.phrases, 0);
    const phrasesExact = parsedOnly.reduce((sum, e) => sum + e.exact, 0);
    lines.push(
      '    likelihood: ' + tally(parsedOnly.map((e) => e.parsed.scam_likelihood)) +
        ' | category: ' + tally(parsedOnly.map((e) => e.parsed.category)) +
        ' | needs_context: ' + tally(parsedOnly.map((e) => e.parsed.needs_more_context)) +
        ' | phrases exact ' + phrasesExact + '/' + phrasesTotal
    );
    const sample = parsedOnly[0].parsed.red_flag_phrases;
    lines.push('    sample phrases: ' + JSON.stringify(Array.isArray(sample) ? sample.slice(0, 3) : sample));
  }

  const bad = answered.find((run, index) => !evaluations[index].validJson);
  if (bad) {
    lines.push('    bad output sample: ' + String(bad.raw).slice(0, 160).replace(/\s+/g, ' '));
  }

  return lines;
}
