import { browser } from 'wxt/browser';
import { cleanTranscriptText, detectSupportedSite, normalizeSegments, parseTimestamp } from '../lib/transcript';
import type { CaptureResponse, ContentMessage, TranscriptSegment } from '../lib/types';

function textFrom(root: Element, selectors: string[]): string {
  for (const selector of selectors) {
    const text = root.querySelector(selector)?.textContent?.trim();
    if (text) return text;
  }
  return '';
}

function numberFromDataset(element: HTMLElement): number | null {
  for (const key of ['start', 'startTime', 'seekTime', 'time']) {
    const value = element.dataset[key];
    if (!value) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number > 10000 ? number / 1000 : number;
  }
  return null;
}

function extractYouTubeDom(): TranscriptSegment[] {
  const rows = document.querySelectorAll<HTMLElement>('ytd-transcript-segment-renderer, [class*="transcript-segment"]');
  return normalizeSegments(Array.from(rows).flatMap((row) => {
    const timestamp = textFrom(row, ['.segment-timestamp', '[class*="timestamp"]']) || row.textContent || '';
    const start = numberFromDataset(row) ?? parseTimestamp(timestamp);
    const text = textFrom(row, ['.segment-text', 'yt-formatted-string.segment-text', '[class*="segment-text"]']);
    return start === null || !text ? [] : [{ start, text }];
  }));
}

function collectCaptionObjects(value: unknown, output: TranscriptSegment[], depth = 0): void {
  if (depth > 10 || value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectCaptionObjects(item, output, depth + 1));
    return;
  }
  const record = value as Record<string, unknown>;
  const rawStart = record.startTime ?? record.start_time ?? record.start ?? record.time;
  const rawText = record.content ?? record.text ?? record.caption;
  if ((typeof rawStart === 'number' || typeof rawStart === 'string') && typeof rawText === 'string') {
    const parsedStart = typeof rawStart === 'string' ? parseTimestamp(rawStart) ?? Number(rawStart) : rawStart;
    if (Number.isFinite(parsedStart) && cleanTranscriptText(rawText).length > 0 && rawText.length < 1000) {
      const seconds = Number(parsedStart) > 10000 ? Number(parsedStart) / 1000 : Number(parsedStart);
      output.push({ start: seconds, text: rawText });
    }
  }
  Object.values(record).forEach((item) => collectCaptionObjects(item, output, depth + 1));
}

function extractTedDom(): TranscriptSegment[] {
  const selectors = [
    '[data-testid*="transcript"] [data-start-time]',
    '[data-testid="transcript-row"]',
    '[class*="Transcript"] [data-start]',
    '[class*="transcript"] [data-seek-time]',
    '.transcript__para'
  ];
  const rows = document.querySelectorAll<HTMLElement>(selectors.join(','));
  const fromDom = Array.from(rows).flatMap((row) => {
    const timeText = textFrom(row, ['time', '[class*="time"]', 'button', 'a']);
    const start = numberFromDataset(row) ?? parseTimestamp(timeText);
    const clone = row.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('time, button, [class*="time"]').forEach((node) => node.remove());
    const text = cleanTranscriptText(clone.textContent ?? '');
    return start === null || !text ? [] : [{ start, text }];
  });
  if (fromDom.length >= 2) return normalizeSegments(fromDom);

  const fromJson: TranscriptSegment[] = [];
  document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"], script#__NEXT_DATA__').forEach((script) => {
    try {
      collectCaptionObjects(JSON.parse(script.textContent ?? ''), fromJson);
    } catch {
      // A page-owned data block may not be JSON; ignore it without leaving the page.
    }
  });
  return normalizeSegments(fromJson);
}

function extractVisibleTranscript(): TranscriptSegment[] {
  return detectSupportedSite(location.href) === 'YouTube' ? extractYouTubeDom() : extractTedDom();
}

async function requestYouTubeOfficialTrack(): Promise<TranscriptSegment[]> {
  const requestId = crypto.randomUUID();
  return await new Promise<TranscriptSegment[]>((resolve) => {
    let attempts = 0;
    const finish = (segments: TranscriptSegment[]) => {
      window.removeEventListener('message', receive);
      window.clearInterval(retryTimer);
      window.clearTimeout(timeoutTimer);
      resolve(normalizeSegments(segments));
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.data?.channel !== 'transcript-study-view' || event.data?.type !== 'caption-response' || event.data?.requestId !== requestId) return;
      const segments = Array.isArray(event.data.segments) ? event.data.segments as TranscriptSegment[] : [];
      if (segments.length > 1 || attempts >= 8) finish(segments);
    };
    const request = () => {
      attempts += 1;
      window.postMessage({ channel: 'transcript-study-view', type: 'request-captions', requestId }, '*');
    };
    window.addEventListener('message', receive);
    const retryTimer = window.setInterval(request, 350);
    const timeoutTimer = window.setTimeout(() => finish([]), 4200);
    request();
  });
}

async function revealTranscript(): Promise<void> {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], tp-yt-paper-button'));
  const trigger = candidates.find((element) => {
    const label = `${element.textContent ?? ''} ${element.getAttribute('aria-label') ?? ''}`.toLowerCase();
    return label.includes('show transcript') || label.includes('read transcript') || label.trim() === 'transcript';
  });
  trigger?.click();
  if (!trigger) return;
  await new Promise<void>((resolve) => {
    const started = Date.now();
    const observer = new MutationObserver(() => {
      if (extractVisibleTranscript().length > 1 || Date.now() - started > 4500) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 5000);
  });
}

async function capture(allowReveal: boolean): Promise<CaptureResponse> {
  const site = detectSupportedSite(location.href);
  if (!site) return { ok: false, reason: 'unsupported', message: 'Open a YouTube video or TED talk first.' };
  let segments = extractVisibleTranscript();
  if (segments.length < 2 && site === 'YouTube') segments = await requestYouTubeOfficialTrack();
  if (segments.length < 2 && allowReveal) {
    await revealTranscript();
    segments = extractVisibleTranscript();
  }
  if (segments.length < 2) {
    return {
      ok: false,
      reason: navigator.onLine ? 'missing' : 'offline',
      message: navigator.onLine
        ? 'No official transcript is visible for this talk. Open the site transcript panel or choose a talk with captions, then try again.'
        : 'You appear to be offline. Reconnect long enough to open the source transcript, then try again.'
    };
  }
  const title = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content
    ?? document.querySelector('h1')?.textContent?.trim()
    ?? document.title.replace(/\s*[-|]\s*(YouTube|TED).*$/i, '');
  return { ok: true, title, site, segments };
}

export default defineContentScript({
  matches: ['https://www.youtube.com/*', 'https://m.youtube.com/*', 'https://youtu.be/*', 'https://www.ted.com/talks/*'],
  runAt: 'document_idle',
  main() {
    browser.runtime.onMessage.addListener((rawMessage: unknown) => {
      const message = rawMessage as ContentMessage;
      if (message.type === 'CHECK_TRANSCRIPT') return capture(false);
      if (message.type === 'EXTRACT_TRANSCRIPT') return capture(true);
      if (message.type === 'SEEK') {
        const media = document.querySelector<HTMLMediaElement>('video, audio');
        if (!media) return Promise.resolve({ ok: false, message: 'The source player is no longer available.' });
        media.currentTime = message.seconds;
        media.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        return Promise.resolve({ ok: true });
      }
      return undefined;
    });
  }
});
