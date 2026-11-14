export const SCHEMA = {
  type: 'object',
  properties: {
    scam_likelihood: { type: 'string', enum: ['high', 'medium', 'low'] },
    category: {
      type: 'string',
      enum: [
        'kyc',
        'payment_request',
        'courier',
        'job_offer',
        'impersonation',
        'otp_only',
        'other',
        'none'
      ]
    }
  },
  required: ['scam_likelihood', 'category']
};

export function buildPrompt(message) {
  return [
    'You review one message that someone received. Decide how likely it is to be a scam, judging only from the text.',
    '',
    'Rules:',
    '- A message that only informs (a bank alert, a delivery update, a reminder, a login code) and asks the reader to do nothing risky is normally not a scam.',
    '- Safety warnings such as "never share your OTP" or "call the number on your card" appear in genuine messages. Never count a warning as a red flag.',
    '- Answer "high" only when the message asks the reader to do something risky: pay money or a fee, share a code or PIN, install an app, click a link under a threat or deadline, or stay on a call.',
    '- Answer "medium" when the message is unusual but asks for nothing risky. Answer "low" when it looks ordinary.',
    '- category is the kind of scam it resembles, or "none" if it looks ordinary.',
    '',
    'Answer only with JSON that follows the schema.',
    '',
    'Message:',
    message
  ].join('\n');
}
