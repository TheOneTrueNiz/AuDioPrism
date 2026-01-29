// background.js

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'START_PRISM_SILENT') {
    await ensureOffscreenDocument();
    
    // Get the ID of the tab that sent the message
    const tabId = sender.tab.id;
    
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId, consumerTabId: null }, (streamId) => {
        if (chrome.runtime.lastError || !streamId) return;
        
        // Wait for offscreen doc to be ready
        setTimeout(() => {
            chrome.runtime.sendMessage({ 
              type: 'INIT_AUDIO', 
              streamId: streamId 
            });
        }, 500);
    });
  }
  
  if (msg.type === 'STOP_PRISM') {
    if (await chrome.offscreen.hasDocument()) {
        await chrome.offscreen.closeDocument();
    }
    // Also notify tabs to hide UI
    chrome.tabs.query({ url: "*://music.youtube.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: 'FORCE_DEACTIVATE' }).catch(() => {});
        });
    });
  }
});

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({});
  if (existingContexts.some(c => c.contextType === 'OFFSCREEN_DOCUMENT')) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK', 'USER_MEDIA'],
    justification: 'Prism 8D Audio Engine'
  });
}
