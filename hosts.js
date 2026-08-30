// hosts.js — player adapters for YouTube Music, Spotify Web, Apple Music Web.
// Capture is tab-level; this file only scrapes metadata and clicks the host transport.

(function (root) {
    'use strict';

    function parseClock(s) {
        const p = String(s || '').replace(/^-/, '').trim().split(':').map(Number);
        if (!p.length || p.some((n) => !isFinite(n))) return 0;
        if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
        if (p.length === 2) return p[0] * 60 + p[1];
        return p[0];
    }

    function first(selectors, rootEl) {
        const scope = rootEl || document;
        for (let i = 0; i < selectors.length; i++) {
            try {
                const el = scope.querySelector(selectors[i]);
                if (el) return el;
            } catch (_) { /* bad selector */ }
        }
        return null;
    }

    function clickEl(el) {
        if (!el) return false;
        const root = el.shadowRoot;
        const inner = root && root.querySelector('#button, button, [role="button"]');
        (inner || el).click();
        return true;
    }

    function clickSel(selectors, rootEl) {
        return clickEl(first(selectors, rootEl));
    }

    function textOf(el) {
        return ((el && (el.textContent || el.getAttribute('aria-label'))) || '').replace(/\s+/g, ' ').trim();
    }

    function mediaSessionMeta() {
        try {
            const md = navigator.mediaSession && navigator.mediaSession.metadata;
            if (!md) return null;
            const arts = md.artwork || [];
            let art = '';
            if (arts.length) art = (arts[arts.length - 1].src || arts[0].src || '');
            const title = (md.title || '').trim();
            const artist = (md.artist || '').trim();
            if (!title && !artist) return null;
            return { title: title, artist: artist, art: art };
        } catch (_) {
            return null;
        }
    }

    function mediaEl() {
        const nodes = document.querySelectorAll('video, audio');
        let best = null;
        for (let i = 0; i < nodes.length; i++) {
            const v = nodes[i];
            if (!v) continue;
            if (isFinite(v.duration) && v.duration > 0) {
                best = v;
                if (!v.paused) return v;
            }
        }
        return best;
    }

    function mediaPlaying() {
        const nodes = document.querySelectorAll('video, audio');
        for (let i = 0; i < nodes.length; i++) {
            const v = nodes[i];
            if (v && !v.paused && !v.ended && (v.readyState > 0 || v.currentTime > 0)) return true;
        }
        return false;
    }

    function toggleMedia() {
        const v = mediaEl() || document.querySelector('video, audio');
        if (!v) return false;
        if (v.paused) v.play().catch(() => {});
        else v.pause();
        return true;
    }

    function seekMedia(ratio) {
        const v = mediaEl();
        if (!v || !isFinite(v.duration) || v.duration <= 0) return false;
        try { v.currentTime = Math.max(0, Math.min(1, ratio)) * v.duration; }
        catch (_) { return false; }
        return true;
    }

    function seekBar(selectors, ratio) {
        const bar = first(selectors);
        if (!bar) return false;
        const input = (bar.tagName === 'INPUT' && bar.type === 'range')
            ? bar
            : bar.querySelector('input[type="range"]');
        if (input) {
            const min = Number(input.min || 0);
            const max = Number(input.max || 100);
            const val = min + Math.max(0, Math.min(1, ratio)) * (max - min);
            const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
            if (proto && proto.set) proto.set.call(input, String(val));
            else input.value = String(val);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
        const r = bar.getBoundingClientRect();
        if (!r.width) return false;
        const x = r.left + Math.max(0, Math.min(1, ratio)) * r.width;
        const y = r.top + r.height / 2;
        bar.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
        bar.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y, view: window }));
        bar.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y }));
        return true;
    }

    function labelIsPause(el) {
        const label = el
            ? [el.getAttribute('aria-label'), el.getAttribute('title')].filter(Boolean).join(' ')
            : '';
        return /pause/i.test(label);
    }

    function clocksFromPair(posEl, durEl) {
        const posText = textOf(posEl);
        const durText = textOf(durEl);
        const current = parseClock(posText);
        const remaining = /^[\s]*-/.test(durText);
        const durAbs = parseClock(durText);
        const duration = remaining ? (current + durAbs) : durAbs;
        return { current: current, duration: duration };
    }

    const ytm = {
        id: 'ytm',
        name: 'YouTube Music',
        play: [
            'ytmusic-player-bar #play-pause-button',
            'ytmusic-player-bar .play-pause-button',
            '#play-pause-button',
            'tp-yt-paper-icon-button#play-pause-button',
            'yt-icon-button#play-pause-button'
        ],
        prev: [
            'ytmusic-player-bar .previous-button',
            'ytmusic-player-bar #previous-button',
            '.previous-button',
            'tp-yt-paper-icon-button.previous-button',
            'yt-icon-button.previous-button'
        ],
        next: [
            'ytmusic-player-bar .next-button',
            'ytmusic-player-bar #next-button',
            '.next-button',
            'tp-yt-paper-icon-button.next-button',
            'yt-icon-button.next-button'
        ],
        scrape: function () {
            const bar = document.querySelector('ytmusic-player-bar');
            const titleEl = (bar && bar.querySelector('.title')) || document.querySelector('yt-formatted-string.title.ytmusic-player-bar');
            const artistEl = (bar && bar.querySelector('.byline')) || document.querySelector('.byline.ytmusic-player-bar');
            const imgEl = (bar && (bar.querySelector('img.image') || bar.querySelector('img'))) || null;
            return {
                title: textOf(titleEl) || 'YouTube Music',
                artist: textOf(artistEl),
                art: (imgEl && imgEl.src) || ''
            };
        },
        timing: function () {
            const v = mediaEl();
            if (v) return { current: v.currentTime || 0, duration: v.duration };
            const el = first(['ytmusic-player-bar .time-info', '.time-info.ytmusic-player-bar', '.time-info']);
            const raw = textOf(el);
            const m = raw.match(/(\d+:\d+(?::\d+)?)\s*\/\s*(\d+:\d+(?::\d+)?)/);
            if (!m) return { current: 0, duration: 0 };
            return { current: parseClock(m[1]), duration: parseClock(m[2]) };
        }
    };

    const spotify = {
        id: 'spotify',
        name: 'Spotify',
        play: [
            '[data-testid="now-playing-bar"] [data-testid="control-button-playpause"]',
            '[data-testid="control-button-playpause"]',
            '[data-testid="control-button-play"]',
            '[data-testid="control-button-pause"]',
            'footer button[aria-label="Play"]',
            'footer button[aria-label="Pause"]'
        ],
        prev: [
            '[data-testid="control-button-skip-back"]',
            'footer button[aria-label="Previous"]'
        ],
        next: [
            '[data-testid="control-button-skip-forward"]',
            'footer button[aria-label="Next"]'
        ],
        scrape: function () {
            const bar = first(['[data-testid="now-playing-bar"]', '[data-testid="now-playing-widget"]']);
            const titleEl = first([
                '[data-testid="context-item-link"]',
                '[data-testid="now-playing-widget"] a',
                '[data-testid="track-info-name"]'
            ], bar);
            const artistEl = first([
                '[data-testid="context-item-info-artist"]',
                '[data-testid="context-item-info-subtitles"]',
                '[data-testid="track-info-artists"]'
            ], bar);
            const imgEl = first([
                '[data-testid="cover-art-image"]',
                '[data-testid="now-playing-widget"] img'
            ], bar);
            const ms = mediaSessionMeta();
            return {
                title: textOf(titleEl) || (ms && ms.title) || 'Spotify',
                artist: textOf(artistEl) || (ms && ms.artist) || '',
                art: (imgEl && (imgEl.src || imgEl.getAttribute('src'))) || (ms && ms.art) || ''
            };
        },
        timing: function () {
            const bar = first(['[data-testid="now-playing-bar"]']);
            const pos = first(['[data-testid="playback-position"]'], bar);
            const dur = first(['[data-testid="playback-duration"]'], bar);
            if (pos || dur) return clocksFromPair(pos, dur);
            const v = mediaEl();
            if (v) return { current: v.currentTime || 0, duration: v.duration };
            return { current: 0, duration: 0 };
        },
        seek: function (ratio) {
            if (seekBar([
                '[data-testid="progress-bar"]',
                '[data-testid="playback-progressbar"]',
                '[data-testid="now-playing-bar"] [data-testid="progress-bar"]'
            ], ratio)) return true;
            return seekMedia(ratio);
        }
    };

    const apple = {
        id: 'apple',
        name: 'Apple Music',
        play: [
            '.web-chrome-playback-controls button[aria-label="Pause"]',
            '.web-chrome-playback-controls button[aria-label="Play"]',
            'amp-playback-controls-play button',
            '.playback-play__btn',
            'button[aria-label="Pause"]',
            'button[aria-label="Play"]'
        ],
        prev: [
            '.web-chrome-playback-controls button[aria-label="Previous"]',
            'amp-playback-controls-item-skip.prev button',
            'button[aria-label="Previous"]',
            'button[aria-label="Previous Track"]'
        ],
        next: [
            '.web-chrome-playback-controls button[aria-label="Next"]',
            'amp-playback-controls-item-skip.next button',
            'button[aria-label="Next"]',
            'button[aria-label="Next Track"]'
        ],
        scrape: function () {
            const titleEl = first([
                '.web-chrome-playback-lcd__meta-inner .lcd-meta__primary-link',
                '.lcd-meta__primary-link',
                '.web-chrome-playback-lcd__name',
                '[data-testid="lcd-meta-line-0"]'
            ]);
            const artistEl = first([
                '.lcd-meta__secondary',
                '.web-chrome-playback-lcd__sub-copy',
                '[data-testid="lcd-meta-line-1"]'
            ]);
            const imgEl = first([
                '.web-chrome-playback-lcd__artwork-container img',
                '.media-artwork-v2__image',
                '.web-chrome-playback-lcd img'
            ]);
            const ms = mediaSessionMeta();
            return {
                title: textOf(titleEl) || (ms && ms.title) || 'Apple Music',
                artist: textOf(artistEl) || (ms && ms.artist) || '',
                art: (imgEl && (imgEl.src || imgEl.currentSrc)) || (ms && ms.art) || ''
            };
        },
        timing: function () {
            const pos = first([
                '.web-chrome-playback-lcd__time-current',
                '.web-chrome-playback-lcd__current-time',
                '[data-testid="playback-time-current"]'
            ]);
            const dur = first([
                '.web-chrome-playback-lcd__time-duration',
                '.web-chrome-playback-lcd__remaining-time',
                '[data-testid="playback-time-duration"]'
            ]);
            if (pos || dur) return clocksFromPair(pos, dur);
            const v = mediaEl();
            if (v) return { current: v.currentTime || 0, duration: v.duration };
            return { current: 0, duration: 0 };
        },
        seek: function (ratio) {
            if (seekBar([
                '.web-chrome-playback-lcd input[type="range"]',
                '.web-chrome-playback-lcd__progress',
                'input[aria-label="Progress"]'
            ], ratio)) return true;
            return seekMedia(ratio);
        }
    };

    function detectId() {
        if (typeof document !== 'undefined') {
            if (document.querySelector('ytmusic-player-bar')) return 'ytm';
            if (document.querySelector('[data-testid="now-playing-bar"], [data-testid="now-playing-widget"]')) return 'spotify';
            if (document.querySelector('.web-chrome, amp-chrome-player, .web-chrome-playback-lcd')) return 'apple';
        }
        const h = (typeof location !== 'undefined' && location.hostname || '').replace(/^www\./, '');
        if (h.indexOf('open.spotify.com') !== -1 || h.indexOf('play.spotify.com') !== -1) return 'spotify';
        if (h.indexOf('music.apple.com') !== -1) return 'apple';
        return 'ytm';
    }

    const byId = { ytm: ytm, spotify: spotify, apple: apple };

    function adapter() {
        return byId[detectId()] || ytm;
    }

    const api = {
        supportedUrl: function (url) {
            return /music\.youtube\.com|open\.spotify\.com|play\.spotify\.com|music\.apple\.com/.test(url || '');
        },
        tabQueryUrls: [
            '*://music.youtube.com/*',
            '*://open.spotify.com/*',
            '*://play.spotify.com/*',
            '*://music.apple.com/*'
        ],
        detect: detectId,
        name: function () { return adapter().name; },
        scrape: function () {
            const a = adapter();
            const n = a.scrape ? a.scrape() : { title: a.name, artist: '', art: '' };
            if ((!n.title || n.title === a.name) || !n.art) {
                const ms = mediaSessionMeta();
                if (ms) {
                    if (!n.title || n.title === a.name) n.title = ms.title || n.title;
                    if (!n.artist) n.artist = ms.artist || '';
                    if (!n.art) n.art = ms.art || '';
                }
            }
            return n;
        },
        timing: function () {
            const a = adapter();
            if (a.timing) return a.timing();
            const v = mediaEl();
            if (v) return { current: v.currentTime || 0, duration: v.duration };
            return { current: 0, duration: 0 };
        },
        playButton: function () { return first(adapter().play); },
        isPlaying: function () {
            if (mediaPlaying()) return true;
            return labelIsPause(first(adapter().play));
        },
        playPause: function () {
            if (clickSel(adapter().play)) return;
            toggleMedia();
        },
        prev: function () { clickSel(adapter().prev); },
        next: function () { clickSel(adapter().next); },
        seek: function (ratio) {
            const a = adapter();
            if (a.seek && a.seek(ratio)) return;
            seekMedia(ratio);
        },
        mediaEl: mediaEl
    };

    root.prismPlayer = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
