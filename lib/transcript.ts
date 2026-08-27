import type { TranscriptParagraph, TranscriptSegment } from './types';

const timePattern = /(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?/;

export function parseTimestamp(value: string): number | null {
  const match = value.trim().match(timePattern);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number((match[4] ?? '0').padEnd(3, '0'));
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

export function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${minutes}:${String(remaining).padStart(2, '0')}`;
}

export function cleanTranscriptText(value: string): string {
  return value
    .replace(/\[(music|applause|laughter|inaudible)\]/gi, (match) => match.toLowerCase())
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  const seen = new Set<string>();
  return segments
    .map((segment) => ({ ...segment, start: Math.max(0, segment.start), text: cleanTranscriptText(segment.text) }))
    .filter((segment) => segment.text.length > 0)
    .sort((a, b) => a.start - b.start)
    .filter((segment) => {
      const key = `${segment.start.toFixed(2)}:${segment.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function groupSegments(input: TranscriptSegment[]): TranscriptParagraph[] {
  const segments = normalizeSegments(input);
  const paragraphs: TranscriptParagraph[] = [];
  let bucket: TranscriptSegment[] = [];
  let characters = 0;

  const flush = () => {
    if (bucket.length === 0) return;
    const first = bucket[0]!;
    const last = bucket[bucket.length - 1]!;
    paragraphs.push({
      id: `p-${Math.round(first.start * 1000)}`,
      start: first.start,
      end: last.start + (last.duration ?? 0),
      text: bucket.map((segment) => segment.text).join(' '),
      segments: bucket
    });
    bucket = [];
    characters = 0;
  };

  segments.forEach((segment, index) => {
    const previous = bucket[bucket.length - 1];
    if (previous && segment.start - (previous.start + (previous.duration ?? 0)) > 7) flush();
    bucket.push(segment);
    characters += segment.text.length + 1;
    const sentenceEnd = /[.!?][”’"']?$/.test(segment.text);
    const next = segments[index + 1];
    const longPause = next ? next.start - (segment.start + (segment.duration ?? 0)) > 2.5 : true;
    if (characters >= 440 || (characters >= 180 && sentenceEnd) || (characters >= 120 && longPause)) flush();
  });
  flush();
  return paragraphs;
}

export function detectSupportedSite(url: string): 'YouTube' | 'TED' | null {
  try {
    const { hostname, pathname } = new URL(url);
    if ((hostname === 'www.youtube.com' || hostname === 'm.youtube.com') && (pathname === '/watch' || pathname.startsWith('/shorts/'))) return 'YouTube';
    if (hostname === 'youtu.be') return 'YouTube';
    if ((hostname === 'www.ted.com' || hostname === 'ted.com') && pathname.startsWith('/talks/')) return 'TED';
  } catch {
    return null;
  }
  return null;
}

export function canonicalSourceUrl(value: string): string {
  const url = new URL(value);
  ['t', 'start', 'feature', 'si', 'utm_source', 'utm_medium', 'utm_campaign'].forEach((key) => url.searchParams.delete(key));
  url.hash = '';
  return url.toString();
}
