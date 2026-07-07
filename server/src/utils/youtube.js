export function extractYouTubeId(value = '') {
  const trimmed = String(value).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const shortMatch = url.pathname.match(/^\/([a-zA-Z0-9_-]{11})/);
    const pathMatch = url.pathname.match(/\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
    const watchId = url.searchParams.get('v');
    if (url.hostname.includes('youtu.be')) return shortMatch?.[1] || null;
    if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) return watchId;
    return pathMatch?.[1] || null;
  } catch {
    return null;
  }
}
