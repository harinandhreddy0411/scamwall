import { init } from './firebase.js';
import { cleanText, findSignals, SIGNAL_LABELS } from './signals.js';
import { hasUnsupportedScript } from './script.js';
import { redact, describeRedactions } from './redact.js';
import { buildMarks } from './marks.js';
import { loadRemoteConfig, mergeConfig, readUrlConfig } from './config.js';
import { SAMPLES } from './samples.js';
import { askModel } from './model.js';
import { compare, describeMessage } from './resolver.js';
import { buildPrompt } from './structured.js';
import { LABELS, decideWithModel, describeAsks, mergeOpinions } from './verdict.js';

const GLYPHS = {
  red:
    '<path d="M24 3 45 24 24 45 3 24Z" fill="currentColor"/>' +
    '<path d="M24 14v13" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="24" cy="33" r="2.6" fill="#fff"/>',
  warn:
    '<path d="M24 6 43 40H5Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M24 19v10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="24" cy="34.5" r="2.4" fill="currentColor"/>',
  none:
    '<circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" stroke-width="4"/>' +
    '<path d="M15 24h18" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
  cant:
    '<circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" stroke-width="4"/>' +
    '<path d="M24 5a19 19 0 0 1 0 38Z" fill="currentColor"/>'
};

const REASONS = {
  strong_rules: 'It does things scam messages do. The numbered marks show where.',
  otp:
    'It contains a one-time code. Whether that is a scam depends on who asked for it and why, and the text alone cannot show that.',
  uneasy: 'The AI is uneasy, but the rules found no concrete red flag.',
  uneasy_weak: 'One weak sign in the text, and the AI is uneasy as well. Not enough to call it a scam.',
  weak_only: 'One weak sign, and nothing else backs it up.',
  unsure: 'The AI is unsure and the rules found nothing concrete.',
  clear: 'The rules and the AI found nothing alarming in the text.',
  no_model: 'The AI check did not run, and the rules found nothing concrete.',
  script: 'The rules and the on-device AI read English. A cloud check can read this language.',
  strict: 'Strict mode is on, so "no red flags" is never shown.',
  mismatch:
    'The message gives a number or website that is not the one you typed from your card or the official app.',
  matched:
    'The only weak sign was a number or link, and it matches what you typed. That does not prove the message is genuine.'
};

const ADVICE_BY_CODE = {
  otp: 'Only enter this code in an app or site you opened yourself. Never read it out to someone who contacted you.',
  weak_only:
    'Contact the sender through a number on your card or the official app, never through details in this message.',
  unsure:
    'Contact the sender through a number on your card or the official app, never through details in this message.',
  no_model:
    'Run it again in desktop Chrome with the on-device AI, or ask the cloud for a second opinion below.',
  script:
    'Ask the cloud for a read of this language below, or ask someone who reads it. Do not act on it until then.',
  strict: 'Strict mode never shows "no red flags". Check through the official app before you act.',
  mismatch:
    'Do not use the number or link in this message. Contact the organisation through its official app or the number on your card.'
};

const ADVICE = {
  red:
    "Don't reply, click, call or pay. Contact the organisation through its official app or a number you already trust. If you already paid or shared a code, call 1930 or report at cybercrime.gov.in.",
  warn: "Don't act on it yet. Check with the sender through a channel you already trust.",
  none:
    'That is not a guarantee. If it asks for money, a code or an install, check with the sender first.',
  cant: 'Check with the sender through a channel you already trust before you act.'
};

const LIKELIHOOD_WORDS = {
  high: 'uneasy',
  medium: 'unsure',
  low: 'not alarmed'
};

const $ = (id) => document.getElementById(id);

const els = {
  message: $('message'),
  marked: $('marked'),
  check: $('check'),
  edit: $('edit'),
  clear: $('clear'),
  samples: $('samples'),
  status: $('status'),
  verdict: $('verdict'),
  vGlyph: $('v-glyph'),
  vLabel: $('v-label'),
  vReason: $('v-reason'),
  vNotice: $('v-notice'),
  vUpdate: $('v-update'),
  vWhy: $('v-why'),
  vAdvice: $('v-advice'),
  vDetails: $('v-details'),
  second: $('second'),
  checkself: $('checkself'),
  csFound: $('cs-found'),
  csNumberRow: $('cs-number-row'),
  csNumber: $('cs-number'),
  csSiteRow: $('cs-site-row'),
  csSite: $('cs-site'),
  csRun: $('cs-run'),
  csResult: $('cs-result'),
  cloudIdle: $('cloud-idle'),
  cloudOffer: $('cloud-offer'),
  cloudDone: $('cloud-done'),
  preview: $('preview'),
  redactNote: $('redact-note'),
  requestText: $('request-text'),
  send: $('send'),
  keep: $('keep'),
  offerError: $('offer-error'),
  sentText: $('sent-text'),
  answer: $('answer'),
  sentCount: $('sent-count'),
  ledger: $('ledger')
};

const ledger = [];

let config = { strictMode: false, cloudEnabled: true };
let models = null;
let devicePromise = null;
let deviceError = '';
let busy = false;
let state = null;

function createModels() {
  if (import.meta.env.DEV && window.__fakeModels) {
    return window.__fakeModels;
  }
  return init();
}

function applyConfig(next) {
  config = next;
  if (import.meta.env.DEV) {
    window.__config = config;
  }
  if (state && !busy) {
    renderVerdict(Boolean(state.cloud));
  } else {
    setIdleText('default');
  }
}

function setStatus(text, tone) {
  els.status.textContent = text;
  els.status.dataset.tone = tone ?? '';
}

function shortError(error) {
  return String((error && error.message) || error || 'unknown error')
    .replace(/\s+/g, ' ')
    .slice(0, 160);
}

function clock() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function setGate(open) {
  document.body.dataset.gate = open ? 'open' : 'closed';
}

function renderLedger() {
  const sent = ledger.reduce((sum, entry) => sum + (entry.requests ?? 0), 0);
  els.sentCount.textContent = String(sent);
  els.ledger.replaceChildren(
    ...[...ledger].reverse().map((entry) => {
      const item = document.createElement('li');
      item.dataset.kind = entry.kind;
      const time = document.createElement('time');
      time.textContent = entry.time;
      const text = document.createElement('span');
      text.textContent = entry.text;
      item.append(time, text);
      return item;
    })
  );
}

function addLedger(entry) {
  ledger.push({ ...entry, time: clock() });
  renderLedger();
}

function setBusy(value) {
  busy = value;
  const controls = [
    els.check,
    els.edit,
    els.clear,
    els.send,
    els.keep,
    els.second,
    els.csRun,
    ...els.samples.querySelectorAll('button')
  ];
  controls.forEach((control) => {
    control.disabled = value;
  });
  els.second.disabled = value || isOffline();
}

const IDLE_TEXT = {
  default:
    'Nothing is here. Your message has not left this device. If the first check is not enough, you can send a redacted copy for a second opinion from a larger AI.',
  red:
    'Nothing is here. The rules found a strong red flag, and a second opinion could not change that, so nothing was sent. Try a made-up message that ends at "Looks suspicious" or "Can\u2019t judge" to see the cloud path.',
  off: 'The cloud second opinion is switched off. Everything stays on this device.',
  offline: 'You are offline, so the cloud cannot be reached. Everything stays on this device.'
};

function setIdleText(kind) {
  let text = IDLE_TEXT[kind];
  if (!config.cloudEnabled) {
    text = IDLE_TEXT.off;
  } else if (isOffline() && kind !== 'red') {
    text = IDLE_TEXT.offline;
  }
  els.cloudIdle.querySelector('p').textContent = text;
}

function setCloudView(name) {
  els.cloudIdle.hidden = name !== 'idle';
  els.cloudOffer.hidden = name !== 'offer';
  els.cloudDone.hidden = name !== 'done';
}

function ensureDevice() {
  if (!models) {
    return Promise.resolve(false);
  }
  if (!devicePromise) {
    devicePromise = models.onDevice
      .initializeDeviceModel((progress) => {
        setStatus(
          'Downloading the on-device AI: ' + Math.round(progress * 100) + '%. Chrome does this once.'
        );
      })
      .then(
        () => true,
        (error) => {
          deviceError = shortError(error);
          devicePromise = null;
          return false;
        }
      );
  }
  return devicePromise;
}

function isOffline() {
  return navigator.onLine === false;
}

function deviceAnswered() {
  return Boolean(state.device && state.device.opinion);
}

function secondLabel() {
  if (isOffline()) {
    return 'Cloud unreachable: you are offline';
  }
  if (state.script) {
    return 'Send a redacted copy to the cloud to read this language';
  }
  return deviceAnswered()
    ? 'Get a second opinion from the cloud'
    : 'Send a redacted copy to the cloud for an AI read';
}

function noticeText() {
  if (state.script || deviceAnswered() || (state.cloud && state.cloud.opinion)) {
    return '';
  }
  if (!models) {
    return 'The AI is not set up here, so only the rules ran. The answer below is weaker than usual.';
  }
  const why = deviceError
    ? 'This browser cannot run the on-device AI. Desktop Chrome with Gemini Nano can.'
    : 'The on-device AI did not answer.';
  return 'Only the rules ran. ' + why + ' The answer below is weaker than usual.';
}

function applyCheck(result) {
  const check = state.check;
  if (!check || result.key === 'red') {
    return result;
  }
  if (check.mismatch && (result.key === 'none' || result.key === 'cant')) {
    return {
      key: 'warn',
      code: 'mismatch',
      reason: 'the number or website in the message is not the one you typed'
    };
  }
  if (check.matched && result.code === 'weak_only') {
    const kinds = new Set(
      state.signals.filter((signal) => signal.strength === 'weak').map((signal) => signal.id)
    );
    const only = kinds.size === 1 ? [...kinds][0] : null;
    if ((only === 'callback' && check.number === 'match') || (only === 'link' && check.site === 'match')) {
      return {
        key: 'none',
        code: 'matched',
        reason: 'the only weak sign matches what you typed from your card or the official app'
      };
    }
  }
  return result;
}

function listText(items) {
  return items.length > 1
    ? items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]
    : items[0];
}

function renderCheckself(result) {
  const { numbers, hosts } = state.found;
  const show = result.key !== 'red' && (numbers.length > 0 || hosts.length > 0);
  els.checkself.hidden = !show;
  if (!show) {
    return;
  }
  const parts = [];
  if (numbers.length > 0) {
    parts.push('the number' + (numbers.length > 1 ? 's ' : ' ') + listText(numbers.map((n) => n.raw)));
  }
  if (hosts.length > 0) {
    parts.push('the website' + (hosts.length > 1 ? 's ' : ' ') + listText(hosts.map((h) => h.host)));
  }
  els.csFound.textContent = 'The message gives ' + parts.join(' and ') + '.';
  els.csNumberRow.hidden = numbers.length === 0;
  els.csSiteRow.hidden = hosts.length === 0;
  renderCheckResult();
}

const CHECK_LINES = {
  number: {
    match: 'The number matches the one you typed.',
    mismatch: 'The number in the message does not match the one you typed.',
    invalid: 'Type the whole phone number, at least 6 digits.'
  },
  site: {
    match: 'The website matches the one you typed.',
    mismatch: 'The website in the message is not the one you typed.',
    invalid: 'Type the website, for example the name of the official site.'
  }
};

function renderCheckResult() {
  const check = state.check;
  const lines = [];
  if (check) {
    ['number', 'site'].forEach((kind) => {
      const line = CHECK_LINES[kind][check[kind]];
      if (line) {
        lines.push(line);
      }
    });
    if (check.matched) {
      lines.push('A match does not prove the message is genuine.');
    }
    if (state.checkNote) {
      lines.push(state.checkNote);
    }
  }
  els.csResult.replaceChildren(
    ...lines.map((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      return item;
    })
  );
}

function runSelfCheck() {
  if (!state || busy) {
    return;
  }
  const before = state.result ? state.result.key : null;
  state.check = compare(state.text, { number: els.csNumber.value, site: els.csSite.value });
  state.checkNote = '';
  renderVerdict(Boolean(state.cloud));
  if (state.result.key !== before) {
    state.checkNote = 'Verdict now: ' + LABELS[state.result.key] + '.';
    renderCheckResult();
  }
}

function refreshNetwork() {
  if (state && !busy && !els.verdict.hidden && els.cloudOffer.hidden) {
    renderVerdict(Boolean(state.cloud));
  } else if (els.cloudOffer.hidden) {
    setIdleText('default');
  }
}

function computeVerdict() {
  const opinion = mergeOpinions(state.device?.opinion ?? null, state.cloud?.opinion ?? null);
  let result = decideWithModel(state.signals, opinion, state.text);
  if (state.script && !opinion && result.code === 'no_model') {
    result = { key: 'cant', code: 'script', reason: 'the text is in a language the checker cannot read' };
  }
  result = applyCheck(result);
  if (config.strictMode && result.key === 'none') {
    result = { key: 'cant', code: 'strict', reason: 'strict mode is on' };
  }
  return result;
}

function renderMarked() {
  const { text, marks } = state;
  const parts = [];
  let cursor = 0;
  for (const range of marks) {
    if (range.start > cursor) {
      parts.push(document.createTextNode(text.slice(cursor, range.start)));
    }
    const mark = document.createElement('mark');
    mark.className = range.strong ? 'strong' : 'weak';
    mark.append(document.createTextNode(text.slice(range.start, range.end)));
    const badge = document.createElement('sup');
    badge.textContent = String(range.n);
    mark.append(badge);
    parts.push(mark);
    cursor = range.end;
  }
  if (cursor < text.length) {
    parts.push(document.createTextNode(text.slice(cursor)));
  }
  els.marked.replaceChildren(...parts);
}

function describeWhy(range) {
  const labels = [...new Set(range.signals.map((signal) => SIGNAL_LABELS[signal.id]))];
  const item = document.createElement('li');
  const badge = document.createElement('span');
  badge.className = 'badge ' + (range.strong ? 'strong' : 'weak');
  badge.textContent = String(range.n);
  const body = document.createElement('span');
  const label = document.createElement('strong');
  label.textContent = labels.join('. ');
  const quote = document.createElement('q');
  const raw = state.text.slice(range.start, range.end).replace(/\s+/g, ' ');
  quote.textContent = raw.length > 60 ? raw.slice(0, 57) + '...' : raw;
  const note = document.createElement('small');
  note.textContent = range.strong ? 'Strong sign' : 'Weak sign';
  body.append(label, ' ', quote, ' ', note);
  item.append(badge, body);
  return item;
}

function describeOpinion(answer, name) {
  if (!answer) {
    return null;
  }
  if (answer.opinion) {
    return (
      name + ': reads it as ' + LIKELIHOOD_WORDS[answer.opinion.likelihood] +
      '. ' + (answer.opinion.asks.length > 0
        ? 'It sees the message asking you to ' + describeAsks(answer.opinion)
        : 'It sees no request in the message') +
      '. (' + (answer.ms / 1000).toFixed(1) + ' s)'
    );
  }
  return name + ': no usable answer' + (answer.error ? ' (' + shortError(answer.error) + ')' : '') + '.';
}

function renderDetails(result) {
  const strongCount = state.signals.filter((signal) => signal.strength === 'strong').length;
  const lines = [
    state.signals.length > 0
      ? 'Rules: ' + state.signals.length + ' signal' + (state.signals.length > 1 ? 's' : '') +
        ' found, ' + strongCount + ' strong.'
      : 'Rules: no signals found.'
  ];
  if (state.script) {
    lines.push('On-device AI: not used, the message is not in English.');
  } else if (state.device) {
    lines.push(describeOpinion(state.device, 'On-device AI'));
  } else {
    lines.push('On-device AI: unavailable' + (deviceError ? ' (' + deviceError + ')' : '') + '.');
  }
  lines.push(
    state.cloud ? describeOpinion(state.cloud, 'Cloud AI') : 'Cloud AI: not asked, nothing was sent.'
  );
  lines.push('Decision: ' + result.reason + '.');
  els.vDetails.replaceChildren(
    ...lines.map((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      return item;
    })
  );
}

function renderVerdict(updated) {
  const result = computeVerdict();
  state.result = result;
  els.verdict.dataset.key = result.key;
  els.vGlyph.innerHTML = GLYPHS[result.key];
  els.vLabel.textContent = LABELS[result.key];
  els.vReason.textContent = REASONS[result.code] ?? result.reason;
  els.vUpdate.hidden = !updated;
  els.vWhy.replaceChildren(...state.marks.map(describeWhy));
  els.vWhy.hidden = state.marks.length === 0;
  els.vAdvice.textContent = ADVICE_BY_CODE[result.code] ?? ADVICE[result.key];
  renderDetails(result);

  const canAsk = models !== null && config.cloudEnabled && !state.cloud && result.key !== 'red';
  els.second.hidden = !canAsk;
  setIdleText(result.key === 'red' ? 'red' : 'default');
  els.second.textContent = secondLabel();
  els.second.disabled = busy || isOffline();
  els.vNotice.textContent = noticeText();
  els.vNotice.hidden = els.vNotice.textContent === '';
  renderCheckself(result);
  els.verdict.hidden = false;
}

function resetCheck() {
  state = null;
  els.csNumber.value = '';
  els.csSite.value = '';
  els.csResult.replaceChildren();
  els.checkself.hidden = true;
  els.vNotice.hidden = true;
  els.marked.hidden = true;
  els.message.hidden = false;
  els.check.hidden = false;
  els.edit.hidden = true;
  els.verdict.hidden = true;
  setIdleText('default');
  setCloudView('idle');
  setGate(false);
}

async function runCheck() {
  if (busy) {
    return;
  }
  const text = cleanText(els.message.value).trim();
  if (!text) {
    setStatus('Paste a message first.', 'error');
    els.message.focus();
    return;
  }
  setBusy(true);
  setCloudView('idle');
  state = {
    text,
    signals: findSignals(text),
    script: hasUnsupportedScript(text),
    found: describeMessage(text),
    check: null,
    checkNote: '',
    device: null,
    cloud: null,
    result: null
  };
  state.marks = buildMarks(state.signals);

  let usedDevice = false;
  if (!state.script) {
    setStatus('Waking up the on-device AI. The first check takes about 20 seconds.');
    usedDevice = await ensureDevice();
    if (usedDevice) {
      setStatus('Reading the message on this device.');
      state.device = await askModel(models.structuredOnDevice, text);
    }
  }

  addLedger({
    kind: 'local',
    requests: 0,
    text: usedDevice
      ? 'Checked with the rules and the on-device AI. The message stayed here.'
      : 'Checked with the rules only. The message stayed here.'
  });

  renderMarked();
  els.message.hidden = true;
  els.marked.hidden = false;
  els.check.hidden = true;
  els.edit.hidden = false;
  renderVerdict(false);

  setStatus('');
  setBusy(false);
  els.vLabel.focus();
}

function updateRequest() {
  els.requestText.textContent = buildPrompt(els.preview.value.trim());
}

function openOffer() {
  if (isOffline()) {
    return;
  }
  const { text, items } = redact(state.text);
  els.preview.value = text;
  els.redactNote.textContent = describeRedactions(items);
  els.offerError.hidden = true;
  els.send.textContent = 'Open the gate and send';
  updateRequest();
  els.second.hidden = true;
  setCloudView('offer');
  els.preview.focus();
}

function closeOffer() {
  setCloudView('idle');
  els.second.hidden = false;
  els.second.focus();
}

async function sendToCloud() {
  if (busy || !state || !models || !config.cloudEnabled) {
    return;
  }
  const edited = els.preview.value.trim();
  if (!edited) {
    els.redactNote.textContent = 'Nothing is left to send.';
    return;
  }
  const again = redact(edited);
  if (again.items.length > 0) {
    els.preview.value = again.text;
    updateRequest();
    els.redactNote.textContent = describeRedactions(again.items) + ' Review the text, then send.';
    els.preview.focus();
    return;
  }

  if (isOffline()) {
    els.offerError.textContent = 'You are offline, so nothing was sent. Reconnect and try again.';
    els.offerError.hidden = false;
    return;
  }
  setBusy(true);
  els.offerError.hidden = true;
  setGate(true);
  setStatus('Asking the cloud AI. This may take a few seconds.');
  const answer = await askModel(models.structuredCloud, edited, 1);
  setGate(false);

  addLedger({
    kind: 'cloud',
    requests: answer.attempts,
    text:
      'Sent ' + edited.length + ' characters to Google’s cloud through Firebase AI Logic' +
      (answer.attempts > 1 ? ' (' + answer.attempts + ' requests).' : '.') +
      (answer.opinion ? '' : ' No usable answer came back.')
  });

  if (!answer.opinion) {
    els.offerError.textContent =
      'The cloud did not give a usable answer' +
      (answer.error ? ': ' + shortError(answer.error) : '.') +
      ' The verdict has not changed. You can try again.';
    els.offerError.hidden = false;
    els.send.textContent = 'Try again';
    setStatus('');
    setBusy(false);
    els.send.focus();
    return;
  }

  state.cloud = answer;
  els.sentText.textContent = edited;
  els.answer.textContent = describeOpinion(answer, 'Cloud AI');
  setCloudView('done');
  renderVerdict(true);
  setStatus('');
  setBusy(false);
  els.vLabel.focus();
}

function loadSample(index) {
  if (busy) {
    return;
  }
  resetCheck();
  els.message.value = SAMPLES[index].text;
  runCheck();
}

function buildSamples() {
  SAMPLES.forEach((sample, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = sample.title;
    button.addEventListener('click', () => loadSample(index));
    els.samples.append(button);
  });
}

els.check.addEventListener('click', runCheck);
els.message.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    runCheck();
  }
});
els.edit.addEventListener('click', () => {
  if (busy) {
    return;
  }
  resetCheck();
  setStatus('');
  els.message.focus();
});
els.clear.addEventListener('click', () => {
  if (busy) {
    return;
  }
  resetCheck();
  els.message.value = '';
  setStatus('');
  els.message.focus();
});
els.second.addEventListener('click', () => {
  if (!busy && state) {
    openOffer();
  }
});
els.keep.addEventListener('click', closeOffer);
els.send.addEventListener('click', sendToCloud);
els.preview.addEventListener('input', updateRequest);
els.csRun.addEventListener('click', runSelfCheck);
[els.csNumber, els.csSite].forEach((input) =>
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runSelfCheck();
    }
  })
);
window.addEventListener('offline', refreshNetwork);
window.addEventListener('online', refreshNetwork);

async function start() {
  const fromUrl = readUrlConfig();
  buildSamples();
  setGate(false);
  renderLedger();
  try {
    models = createModels();
  } catch (error) {
    models = null;
    setStatus('Setup problem: ' + shortError(error) + '. Only the rules will run.', 'error');
  }
  applyConfig(fromUrl);
  if (models && models.app) {
    const remote = await loadRemoteConfig(models.app);
    applyConfig(mergeConfig(fromUrl, remote));
  }
}

start();
