const statusEl = document.getElementById('status-text');
const setStatus = (msg, isError = false) => {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', isError);
};

document.getElementById('btnStart').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url.includes('music.youtube.com')) {
      setStatus('Open YouTube Music first', true);
      return;
    }

    // Toggle the Venom Overlay
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' });
    
    window.close();
  } catch (e) {
    setStatus('Popup error: ' + e.toString(), true);
  }
});
document.getElementById('btnStop').addEventListener('click', async () => {
  chrome.runtime.sendMessage({ type: 'STOP_PRISM' });
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: 'FORCE_DEACTIVATE' });
    }
  } catch (e) {
    console.error('Stop error:', e);
  }
  window.close();
});
