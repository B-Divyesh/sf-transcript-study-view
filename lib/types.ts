export interface TranscriptSegment {
  start: number;
  duration?: number;
  text: string;
}

export interface TranscriptParagraph {
  id: string;
  start: number;
  end: number;
  text: string;
  segments: TranscriptSegment[];
}

export interface StudySession {
  id: string;
  sourceUrl: string;
  sourceTabId: number;
  title: string;
  site: 'YouTube' | 'TED';
  segments: TranscriptSegment[];
  createdAt: number;
}

export interface SavedHighlight {
  id: string;
  sourceUrl: string;
  paragraphId: string;
  start: number;
  text: string;
  createdAt: number;
}

export type CaptureResponse =
  | { ok: true; title: string; site: 'YouTube' | 'TED'; segments: TranscriptSegment[] }
  | { ok: false; reason: 'unsupported' | 'missing' | 'offline' | 'error'; message: string };

export type ContentMessage =
  | { type: 'CHECK_TRANSCRIPT' }
  | { type: 'EXTRACT_TRANSCRIPT' }
  | { type: 'SEEK'; seconds: number };
