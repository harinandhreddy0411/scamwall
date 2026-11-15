import { CORPUS } from './corpus.js';
import { findSignals } from './signals.js';
import {
  decide,
  decideWithModel,
  describeAsks,
  modelOnlyKey,
  parseOpinion
} from './verdict.js';
import { buildPrompt } from './structured.js';

const GRADES = ['ok', 'soft', 'FALSE ALARM', 'MISSED SCAM', 'OVERCONFIDENT'];
const SETS = ['tune', 'holdout', 'hard', 'fresh'];
const RETRY_WAIT_MS = 6000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function grade(expect, got) {
  if (expect === got) {
    return 'ok';
  }
  if (got === 'warn') {
    return expect === 'none' ? 'FALSE ALARM' : 'soft';
  }
  if (expect === 'red' && got === 'none') {
    return 'MISSED SCAM';
  }
  if (expect === 'none' && got === 'red') {
    return 'FALSE ALARM';
  }
  return got === 'cant' ? 'soft' : 'OVERCONFIDENT';
}

async function askModel(model, text, retries) {
  let attempts = 0;
  for (;;) {
    attempts += 1;
    const startedAt = performance.now();
    try {
      const result = await model.generateContent(buildPrompt(text));
      const raw = result.response.text();
      return {
        ms: Math.round(performance.now() - startedAt),
        source: result.response.inferenceSource ?? 'not reported',
        raw,
        opinion: parseOpinion(raw),
        attempts
      };
    } catch (error) {
      if (attempts > retries) {
        return {
          ms: Math.round(performance.now() - startedAt),
          error: (error && error.message) || String(error),
          opinion: null,
          attempts
        };
      }
      await wait(RETRY_WAIT_MS);
    }
  }
}

export async function evaluate(text, model, { retries = 0 } = {}) {
  const signals = findSignals(text);
  const answer = await askModel(model, text, retries);
  return {
    signals,
    answer,
    codeKey: decide(signals, null, text).key,
    modelKey: modelOnlyKey(answer.opinion) ?? 'cant',
    combined: decideWithModel(signals, answer.opinion, text),
    asksKey: decideWithModel(signals, answer.opinion, text, { mediumWithoutAsksIsLow: true }).key
  };
}

export function describeAnswer(answer) {
  if (answer.opinion) {
    return (
      answer.opinion.likelihood + ' [asks: ' + describeAsks(answer.opinion) + ']' +
      ' ' + answer.source + ' ' + answer.ms + 'ms' +
      (answer.attempts > 1 ? ' (after retry)' : '')
    );
  }
  if (answer.error) {
    return 'ERROR ' + answer.error.slice(0, 300).replace(/\s+/g, ' ');
  }
  return 'BAD OUTPUT ' + String(answer.raw).slice(0, 100).replace(/\s+/g, ' ');
}

export function describeSignals(signals) {
  const ids = [...new Set(signals.map((signal) => signal.id))];
  return ids.length > 0 ? ids.join(',') : '-';
}

export function formatRow(item, result) {
  return (
    item.id + ' ' + item.set + ' expect=' + item.expect +
    ' "' + item.text.slice(0, 48).replace(/\s+/g, ' ') + '..."' +
    ' | signals: ' + describeSignals(result.signals) +
    ' | model: ' + describeAnswer(result.answer) +
    ' | code=' + result.codeKey +
    ' model-only=' + result.modelKey +
    ' combined=' + result.combined.key +
    ' (' + grade(item.expect, result.combined.key) + ')' +
    ' asks-aware=' + result.asksKey +
    ' (' + grade(item.expect, result.asksKey) + ')'
  );
}

export function summarize(rows) {
  const lines = [];
  const approaches = [
    ['code only', (row) => row.result.codeKey],
    ['model only', (row) => row.result.modelKey],
    ['combined', (row) => row.result.combined.key],
    ['asks-aware', (row) => row.result.asksKey]
  ];
  for (const set of SETS) {
    const subset = rows.filter((row) => row.item.set === set);
    if (subset.length === 0) {
      continue;
    }
    for (const [name, pick] of approaches) {
      const counts = new Map();
      subset.forEach((row) => {
        const g = grade(row.item.expect, pick(row));
        counts.set(g, (counts.get(g) ?? 0) + 1);
      });
      lines.push(
        set.padEnd(8) + name.padEnd(11) + ': ' +
          GRADES.map((g) => g + ' ' + (counts.get(g) ?? 0)).join(' | ')
      );
    }
  }
  const answered = rows.filter((row) => row.result.answer.opinion);
  const failed = rows.length - answered.length;
  const average =
    answered.length > 0
      ? Math.round(
          answered.reduce((sum, row) => sum + row.result.answer.ms, 0) / answered.length
        )
      : 0;
  lines.push(
    'model answers usable ' + answered.length + '/' + rows.length +
      ' | failed ' + failed + ' | average ' + average + ' ms'
  );
  return lines;
}

export async function runCorpus(
  model,
  { delayMs = 0, retries = 0, sets = SETS, onProgress } = {}
) {
  const items = CORPUS.filter((item) => sets.includes(item.set));
  const rows = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (onProgress) {
      onProgress(item.id, index + 1, items.length);
    }
    rows.push({ item, result: await evaluate(item.text, model, { retries }) });
    if (delayMs > 0) {
      await wait(delayMs);
    }
  }
  return rows;
}

export function formatReport(label, rows) {
  return [
    '== ' + label + ' | ' + new Date().toLocaleString() + ' | ' + rows.length + ' messages ==',
    ...rows.map((row) => formatRow(row.item, row.result)),
    '--',
    ...summarize(rows),
    ''
  ].join('\n');
}
