export function buildMarks(signals) {
  const sorted = [...signals].sort((a, b) => a.start - b.start || b.end - a.end);
  const ranges = [];
  for (const signal of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && signal.start < last.end) {
      last.end = Math.max(last.end, signal.end);
      last.strong = last.strong || signal.strength === 'strong';
      last.signals.push(signal);
    } else {
      ranges.push({
        start: signal.start,
        end: signal.end,
        strong: signal.strength === 'strong',
        signals: [signal]
      });
    }
  }
  ranges.forEach((range, index) => {
    range.n = index + 1;
  });
  return ranges;
}
