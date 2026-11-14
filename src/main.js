import { init } from './firebase.js';

const SAMPLE =
  'URGENT: Your ExampleBank account will be blocked today. Update your KYC now at http://examplebank-kyc-verify.example/login and share the OTP you receive.';

const els = {
  message: document.getElementById('message'),
  prepare: document.getElementById('prepare'),
  onDevice: document.getElementById('on-device'),
  repeat: document.getElementById('repeat'),
  cloud: document.getElementById('cloud'),
  clear: document.getElementById('clear'),
  status: document.getElementById('status'),
  log: document.getElementById('log')
};

const actionButtons = [els.prepare, els.onDevice, els.repeat, els.cloud];

let models = null;
let busy = false;

function setStatus(text) {
  els.status.textContent = text;
}

function addEntry(kind, headline, body) {
  const entry = document.createElement('div');
  entry.className = 'entry ' + kind;

  const head = document.createElement('div');
  head.className = 'head';
  head.textContent = new Date().toLocaleTimeString() + '  ' + headline;
  entry.appendChild(head);

  if (body) {
    const text = document.createElement('div');
    text.className = 'body';
    text.textContent = body;
    entry.appendChild(text);
  }

  els.log.prepend(entry);
}

function setBusy(value) {
  busy = value;
  actionButtons.forEach((button) => {
    button.disabled = value || models === null;
  });
}

function buildPrompt(message) {
  return (
    'Is this message likely a scam? Answer in one short sentence.\n\n' + message
  );
}

function networkCallsSince(startIndex) {
  const calls = performance
    .getEntriesByType('resource')
    .slice(startIndex)
    .filter(
      (entry) =>
        entry.initiatorType === 'fetch' ||
        entry.initiatorType === 'xmlhttprequest'
    );
  const hosts = [...new Set(calls.map((entry) => new URL(entry.name).host))];
  return { count: calls.length, hosts };
}

async function runOnce(label, model) {
  const message = els.message.value.trim();
  if (!message) {
    addEntry('error', label + ' | nothing to check', 'The message box is empty.');
    return;
  }

  const startIndex = performance.getEntriesByType('resource').length;
  const startedAt = performance.now();

  try {
    const result = await model.generateContent(buildPrompt(message));
    const elapsed = Math.round(performance.now() - startedAt);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const source = result.response.inferenceSource ?? 'not reported';
    const network = networkCallsSince(startIndex);
    const networkText =
      network.count === 0
        ? '0'
        : network.count + ' (' + network.hosts.join(', ') + ')';
    addEntry(
      'ok',
      label +
        ' | source: ' +
        source +
        ' | ' +
        elapsed +
        ' ms | network requests: ' +
        networkText,
      result.response.text()
    );
  } catch (error) {
    const elapsed = Math.round(performance.now() - startedAt);
    addEntry(
      'error',
      label + ' | failed after ' + elapsed + ' ms',
      (error && error.message) || String(error)
    );
  }
}

async function guarded(action) {
  if (busy || models === null) {
    return;
  }
  setBusy(true);
  try {
    await action();
  } finally {
    setBusy(false);
  }
}

els.prepare.addEventListener('click', () =>
  guarded(async () => {
    setStatus('Preparing the on-device model...');
    try {
      await models.onDevice.initializeDeviceModel((progress) => {
        setStatus(
          'Downloading the on-device model: ' +
            Math.round(progress * 10000) / 100 +
            '%'
        );
      });
      setStatus('On-device model ready.');
      addEntry('ok', 'on-device model ready', '');
    } catch (error) {
      setStatus('On-device model could not be prepared.');
      addEntry(
        'error',
        'prepare failed',
        (error && error.message) || String(error)
      );
    }
  })
);

els.onDevice.addEventListener('click', () =>
  guarded(async () => {
    setStatus('Running on-device...');
    await runOnce('on-device', models.onDevice);
    setStatus('Done.');
  })
);

els.repeat.addEventListener('click', () =>
  guarded(async () => {
    for (let i = 1; i <= 5; i += 1) {
      setStatus('Running on-device, run ' + i + ' of 5...');
      await runOnce('on-device run ' + i, models.onDevice);
    }
    setStatus('Done.');
  })
);

els.cloud.addEventListener('click', () =>
  guarded(async () => {
    setStatus('Running in the cloud...');
    await runOnce('cloud', models.cloud);
    setStatus('Done.');
  })
);

els.clear.addEventListener('click', () => {
  els.log.replaceChildren();
});

els.message.value = SAMPLE;
performance.setResourceTimingBufferSize(1000);

try {
  models = init();
  setStatus('Ready. Click "1. Prepare on-device model" first.');
} catch (error) {
  setStatus('Setup problem.');
  addEntry('error', 'setup failed', (error && error.message) || String(error));
}

setBusy(false);
