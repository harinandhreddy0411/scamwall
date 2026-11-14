import { CORPUS } from './corpus.js';
import { findSignals } from './signals.js';
import { decide, decideWithModel, modelOnlyKey, parseOpinion } from './verdict.js';
import { buildPrompt } from './structured.js';

const GRADES = ['ok', 'soft', 'FALSE ALARM', 'MISSED SCAM', 'OVERCONFIDENT'];
const SETS = ['tune', 'holdout'];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function grade(expect, got) {
  if (expect === got) {
    return 'ok';
  }
  if (expect === 'red' && got === 'none') {
    return 'MISSED SCAM';
  }
  if (expect === 'none' && got === 'red') {
    return 'FALSE ALARM';
  }
  return got === 'cant' ? 'soft' : 'OVERCONFIDENT';
}

async function askModel(model, text) {
  const startedAt = performance.now();
  try {
    const result = await model.generateContent(buildPrompt(text));
    const raw = result.response.text();
    return {
      ms: Math.round(performance.now() - startedAt),
      source: result.response.inferenceSource ?? 'not reported',
      raw,
      opinion: parseOpinion(raw)
    };
  } catch (error) {
    return {
      ms: Math.round(performance.now() - startedAt),
      error: (error && error.message) || String(error),
      opinion: null
    };
  }
}

export async function evaluate(text, model) {
  const signals = findSignals(text);
  const answer = await askModel(model, text);
  return {
    signals,
    answer,
    codeKey: decide(signals, null, text).key,
    modelKey: modelOnlyKey(answer.opinion) ?? 'cant',
    combined: decideWithModel(signals, answer.opinion, text)
  };
}

export function describeAnswer(answer) {
  if (answer.opinion) {
    return (
      answer.opinion.likelihood + '/' + answer.opinion.category +
      ' ' + answer.source + ' ' + answer.ms + 'ms'
    );
  }
  if (answer.error) {
    return 'ERROR ' + answer.error.slice(0, 100).replace(/\s+/g, ' ');
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
    ' | signals: ' + describeSignals(result.signals) +
    ' | model: ' + describeAnswer(result.answer) +
    ' | code=' + result.codeKey +
    ' model-only=' + result.modelKey +
    ' combined=' + result.combined.key +
    ' (' + grade(item.expect, result.combined.key) + ')'
  );
}

export function summarize(rows) {
  const lines = [];
  const approaches = [
    ['code only', (row) => row.result.codeKey],
    ['model only', (row) => row.result.modelKey],
    ['combined', (row) => row.result.combined.key]
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

export async function runCorpus(model, { delayMs = 0, onProgress } = {}) {
  const rows = [];
  for (let index = 0; index < CORPUS.length; index += 1) {
    const item = CORPUS[index];
    if (onProgress) {
      onProgress(item.id, index + 1, CORPUS.length);
    }
    rows.push({ item, result: await evaluate(item.text, model) });
    if (delayMs > 0) {
      await wait(delayMs);
    }
  }
  return rows;
}

export function formatReport(label, rows) {
  return [
    '== ' + label + ' | ' + new Date().toLocaleString() + ' ==',
    ...rows.map((row) => formatRow(row.item, row.result)),
    '--',
    ...summarize(rows),
    ''
  ].join('\n');
}
