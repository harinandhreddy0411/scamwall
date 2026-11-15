export async function loadConfig() {
  const params = new URLSearchParams(location.search);
  return {
    strictMode: params.get('strict') === '1',
    cloudEnabled: params.get('cloud') !== '0'
  };
}
