import { browser } from 'wxt/browser';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason !== 'install') return;
    await browser.storage.local.set({
      readerSettings: { theme: 'system', fontSize: 20, generousSpacing: false }
    });
  });
});
