import { describe, expect, it } from 'vitest';
import { canonicalSourceUrl, cleanTranscriptText, detectSupportedSite, formatTimestamp, groupSegments, normalizeSegments, parseTimestamp } from '../lib/transcript';

describe('timestamps', () => {
  it('parses short, long, and millisecond timestamps', () => {
    expect(parseTimestamp('02:17')).toBe(137);
    expect(parseTimestamp('1:02:03')).toBe(3723);
    expect(parseTimestamp('00:04.250')).toBe(4.25);
    expect(parseTimestamp('not a time')).toBeNull();
  });

  it('formats timestamps without losing hours', () => {
    expect(formatTimestamp(8.9)).toBe('0:08');
    expect(formatTimestamp(3723)).toBe('1:02:03');
  });
});

describe('transcript shaping', () => {
  it('cleans whitespace while preserving meaningful cues', () => {
    expect(cleanTranscriptText('  Hello\n   there  ')).toBe('Hello there');
    expect(cleanTranscriptText('[MUSIC] Welcome')).toBe('[music] Welcome');
  });

  it('sorts, deduplicates, and removes empty segments', () => {
    expect(normalizeSegments([
      { start: 4, text: 'Later' },
      { start: 1, text: ' First ' },
      { start: 1, text: ' First ' },
      { start: 2, text: '  ' }
    ])).toEqual([{ start: 1, text: 'First' }, { start: 4, text: 'Later' }]);
  });

  it('forms readable paragraphs and starts a new one after a long pause', () => {
    const paragraphs = groupSegments([
      { start: 0, duration: 3, text: 'The first thought begins here.' },
      { start: 3, duration: 3, text: 'It continues with enough context to stay together in the same reading block even though it is deliberately wordy.' },
      { start: 6, duration: 3, text: 'This final sentence gives the paragraph enough substance to close cleanly for a reader.' },
      { start: 25, duration: 2, text: 'A new section follows the pause.' }
    ]);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.start).toBe(0);
    expect(paragraphs[1]?.start).toBe(25);
    expect(paragraphs[0]?.text).toContain('first thought');
  });
});

describe('source handling', () => {
  it('allows only supported talk pages', () => {
    expect(detectSupportedSite('https://www.youtube.com/watch?v=abc')).toBe('YouTube');
    expect(detectSupportedSite('https://youtu.be/abc')).toBe('YouTube');
    expect(detectSupportedSite('https://www.ted.com/talks/a_useful_talk')).toBe('TED');
    expect(detectSupportedSite('https://www.youtube.com/')).toBeNull();
    expect(detectSupportedSite('https://example.com/watch?v=abc')).toBeNull();
  });

  it('removes tracking and start parameters while keeping source identity', () => {
    expect(canonicalSourceUrl('https://www.youtube.com/watch?v=abc&t=20&si=secret')).toBe('https://www.youtube.com/watch?v=abc');
  });
});
