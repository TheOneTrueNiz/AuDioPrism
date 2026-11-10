const statusEl = document.getElementById('status-text');
const statusLabel = document.getElementById('status-label');
const hintEl = document.getElementById('hint');

const setStatus = (msg, kind = '') => {
  if (!statusEl) return;
  statusLabel.textContent = msg;
  statusEl.classList.toggle('live', kind === 'live');
  statusEl.classList.toggle('error', kind === 'error');
  if (!hintEl || kind === 'error') return;
  hintEl.textContent = kind === 'live'
    ? 'Closing the mixer does not stop processing.'
    : 'Open YouTube Music, Spotify, or Apple Music in this tab.';
};

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function refreshState() {
  try {
    const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (state && state.engineOn) setStatus('Live', 'live');
    else setStatus('Idle');
  } catch (_) {
    setStatus('Idle');
  }
}

const UI_VERSION = '2.2.9';

function isPlayerTab(url) {
  return /music\.youtube\.com|open\.spotify\.com|play\.spotify\.com|music\.apple\.com/.test(url || '');
}

async function openMixerOnTab(tab) {
  let stale = true;
  try {
    const ping = await chrome.tabs.sendMessage(tab.id, { type: 'PING_UI' });
    stale = !ping || ping.version !== UI_VERSION;
  } catch (_) {
    stale = true;
  }
  if (stale) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['defaults.js', 'hosts.js', 'content.js']
    });
  }
  await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_OVERLAY' });
}

document.getElementById('btnStart').addEventListener('click', async () => {
  try {
    const tab = await activeTab();
    if (!tab || !isPlayerTab(tab.url)) {
      setStatus('Open a music tab first', 'error');
      return;
    }
    await openMixerOnTab(tab);
    window.close();
  } catch (e) {
    setStatus(String(e.message || e), 'error');
  }
});

document.getElementById('btnStop').addEventListener('click', async () => {
  try {
    await chrome.runtime.sendMessage({ type: 'STOP_PRISM' });
    const tab = await activeTab();
    if (tab) chrome.tabs.sendMessage(tab.id, { type: 'FORCE_DEACTIVATE' }).catch(() => {});
    window.close();
  } catch (e) {
    setStatus(String(e.message || e), 'error');
  }
});

refreshState();
