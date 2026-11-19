import { cleanText } from './signals.js';

export const IMAGE_TYPES = ['image/png', 'image/jpeg'];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_TEXT = 1500;

export const IMAGE_PROMPT = [
  'Write out exactly the text that is visible in this image, line by line, as plain text.',
  'Keep every number, link, symbol and line break exactly as shown.',
  'Do not describe the image. Do not explain, summarise, judge or add anything.',
  'If the image contains no readable text, answer with only the word NONE.'
].join(' ');

export function checkImageFile(file) {
  if (!file) {
    return 'Choose an image first.';
  }
  if (!IMAGE_TYPES.includes(file.type)) {
    return 'Only PNG and JPEG images can be read on this device.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'That image is larger than 8 MB. Crop it to the message and try again.';
  }
  if (file.size === 0) {
    return 'That image is empty.';
  }
  return '';
}

export function cleanTranscript(raw) {
  let text = cleanText(String(raw ?? ''))
    .replace(/\*\*/g, '')
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  text = text.replace(/\n[ \t]*none\.?[ \t]*$/i, '').trim();
  if (/^none\.?$/i.test(text)) {
    text = '';
  }
  const truncated = text.length > MAX_TEXT;
  if (truncated) {
    text = text.slice(0, MAX_TEXT);
  }
  return { text, truncated };
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      resolve(value.slice(value.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
}

export async function readImage(model, file) {
  const startedAt = performance.now();
  try {
    const data = await toBase64(file);
    const result = await model.generateContent([
      { text: IMAGE_PROMPT },
      { inlineData: { mimeType: file.type, data } }
    ]);
    const raw = result.response.text();
    const { text, truncated } = cleanTranscript(raw);
    return {
      ms: Math.round(performance.now() - startedAt),
      source: result.response.inferenceSource ?? 'not reported',
      raw,
      text,
      truncated
    };
  } catch (error) {
    return {
      ms: Math.round(performance.now() - startedAt),
      error: (error && error.message) || String(error),
      text: '',
      truncated: false
    };
  }
}

export async function imageInputAvailable() {
  try {
    if (typeof LanguageModel === 'undefined') {
      return false;
    }
    const state = await LanguageModel.availability({
      expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }]
    });
    return state !== 'unavailable';
  } catch {
    return false;
  }
}

function numbersOf(text) {
  return (String(text).match(/\d[\d,.]*\d|\d/g) ?? []).map((n) => n.replace(/[,.]+$/, ''));
}

function squash(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

export function compareTranscript(expected, got) {
  const want = numbersOf(expected);
  const have = numbersOf(got);
  const digitsOk = want.length === have.length && want.every((n, i) => n === have[i]);
  const exact = squash(expected) === squash(got);
  const exactCase = String(expected).replace(/\s+/g, ' ').trim() === String(got).replace(/\s+/g, ' ').trim();
  return { exact, exactCase, digitsOk, want, have };
}
