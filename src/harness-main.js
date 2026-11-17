import { init } from './firebase.js';
import { LABELS } from './verdict.js';
import { SIGNAL_LABELS } from './signals.js';
import { INJECTION_SETS, describeAnswer, evaluate, formatReport, runCorpus } from './harness.js';
import { formatRealReport, parseMessages, runReal } from './realset.js';

const SAMPLE =
  'URGENT: Your ExampleBank account will be blocked today. Update your KYC now at http://examplebank-kyc-verify.example/login and share the OTP you receive.';

const els = {
  message: document.getElementById('message'),
  prepare: document.getElementById('prepare'),
  checkOne: document.getElementById('check-one'),
  runDevice: document.getElementById('run-device'),
  runCloud: document.getElementById('run-cloud'),
  runInject: document.getElementById('run-inject'),
  runReal: document.getElementById('run-real'),
  realInput: document.getElementById('real-input'),
  realShowText: document.getElementById('real-show-text'),
  copyReport: document.getElementById('copy-report'),
  clearReport: document.getElementById('clear-report'),
  report: document.getElementById('report'),
  status: document.getElementById('status')
};

const actionButtons = [
  els.prepare,
  els.checkOne,
  els.runDevice,
  els.runCloud,
  els.runInject,
  els.runReal
];

let models = null;
let busy = false;

function setStatus(text) {
  els.status.textContent = text;
}

function appendReport(text) {
  els.report.textContent += text + '\n';
}

function setBusy(value) {
  busy = value;
  actionButtons.forEach((button) => {
    button.disabled = value || models === null;
  });
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
    } catch (error) {
      setStatus(
        'On-device model could not be prepared: ' +
          ((error && error.message) || String(error))
      );
    }
  })
);

els.checkOne.addEventListener('click', () =>
  guarded(async () => {
    const text = els.message.value.trim();
    if (!text) {
      setStatus('Type or paste a made-up message first.');
      return;
    }
    setStatus('Checking on-device...');
    const result = await evaluate(text, models.structuredOnDevice);
    const found = result.signals.map(
      (signal) => '  - ' + SIGNAL_LABELS[signal.id] + ': "' + signal.text + '"'
    );
    appendReport(
      [
        '== your message | ' + new Date().toLocaleString() + ' ==',
        'verdict: ' + LABELS[result.combined.key],
        'why: ' + result.combined.reason,
        'model: ' + describeAnswer(result.answer),
        'signals:',
        ...(found.length > 0 ? found : ['  (none)']),
        ''
      ].join('\n')
    );
    setStatus('Done.');
  })
);

async function runAll(label, model, options, warmUp) {
  if (warmUp) {
    setStatus(label + ': warming up the model (first call is slow)...');
    await evaluate('Hello, are we still meeting at 6 PM?', model);
  }
  const rows = await runCorpus(model, {
    ...options,
    onProgress: (id, number, total) =>
      setStatus(label + ': message ' + id + ' (' + number + ' of ' + total + ')...')
  });
  appendReport(formatReport(label, rows));
  setStatus('Done. Scroll down to the report and click "Copy report".');
}

els.runDevice.addEventListener('click', () =>
  guarded(() => runAll('on-device', models.structuredOnDevice, {}, true))
);

els.runInject.addEventListener('click', () =>
  guarded(() =>
    runAll('on-device, injection cases', models.structuredOnDevice, { sets: INJECTION_SETS }, true)
  )
);

els.runCloud.addEventListener('click', () =>
  guarded(() =>
    runAll('cloud, hard and fresh sets', models.structuredCloud, {
      sets: ['hard', 'fresh'],
      delayMs: 4000,
      retries: 1
    }, false)
  )
);

els.runReal.addEventListener('click', () =>
  guarded(async () => {
    const items = parseMessages(els.realInput.value);
    if (items.length === 0) {
      setStatus('Paste at least one message first. Put --- on its own line between messages.');
      return;
    }
    setStatus('My messages: warming up the model (first call is slow)...');
    await evaluate('Hello, are we still meeting at 6 PM?', models.structuredOnDevice);
    const rows = await runReal(items, models.structuredOnDevice, (n, number, total) =>
      setStatus('My messages: message ' + n + ' (' + number + ' of ' + total + ')...')
    );
    appendReport(formatRealReport(rows, els.realShowText.checked));
    setStatus('Done. Scroll up to the report and click "Copy report".');
  })
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

els.message.value = SAMPLE;

try {
  models = import.meta.env.DEV && window.__fakeModels ? window.__fakeModels : init();
  setStatus('Ready. Click "1. Prepare on-device model" first.');
} catch (error) {
  setStatus('Setup problem: ' + ((error && error.message) || String(error)));
}

setBusy(false);
