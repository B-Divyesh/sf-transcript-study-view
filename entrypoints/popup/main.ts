import { browser } from 'wxt/browser';
import '../../styles/tokens.css';
import './popup.css';
import { canonicalSourceUrl, detectSupportedSite } from '../../lib/transcript';
import type { CaptureResponse, StudySession } from '../../lib/types';

const button = document.querySelector<HTMLButtonElement>('#open-reader')!;
const status = document.querySelector<HTMLElement>('#status')!;
const statusLabel = document.querySelector<HTMLElement>('#status-label')!;
const statusCopy = document.querySelector<HTMLElement>('#status-copy')!;
let activeTab: chrome.tabs.Tab | undefined;

function setState(kind: 'ready' | 'loading' | 'error' | 'idle', label: string, copy: string): void {
  status.dataset.state = kind;
  statusLabel.textContent = label;
  statusCopy.textContent = copy;
  button.disabled = kind !== 'ready';
  button.querySelector('span')!.textContent = kind === 'loading' ? 'Opening transcript…' : 'Open study view';
}

async function getCapture(type: 'CHECK_TRANSCRIPT' | 'EXTRACT_TRANSCRIPT'): Promise<CaptureResponse> {
  if (!activeTab?.id) return { ok: false, reason: 'unsupported', message: 'Open a supported talk first.' };
  try {
    return await browser.tabs.sendMessage(activeTab.id, { type }) as CaptureResponse;
  } catch {
    return { ok: false, reason: 'error', message: 'Refresh this talk once so Study View can connect, then open the extension again.' };
  }
}

async function initialize(): Promise<void> {
  [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.url || !detectSupportedSite(activeTab.url)) {
    setState('idle', 'No supported talk here', 'Open a YouTube video or TED talk, then return here.');
    return;
  }
  const result = await getCapture('CHECK_TRANSCRIPT');
  if (result.ok) {
    setState('ready', `${result.segments.length} timed lines found`, 'The official transcript is ready to shape into calm paragraphs.');
  } else if (result.reason === 'missing') {
    setState('ready', 'Transcript panel is closed', 'Study View can ask the page to reveal its official transcript.');
  } else {
    setState('error', result.reason === 'offline' ? 'You appear offline' : 'Page connection needed', result.message);
  }
}

button.addEventListener('click', async () => {
  if (!activeTab?.id || !activeTab.url) return;
  setState('loading', 'Reading official captions', 'Keeping timestamps and source attribution intact…');
  const result = await getCapture('EXTRACT_TRANSCRIPT');
  if (!result.ok) {
    setState('error', result.reason === 'missing' ? 'No official transcript found' : 'Could not open this transcript', result.message);
    return;
  }
  const id = crypto.randomUUID();
  const session: StudySession = {
    id,
    sourceUrl: canonicalSourceUrl(activeTab.url),
    sourceTabId: activeTab.id,
    title: result.title,
    site: result.site,
    segments: result.segments,
    createdAt: Date.now()
  };
  await browser.storage.session.set({ [`session:${id}`]: session });
  await browser.tabs.create({ url: `${chrome.runtime.getURL('/reader.html')}?session=${encodeURIComponent(id)}` });
  window.close();
});

void initialize();
