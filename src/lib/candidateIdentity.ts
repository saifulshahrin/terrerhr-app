/** Canonical public profile identity; do not use display names for deduplication. */
export function normalizeProfileUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  const url = new URL(raw);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use a public HTTP or HTTPS profile URL without credentials.');
  }
  url.hash = '';
  url.search = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (url.hostname === 'github.com' || url.hostname === 'linkedin.com') {
    url.protocol = 'https:';
    url.pathname = url.pathname.toLowerCase();
  }
  return url.toString().replace(/\/$/, '');
}
