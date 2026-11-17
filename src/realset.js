import { describeAnswer, describeSignals, evaluate, grade } from './harness.js';

const LABEL_EXPECT = { scam: 'red', ok: 'none', unsure: 'cant' };
const LABEL_ORDER = ['scam', 'ok', 'unsure', 'unlabeled'];
const KEYS = ['red', 'warn', 'cant', 'none'];
const PROBLEMS = ['MISSED SCAM', 'FALSE ALARM', 'OVERCONFIDENT'];

export function parseMessages(raw) {
  const blocks = String(raw).replace(/\r\n?/g, '\n').split(/^[ \t]*---[ \t]*$/m);
  const items = [];
  for (const block of blocks) {
    let text = block.trim();
    if (!text) {
      continue;
    }
    let label = null;
    const match = text.match(/^#(scam|ok|unsure)[ \t]*(?:\n|$)/i);
    if (match) {
      label = match[1].toLowerCase();
      text = text.slice(match[0].length).trim();
    }
    if (!text) {
      continue;
    }
    items.push({ n: items.length + 1, label, expect: label ? LABEL_EXPECT[label] : null, text });
  }
  return items;
}

function gradeRow(row) {
  return row.item.expect ? grade(row.item.expect, row.result.combined.key) : 'no label';
}

export async function runReal(items, model, onProgress) {
  const rows = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (onProgress) {
      onProgress(item.n, index + 1, items.length);
    }
    rows.push({ item, result: await evaluate(item.text, model) });
  }
  return rows;
}

export function formatRealReport(rows, showText) {
  const lines = [
    '== real messages | ' + new Date().toLocaleString() + ' | ' + rows.length +
      ' messages | on-device only, nothing was sent =='
  ];
  for (const row of rows) {
    const { item, result } = row;
    lines.push(
      'M' + item.n + ' label=' + (item.label ?? '-') +
        (showText ? ' "' + item.text.slice(0, 40).replace(/\s+/g, ' ') + '..."' : '') +
        ' | signals: ' + describeSignals(result.signals) +
        ' | model: ' + describeAnswer(result.answer) +
        ' | verdict=' + result.combined.key + ' (' + result.combined.code + ')' +
        ' | ' + gradeRow(row)
    );
  }
  lines.push('--');
  for (const label of LABEL_ORDER) {
    const subset = rows.filter((row) => (row.item.label ?? 'unlabeled') === label);
    if (subset.length === 0) {
      continue;
    }
    lines.push(
      label.padEnd(10) + '(n=' + subset.length + '): ' +
        KEYS.map(
          (key) => key + ' ' + subset.filter((row) => row.result.combined.key === key).length
        ).join(' | ')
    );
  }
  const problems = rows.filter((row) => PROBLEMS.includes(gradeRow(row)));
  lines.push(
    problems.length === 0
      ? 'problems: none among labeled messages'
      : 'problems: ' + problems.map((row) => 'M' + row.item.n + ' ' + gradeRow(row)).join(', ')
  );
  const answered = rows.filter((row) => row.result.answer.opinion);
  lines.push(
    'model answers usable ' + answered.length + '/' + rows.length +
      ' | average ' +
      (answered.length > 0
        ? Math.round(answered.reduce((sum, row) => sum + row.result.answer.ms, 0) / answered.length)
        : 0) +
      ' ms',
    ''
  );
  return lines.join('\n');
}
