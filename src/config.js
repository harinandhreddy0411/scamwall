import { getRemoteConfig, fetchAndActivate, getBoolean, isSupported } from 'firebase/remote-config';

const DEFAULTS = { strict_mode: false, cloud_enabled: true, model_injection_check: true };

export function readUrlConfig() {
  const params = new URLSearchParams(location.search);
  return {
    strictMode: params.get('strict') === '1',
    cloudEnabled: params.get('cloud') !== '0',
    injectionCheck: params.get('inject') !== '0'
  };
}

export function mergeConfig(fromUrl, remote) {
  if (!remote) {
    return fromUrl;
  }
  return {
    strictMode: fromUrl.strictMode || remote.strictMode,
    cloudEnabled: fromUrl.cloudEnabled && remote.cloudEnabled,
    injectionCheck: fromUrl.injectionCheck && remote.injectionCheck
  };
}

export async function loadRemoteConfig(app) {
  try {
    if (!(await isSupported())) {
      return null;
    }
    const remote = getRemoteConfig(app);
    remote.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 0 : 300000;
    remote.settings.fetchTimeoutMillis = 5000;
    remote.defaultConfig = DEFAULTS;
    await fetchAndActivate(remote);
    return {
      strictMode: getBoolean(remote, 'strict_mode'),
      cloudEnabled: getBoolean(remote, 'cloud_enabled'),
      injectionCheck: getBoolean(remote, 'model_injection_check')
    };
  } catch {
    return null;
  }
}
