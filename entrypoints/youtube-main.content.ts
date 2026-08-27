interface YouTubeCaptionSegment { start: number; duration?: number; text: string }
interface PlayerCaptionTrack { baseUrl?: string; kind?: string; languageCode?: string }

function playerTracks(): PlayerCaptionTrack[] {
  const pageWindow = window as typeof window & { ytInitialPlayerResponse?: unknown };
  const player = document.querySelector('#movie_player') as (HTMLElement & { getPlayerResponse?: () => unknown }) | null;
  const responses = [player?.getPlayerResponse?.(), pageWindow.ytInitialPlayerResponse];
  for (const response of responses) {
    const tracks = (response as { captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: PlayerCaptionTrack[] } } } | undefined)
      ?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks?.length) return tracks;
  }
  return [];
}

async function fetchOfficialCaptions(): Promise<YouTubeCaptionSegment[]> {
  const tracks = playerTracks();
  const track = tracks.find((item) => item.kind !== 'asr') ?? tracks[0];
  if (!track?.baseUrl) return [];
  const url = new URL(track.baseUrl);
  url.searchParams.set('fmt', 'json3');
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) return [];
  const payload = await response.json() as { events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> };
  return (payload.events ?? []).flatMap((event) => {
    const text = (event.segs ?? []).map((segment) => segment.utf8 ?? '').join('').replace(/\n/g, ' ').trim();
    return typeof event.tStartMs !== 'number' || !text
      ? []
      : [{ start: event.tStartMs / 1000, duration: (event.dDurationMs ?? 0) / 1000, text }];
  });
}

export default defineContentScript({
  matches: ['https://www.youtube.com/*', 'https://m.youtube.com/*', 'https://youtu.be/*'],
  runAt: 'document_idle',
  world: 'MAIN',
  main() {
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.data?.channel !== 'transcript-study-view' || event.data?.type !== 'request-captions') return;
      const requestId = event.data.requestId as string;
      void fetchOfficialCaptions()
        .then((segments) => window.postMessage({ channel: 'transcript-study-view', type: 'caption-response', requestId, segments }, '*'))
        .catch(() => window.postMessage({ channel: 'transcript-study-view', type: 'caption-response', requestId, segments: [] }, '*'));
    });
  }
});
