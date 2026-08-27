import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  outDir: '.output',
  manifestVersion: 3,
  manifest: {
    name: 'Transcript Study View',
    description: 'Turn official YouTube and TED transcripts into a calm, local reading view.',
    version: '1.0.0',
    permissions: ['activeTab', 'storage'],
    host_permissions: [
      'https://www.youtube.com/*',
      'https://m.youtube.com/*',
      'https://youtu.be/*',
      'https://www.ted.com/*'
    ],
    action: {
      default_title: 'Open Transcript Study View'
    },
    browser_specific_settings: {
      gecko: {
        id: 'transcript-study-view@sociobot.in',
        strict_min_version: '115.0',
        data_collection_permissions: {
          required: ['none']
        }
      }
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png'
    },
    web_accessible_resources: [
      {
        resources: ['fonts/*'],
        matches: ['<all_urls>']
      }
    ]
  }
});
