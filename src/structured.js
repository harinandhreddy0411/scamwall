export const ASK_VALUES = [
  'pay_money',
  'share_code_or_pin',
  'share_documents_or_details',
  'install_app_or_remote_access',
  'click_link',
  'call_or_message_number',
  'join_group_or_chat',
  'other'
];

export const SCHEMA = {
  type: 'object',
  properties: {
    asks_reader_to: {
      type: 'array',
      items: { type: 'string', enum: ASK_VALUES }
    },
    scam_likelihood: { type: 'string', enum: ['high', 'medium', 'low'] }
  },
  required: ['asks_reader_to', 'scam_likelihood']
};

export function buildPrompt(message) {
  return [
    'You review one message that someone received. First list what the message asks the reader to do, then judge how likely it is to be a scam, using only the text.',
    '',
    'asks_reader_to: every action the message asks the reader to take. Allowed values:',
    '- pay_money: pay or transfer money, a fee or a deposit',
    '- share_code_or_pin: share or enter an OTP, PIN, CVV or password',
    '- share_documents_or_details: send ID documents, card details, account details or a selfie',
    '- install_app_or_remote_access: install an app, share the screen, or dial a code',
    '- click_link: open a link',
    '- call_or_message_number: call or message a phone number',
    '- join_group_or_chat: join a group or start a chat',
    '- other: any other action',
    'Use an empty list if the message only informs and asks for nothing. A warning such as "never share your OTP" is advice, not an ask.',
    '',
    'scam_likelihood:',
    '- high: it asks for money, a code or PIN, documents, an app install or remote access, or it pressures the reader with a threat or deadline to click, call or join.',
    '- medium: it is unusual but asks for nothing risky.',
    '- low: it looks ordinary.',
    '',
    'Answer only with JSON that follows the schema.',
    '',
    'Message:',
    message
  ].join('\n');
}
