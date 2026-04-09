/**
 * amoCRM / Kommo передаёт referer как хост без схемы (например amocrmednaru.amocrm.ru) —
 * такую строку нельзя корректно распарсить через new URL() без префикса https://.
 */
const KNOWN_HOST_SUFFIXES = [
  '.amocrm.ru',
  '.kommo.com',
  '.amocrm.com',
] as const;

export function normalizeRefererToHostname(referer: string): string {
  const raw = String(referer ?? '').trim();
  if (!raw) {
    throw new Error('Referer is empty');
  }
  let withScheme = raw;
  if (!/^https?:\/\//i.test(withScheme)) {
    withScheme = 'https://' + withScheme.replace(/^\/+/, '');
  }
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    throw new Error(`Referer is not a valid URL: ${referer}`);
  }
  const host = u.hostname.trim().toLowerCase();
  if (!host) {
    throw new Error(`No hostname in referer: ${referer}`);
  }
  return host;
}

export function extractSubdomainFromHostname(hostname: string): string {
  const h = String(hostname ?? '').trim().toLowerCase();
  if (!h) {
    throw new Error('Hostname is empty');
  }
  for (const suffix of KNOWN_HOST_SUFFIXES) {
    if (h.endsWith(suffix)) {
      const prefix = h.slice(0, -suffix.length);
      if (!prefix || prefix.endsWith('.')) {
        throw new Error(`Cannot extract subdomain from hostname: ${hostname}`);
      }
      const labels = prefix.split('.');
      const sub = labels[0];
      if (!sub) {
        throw new Error(`Cannot extract subdomain from hostname: ${hostname}`);
      }
      return sub;
    }
  }
  throw new Error(
    `Hostname is not a recognized amoCRM/Kommo host (.amocrm.ru / .kommo.com / .amocrm.com): ${hostname}`,
  );
}
