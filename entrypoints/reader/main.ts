import { browser } from 'wxt/browser';
import '../../styles/tokens.css';
import '../../styles/reader.css';
import { formatTimestamp, groupSegments } from '../../lib/transcript';
import type { SavedHighlight, StudySession, TranscriptParagraph } from '../../lib/types';

interface ReaderSettings { theme: 'system' | 'light' | 'dark'; fontSize: number; generousSpacing: boolean }

const sessionId = new URLSearchParams(location.search).get('session');
const loading = document.querySelector<HTMLElement>('#loading')!;
const errorState = document.querySelector<HTMLElement>('#error-state')!;
const readerShell = document.querySelector<HTMLElement>('#reader-shell')!;
const paragraphsElement = document.querySelector<HTMLElement>('#paragraphs')!;
const titleElement = document.querySelector<HTMLElement>('#reader-title')!;
const search = document.querySelector<HTMLInputElement>('#search')!;
const searchStatus = document.querySelector<HTMLElement>('#search-status')!;
const speakButton = document.querySelector<HTMLButtonElement>('#speak')!;
const stopButton = document.querySelector<HTMLButtonElement>('#stop')!;
const saveSelectionButton = document.querySelector<HTMLButtonElement>('#save-selection')!;
const toast = document.querySelector<HTMLElement>('#toast')!;
const toastText = document.querySelector<HTMLElement>('#toast-text')!;
const toastAction = document.querySelector<HTMLButtonElement>('#toast-action')!;
let session: StudySession;
let paragraphs: TranscriptParagraph[] = [];
let highlights: SavedHighlight[] = [];
let activeIndex = 0;
let speaking = false;
let currentSelection: { paragraphId: string; start: number; text: string } | null = null;
let undoHighlight: SavedHighlight | null = null;
let toastTimer = 0;
let progressObserver: IntersectionObserver | undefined;

function showToast(message: string, undo = false): void {
  window.clearTimeout(toastTimer);
  toastText.textContent = message;
  toastAction.hidden = !undo;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 5200);
}

function setError(title: string, copy: string): void {
  loading.hidden = true;
  readerShell.hidden = true;
  errorState.hidden = false;
  document.querySelector('#error-title')!.textContent = title;
  document.querySelector('#error-copy')!.textContent = copy;
  document.title = `${title} — Transcript Study View`;
}

function applyHighlights(container: HTMLElement, text: string, saved: SavedHighlight[]): void {
  const matches = saved
    .map((item) => ({ start: text.toLocaleLowerCase().indexOf(item.text.toLocaleLowerCase()), item }))
    .filter(({ start }) => start >= 0)
    .sort((a, b) => a.start - b.start);
  let cursor = 0;
  matches.forEach(({ start, item }) => {
    if (start < cursor) return;
    container.append(document.createTextNode(text.slice(cursor, start)));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(start, start + item.text.length);
    mark.title = 'Saved locally';
    container.append(mark);
    cursor = start + item.text.length;
  });
  container.append(document.createTextNode(text.slice(cursor)));
}

function makeParagraph(paragraph: TranscriptParagraph, index: number): HTMLElement {
  const section = document.createElement('section');
  section.className = 'paragraph';
  section.id = paragraph.id;
  section.dataset.index = String(index);
  section.tabIndex = -1;

  const rail = document.createElement('div');
  rail.className = 'paragraph-rail';
  const timestamp = document.createElement('button');
  timestamp.type = 'button';
  timestamp.className = 'timestamp';
  timestamp.dataset.seek = String(paragraph.start);
  timestamp.setAttribute('aria-label', `Return to source at ${formatTimestamp(paragraph.start)}`);
  timestamp.textContent = formatTimestamp(paragraph.start);
  rail.append(timestamp);

  const content = document.createElement('div');
  content.className = 'paragraph-content';
  const text = document.createElement('p');
  text.className = 'paragraph-text';
  applyHighlights(text, paragraph.text, highlights.filter((item) => item.paragraphId === paragraph.id));
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'save-paragraph';
  save.dataset.saveParagraph = paragraph.id;
  save.textContent = highlights.some((item) => item.paragraphId === paragraph.id && item.text === paragraph.text) ? 'Saved' : 'Save paragraph';
  save.setAttribute('aria-label', `${save.textContent} at ${formatTimestamp(paragraph.start)}`);
  content.append(text, save);
  section.append(rail, content);
  return section;
}

function renderParagraphs(): void {
  paragraphsElement.replaceChildren(...paragraphs.map(makeParagraph));
  if (!readerShell.hidden) observeProgress();
}

async function persistHighlights(): Promise<void> {
  await browser.storage.local.set({ [`highlights:${session.sourceUrl}`]: highlights });
  renderHighlightsPanel();
  renderParagraphs();
}

function renderHighlightsPanel(): void {
  const list = document.querySelector<HTMLElement>('#highlights')!;
  document.querySelector('#highlight-count')!.textContent = String(highlights.length);
  if (!highlights.length) {
    list.innerHTML = '<p class="subtle">Select words or save a paragraph. Highlights stay on this device.</p>';
    return;
  }
  list.replaceChildren(...highlights.map((highlight) => {
    const item = document.createElement('div');
    item.className = 'highlight-item';
    const jump = document.createElement('button');
    jump.type = 'button';
    jump.className = 'highlight-jump';
    jump.textContent = `“${highlight.text.slice(0, 74)}${highlight.text.length > 74 ? '…' : ''}”`;
    jump.addEventListener('click', () => focusParagraph(highlight.paragraphId));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'highlight-remove';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove highlight at ${formatTimestamp(highlight.start)}`);
    remove.addEventListener('click', async () => {
      const removed = highlight;
      highlights = highlights.filter((itemHighlight) => itemHighlight.id !== highlight.id);
      await persistHighlights();
      undoHighlight = removed;
      showToast('Highlight removed.', true);
    });
    item.append(jump, remove);
    return item;
  }));
}

async function saveHighlight(data: { paragraphId: string; start: number; text: string }): Promise<void> {
  const normalized = data.text.replace(/\s+/g, ' ').trim();
  if (!normalized || highlights.some((item) => item.paragraphId === data.paragraphId && item.text === normalized)) {
    showToast('That passage is already saved.');
    return;
  }
  highlights.push({ ...data, text: normalized, id: crypto.randomUUID(), sourceUrl: session.sourceUrl, createdAt: Date.now() });
  await persistHighlights();
  currentSelection = null;
  saveSelectionButton.disabled = true;
  getSelection()?.removeAllRanges();
  showToast('Highlight saved on this device.');
}

async function seekSource(seconds: number): Promise<void> {
  try {
    const tab = await browser.tabs.get(session.sourceTabId);
    await browser.tabs.sendMessage(session.sourceTabId, { type: 'SEEK', seconds });
    if (tab.windowId) await browser.windows.update(tab.windowId, { focused: true });
    await browser.tabs.update(session.sourceTabId, { active: true });
  } catch {
    showToast('The original tab is closed. Opening the source again.');
    await browser.tabs.create({ url: `${session.sourceUrl}${session.sourceUrl.includes('?') ? '&' : '?'}t=${Math.floor(seconds)}s` });
  }
}

function focusParagraph(idOrIndex: string | number): void {
  const target = typeof idOrIndex === 'number'
    ? document.querySelector<HTMLElement>(`.paragraph[data-index="${Math.max(0, Math.min(paragraphs.length - 1, idOrIndex))}"]`)
    : document.getElementById(idOrIndex);
  if (!target) return;
  activeIndex = Number(target.dataset.index ?? activeIndex);
  document.querySelectorAll('.paragraph.is-current').forEach((element) => element.classList.remove('is-current'));
  target.classList.add('is-current');
  target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  target.focus({ preventScroll: true });
}

function stopSpeaking(): void {
  speechSynthesis.cancel();
  speaking = false;
  speakButton.querySelector('span:last-child')!.textContent = 'Read aloud';
  speakButton.querySelector('span:first-child')!.textContent = '▶';
  stopButton.disabled = true;
  document.querySelectorAll('.paragraph.is-speaking').forEach((element) => element.classList.remove('is-speaking'));
}

function speakFrom(index: number): void {
  if (!('speechSynthesis' in window)) {
    showToast('Browser voice is not available here. You can still read and use timestamps.');
    return;
  }
  speechSynthesis.cancel();
  speaking = true;
  speakButton.querySelector('span:last-child')!.textContent = 'Pause voice';
  speakButton.querySelector('span:first-child')!.textContent = '❚❚';
  stopButton.disabled = false;
  const speakNext = (nextIndex: number) => {
    if (!speaking || nextIndex >= paragraphs.length) { stopSpeaking(); return; }
    activeIndex = nextIndex;
    const element = document.querySelector<HTMLElement>(`.paragraph[data-index="${nextIndex}"]`);
    document.querySelectorAll('.paragraph.is-speaking').forEach((item) => item.classList.remove('is-speaking'));
    element?.classList.add('is-speaking');
    element?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const utterance = new SpeechSynthesisUtterance(paragraphs[nextIndex]!.text);
    utterance.onend = () => speakNext(nextIndex + 1);
    utterance.onerror = () => { stopSpeaking(); showToast('Browser voice stopped unexpectedly. Try Read aloud again.'); };
    speechSynthesis.speak(utterance);
  };
  speakNext(index);
}

function applySettings(settings: ReaderSettings): void {
  document.documentElement.dataset.theme = settings.theme === 'system' ? '' : settings.theme;
  document.documentElement.style.setProperty('--reader-size', `${settings.fontSize}px`);
  document.documentElement.classList.toggle('generous-spacing', settings.generousSpacing);
  document.querySelector<HTMLElement>('#font-size')!.textContent = `${settings.fontSize} px`;
  document.querySelector<HTMLInputElement>('#spacing')!.checked = settings.generousSpacing;
  document.querySelector<HTMLSelectElement>('#theme')!.value = settings.theme;
}

async function updateSetting(update: Partial<ReaderSettings>): Promise<void> {
  const stored = await browser.storage.local.get('readerSettings');
  const settings = { theme: 'system', fontSize: 20, generousSpacing: false, ...(stored.readerSettings as Partial<ReaderSettings>), ...update } as ReaderSettings;
  await browser.storage.local.set({ readerSettings: settings });
  applySettings(settings);
}

function bindEvents(): void {
  paragraphsElement.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const seekButton = target.closest<HTMLButtonElement>('[data-seek]');
    if (seekButton) await seekSource(Number(seekButton.dataset.seek));
    const saveButton = target.closest<HTMLButtonElement>('[data-save-paragraph]');
    if (saveButton) {
      const paragraph = paragraphs.find((item) => item.id === saveButton.dataset.saveParagraph);
      if (paragraph) await saveHighlight({ paragraphId: paragraph.id, start: paragraph.start, text: paragraph.text });
    }
  });

  document.addEventListener('selectionchange', () => {
    const selection = getSelection();
    const text = selection?.toString().replace(/\s+/g, ' ').trim() ?? '';
    const node = selection?.anchorNode instanceof Element ? selection.anchorNode : selection?.anchorNode?.parentElement;
    const paragraphElement = node?.closest<HTMLElement>('.paragraph');
    const paragraph = paragraphs.find((item) => item.id === paragraphElement?.id);
    currentSelection = text && paragraph ? { paragraphId: paragraph.id, start: paragraph.start, text: text.slice(0, 1200) } : null;
    saveSelectionButton.disabled = !currentSelection;
  });
  saveSelectionButton.addEventListener('click', () => { if (currentSelection) void saveHighlight(currentSelection); });

  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    document.querySelectorAll<HTMLElement>('.paragraph').forEach((element, index) => {
      const match = !query || paragraphs[index]!.text.toLocaleLowerCase().includes(query);
      element.hidden = !match;
      if (match) visible += 1;
    });
    searchStatus.textContent = query ? `${visible} ${visible === 1 ? 'paragraph' : 'paragraphs'} found` : '';
  });

  speakButton.addEventListener('click', () => {
    if (speaking && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      speakButton.querySelector('span:last-child')!.textContent = 'Resume voice';
    } else if (speaking && speechSynthesis.paused) {
      speechSynthesis.resume();
      speakButton.querySelector('span:last-child')!.textContent = 'Pause voice';
    } else speakFrom(activeIndex);
  });
  stopButton.addEventListener('click', stopSpeaking);
  toastAction.addEventListener('click', async () => {
    if (!undoHighlight) return;
    highlights.push(undoHighlight);
    undoHighlight = null;
    await persistHighlights();
    toast.hidden = true;
  });

  document.querySelector('#font-down')!.addEventListener('click', async () => {
    const current = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--reader-size')) || 20;
    await updateSetting({ fontSize: Math.max(17, current - 1) });
  });
  document.querySelector('#font-up')!.addEventListener('click', async () => {
    const current = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--reader-size')) || 20;
    await updateSetting({ fontSize: Math.min(28, current + 1) });
  });
  document.querySelector<HTMLInputElement>('#spacing')!.addEventListener('change', (event) => void updateSetting({ generousSpacing: (event.target as HTMLInputElement).checked }));
  document.querySelector<HTMLSelectElement>('#theme')!.addEventListener('change', (event) => void updateSetting({ theme: (event.target as HTMLSelectElement).value as ReaderSettings['theme'] }));

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    const typing = target.matches('input, textarea, select, button, a, summary');
    if (event.key === '/' && !typing) { event.preventDefault(); search.focus(); }
    if (event.key === 'Escape') stopSpeaking();
    if (typing) return;
    if (event.key.toLowerCase() === 'j') { event.preventDefault(); focusParagraph(activeIndex + 1); }
    if (event.key.toLowerCase() === 'k') { event.preventDefault(); focusParagraph(activeIndex - 1); }
    if (event.key === ' ') { event.preventDefault(); speakButton.click(); }
  });
  window.addEventListener('beforeunload', () => speechSynthesis.cancel());
}

function observeProgress(): void {
  progressObserver?.disconnect();
  progressObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    activeIndex = Number((visible.target as HTMLElement).dataset.index ?? activeIndex);
    const percentage = Math.round(((activeIndex + 1) / paragraphs.length) * 100);
    document.querySelector<HTMLElement>('#progress-label')!.textContent = `${percentage}%`;
    document.querySelector<HTMLElement>('#progress-bar')!.style.width = `${percentage}%`;
  }, { rootMargin: '-30% 0px -50%', threshold: [0, 0.4, 0.8] });
  document.querySelectorAll('.paragraph').forEach((element) => progressObserver?.observe(element));
}

async function initialize(): Promise<void> {
  if (!sessionId) { setError('No transcript was supplied.', 'Open the extension from a YouTube video or TED talk with an official transcript.'); return; }
  const data = await browser.storage.session.get(`session:${sessionId}`);
  const storedSession = data[`session:${sessionId}`] as StudySession | undefined;
  if (!storedSession?.segments?.length) { setError('This study session has ended.', 'For privacy, captured transcript text is kept only for the browser session. Reopen the extension from the original talk.'); return; }
  session = storedSession;
  paragraphs = groupSegments(session.segments);
  if (!paragraphs.length) { setError('This transcript is empty.', 'Return to the source, open its transcript panel, and try again.'); return; }
  const stored = await browser.storage.local.get([`highlights:${session.sourceUrl}`, 'readerSettings']);
  highlights = (stored[`highlights:${session.sourceUrl}`] as SavedHighlight[] | undefined) ?? [];
  applySettings({ theme: 'system', fontSize: 20, generousSpacing: false, ...(stored.readerSettings as Partial<ReaderSettings>) } as ReaderSettings);

  loading.hidden = true;
  errorState.hidden = true;
  readerShell.hidden = false;
  titleElement.textContent = session.title;
  document.title = `${session.title} — Study View`;
  document.querySelector('#transcript-meta')!.textContent = `${session.site} · Official source transcript`;
  document.querySelector('#source-site')!.textContent = session.title;
  document.querySelector('#duration')!.textContent = `${formatTimestamp(session.segments.at(-1)!.start)} talk · ${paragraphs.length} reading sections`;
  for (const selector of ['#source-link', '#source-top']) (document.querySelector<HTMLAnchorElement>(selector)!).href = session.sourceUrl;
  renderHighlightsPanel();
  renderParagraphs();
  bindEvents();
  observeProgress();
  titleElement.focus();
}

void initialize();
