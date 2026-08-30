// background.js — AuDioPrism lifecycle
// Engine lives in the offscreen document. Opening the mixer must NOT recapture.

let engineOn = false;
let capturingTabId = null;
let offscreenReady = false;
let readyWaiters = [];

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function notifyReady() {
    offscreenReady = true;
    readyWaiters.splice(0).forEach((fn) => fn());
}

function waitForOffscreenReady(ms = 2000) {
    if (offscreenReady) return Promise.resolve();
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        readyWaiters.push(() => {
            clearTimeout(timer);
            resolve();
        });
    });
}

async function ensureOffscreenDocument() {
    const existing = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    if (existing.length) {
        if (!offscreenReady) {
            try {
                const pong = await chrome.runtime.sendMessage({ type: 'PING_ENGINE' });
                if (pong && pong.ready) offscreenReady = true;
            } catch (_) { /* document may still be booting */ }
        }
        if (!offscreenReady) await waitForOffscreenReady();
        return;
    }

    offscreenReady = false;
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK', 'USER_MEDIA'],
        justification: 'Prism 8D Audio Engine'
    });
    await waitForOffscreenReady();
}

async function isEngineRunning() {
    try {
        const pong = await chrome.runtime.sendMessage({ type: 'PING_ENGINE' });
        return !!(pong && pong.running);
    } catch (_) {
        return false;
    }
}

async function startEngine(tabId, snapshot) {
    await ensureOffscreenDocument();

    if (await isEngineRunning()) {
        engineOn = true;
        capturingTabId = capturingTabId || tabId;
        if (snapshot) chrome.runtime.sendMessage({ type: 'SNAPSHOT', snapshot }).catch(() => {});
        return { ok: true, already: true };
    }

    const streamId = await new Promise((resolve, reject) => {
        chrome.tabCapture.getMediaStreamId(
            { targetTabId: tabId, consumerTabId: null },
            (id) => {
                if (chrome.runtime.lastError || !id) {
                    reject(new Error(chrome.runtime.lastError?.message || 'No stream id'));
                    return;
                }
                resolve(id);
            }
        );
    });

    const result = await chrome.runtime.sendMessage({
        type: 'INIT_AUDIO',
        streamId,
        snapshot
    });

    if (result && result.ok === false) {
        throw new Error(result.error || 'Engine init failed');
    }

    engineOn = true;
    capturingTabId = tabId;
    return { ok: true };
}

async function stopEngine() {
    if (await chrome.offscreen.hasDocument()) {
        try { await chrome.runtime.sendMessage({ type: 'FADE_STOP' }); }
        catch (_) { /* engine may already be gone */ }
        await sleep(260);
        if (await chrome.offscreen.hasDocument()) {
            await chrome.offscreen.closeDocument();
        }
    }
    offscreenReady = false;
    engineOn = false;
    capturingTabId = null;

    const tabs = await queryPlayerTabs();
    for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'FORCE_DEACTIVATE' }).catch(() => {});
    }
}

const PLAYER_URLS = [
    '*://music.youtube.com/*',
    '*://open.spotify.com/*',
    '*://play.spotify.com/*',
    '*://music.apple.com/*'
];

async function queryPlayerTabs() {
    const chunks = await Promise.all(PLAYER_URLS.map((url) => chrome.tabs.query({ url })));
    return chunks.flat();
}

async function injectIntoPlayerTabs() {
    const tabs = await queryPlayerTabs();
    for (const tab of tabs) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['defaults.js', 'hosts.js', 'content.js']
            });
        } catch (_) { /* tab may not allow scripting yet */ }
    }
}

chrome.runtime.onInstalled.addListener(() => {
    injectIntoPlayerTabs();
});

function broadcastToPlayers(message) {
    PLAYER_URLS.forEach((url) => {
        chrome.tabs.query({ url }, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, message).catch(() => {});
            }
        });
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'OFFSCREEN_READY') {
        notifyReady();
        return false;
    }

    if (msg.type === 'ENGINE_READY') {
        engineOn = true;
        broadcastToPlayers(msg);
        return false;
    }

    if (msg.type === 'ENGINE_STOPPED' || msg.type === 'ENGINE_ERROR') {
        if (msg.type === 'ENGINE_STOPPED') {
            engineOn = false;
            capturingTabId = null;
        }
        broadcastToPlayers(msg);
        return false;
    }

    if (msg.type === 'METER') {
        broadcastToPlayers(msg);
        return false;
    }

    // Content-script control messages must reach the offscreen engine.
    // Relayed only when they originated in a tab, so this cannot loop.
    if (sender.tab && (msg.type === 'UPDATE_KNOB' || msg.type === 'SET_PARAM' || msg.type === 'TOGGLE_MODULE' || msg.type === 'SNAPSHOT' || msg.type === 'SET_BYPASS')) {
        chrome.runtime.sendMessage(msg).catch(() => {});
        return false;
    }

    if (msg.type === 'GET_STATE') {
        isEngineRunning().then((running) => {
            engineOn = running;
            sendResponse({ engineOn: running, tabId: capturingTabId });
        }).catch(() => sendResponse({ engineOn, tabId: capturingTabId }));
        return true;
    }

    if (msg.type === 'START_PRISM_SILENT') {
        const tabId = sender.tab?.id;
        if (!tabId) {
            sendResponse({ ok: false, error: 'No tab' });
            return false;
        }
        startEngine(tabId, msg.snapshot)
            .then((res) => sendResponse(res))
            .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
        return true;
    }

    if (msg.type === 'OPEN_MIXER') {
        const tabId = msg.tabId;
        if (!tabId) {
            sendResponse({ ok: false, error: 'No tab' });
            return false;
        }
        (async () => {
            let stale = true;
            try {
                const ping = await chrome.tabs.sendMessage(tabId, { type: 'PING_UI' });
                stale = !ping || ping.version !== '2.2.8';
            } catch (_) {
                stale = true;
            }
            if (stale) {
                await chrome.scripting.executeScript({
                    target: { tabId },
                    files: ['defaults.js', 'hosts.js', 'content.js']
                });
            }
            await chrome.tabs.sendMessage(tabId, { type: 'OPEN_OVERLAY' });
            sendResponse({ ok: true });
        })().catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
        return true;
    }

    if (msg.type === 'STOP_PRISM') {
        stopEngine()
            .then(() => sendResponse({ ok: true }))
            .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
        return true;
    }

    return false;
});
