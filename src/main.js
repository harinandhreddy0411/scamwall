import { init } from './firebase.js';
import { MESSAGES, buildStructuredPrompt, summarize } from './structured.js';

const SAMPLE =
  'URGENT: Your ExampleBank account will be blocked today. Update your KYC now at http://examplebank-kyc-verify.example/login and share the OTP you receive.';

const els = {
  message: document.getElementById('message'),
  prepare: document.getElementById('prepare'),
  onDevice: document.getElementById('on-device'),
  repeat: document.getElementById('repeat'),
  cloud: document.getElementById('cloud'),
  clear: document.getElementById('clear'),
  testDevice: document.getElementById('test-device'),
  testCloud: document.getElementById('test-cloud'),
  copyReport: document.getElementById('copy-report'),
  clearReport: document.getElementById('clear-report'),
  report: document.getElementById('report'),
  status: document.getElementById('status'),
  log: document.getElementById('log')
};

const actionButtons = [
  els.prepare,
  els.onDevice,
  els.repeat,
  els.cloud,
  els.testDevice,
  els.testCloud
];

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

async function callStructured(model, text) {
  const startedAt = performance.now();
  try {
    const result = await model.generateContent(buildStructuredPrompt(text));
    return {
      ms: Math.round(performance.now() - startedAt),
      source: result.response.inferenceSource ?? 'not reported',
      raw: result.response.text()
    };
  } catch (error) {
    return {
      ms: Math.round(performance.now() - startedAt),
      error: (error && error.message) || String(error)
    };
  }
}

async function runStructuredTest(label, model, runsPerMessage) {
  const lines = ['== ' + label + ' | ' + new Date().toLocaleString() + ' =='];
  for (const item of MESSAGES) {
    const runs = [];
    for (let i = 1; i <= runsPerMessage; i += 1) {
      setStatus(
        label + ': ' + item.id + ', run ' + i + ' of ' + runsPerMessage + '...'
      );
      runs.push(await callStructured(model, item.text));
    }
    lines.push(...summarize(item, runs));
  }
  lines.push('');
  els.report.textContent += lines.join('\n') + '\n';
  setStatus('Done. Scroll down to the report and click "Copy report".');
}

els.testDevice.addEventListener('click', () =>
  guarded(() => runStructuredTest('on-device', models.structuredOnDevice, 5))
);

els.testCloud.addEventListener('click', () =>
  guarded(() => runStructuredTest('cloud', models.structuredCloud, 1))
);

els.copyReport.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(els.report.textContent);
    setStatus('Report copied.');
  } catch {
    setStatus('Copy failed. Select the report text and copy it by hand.');
  }
});

els.clearReport.addEventListener('click', () => {
  els.report.textContent = '';
});

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
