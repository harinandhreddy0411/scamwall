import { buildPrompt } from './structured.js';
import { parseOpinion } from './verdict.js';

const RETRY_WAIT_MS = 6000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function askModel(model, text, retries = 0) {
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
