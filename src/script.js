const UNSUPPORTED_SCRIPTS = /[؀-ۿЀ-ӿऀ-෿]/g;

export function hasUnsupportedScript(text) {
  const found = text.match(UNSUPPORTED_SCRIPTS);
  return found !== null && found.length >= 3;
}
