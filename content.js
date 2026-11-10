// content.js — AuDioPrism mixer (Material 3 console, Shadow DOM)

const PREVIEW = typeof window !== 'undefined' && window.PRISM_PREVIEW === true;
const STORAGE_KEY = 'prismStateV22';
const PRISM_UI_VERSION = '2.2.9';

if (!PREVIEW && window.__PRISM_BOOTED__ === PRISM_UI_VERSION) {
    // This exact UI is already live in this tab.
} else {
if (!PREVIEW) {
    window.__PRISM_BOOTED__ = PRISM_UI_VERSION;
    document.getElementById('prism-host')?.remove();
}

function assetURL(path) {
    if (PREVIEW) return path;
    try { return chrome.runtime.getURL(path); } catch (_) { return path; }
}

const ICON_LOGO = assetURL('icons/513d19b9-d3db-435d-bd2a-c31d8b8d5097.png');
const ICON_MARK = assetURL('icons/prism-icon.png');

const ICONS = {
    close: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 3h-2v10h2V3zm4.83 2.17-1.42 1.42A6.92 6.92 0 0 1 19 12a7 7 0 1 1-14 0c0-2.04.88-3.89 2.3-5.21L5.17 5.17A8.94 8.94 0 0 0 3 12a9 9 0 1 0 18 0 8.94 8.94 0 0 0-2.17-6.83z"/></svg>',
    phones: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h2v-8H5v-2a7 7 0 0 1 14 0v2h-3v8h2a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9z"/></svg>',
    chev: '<svg viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M1.5 1.5 6 6l4.5-4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72L19 12 8 5.14z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h2.2v12H6zm3.4 6 8.6 6.2V5.8z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.8 6H18v12h-2.2zm-9.8 6.2V5.8L14.6 12 6 18.2z"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 18h2v-2h-2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>',
    mark: '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="prism-fab-grad" x1="0.12" y1="1" x2="0.78" y2="0"><stop offset="0%" stop-color="#c084fc"/><stop offset="55%" stop-color="#e879f9"/><stop offset="100%" stop-color="#5ee9f2"/></linearGradient></defs><path fill="url(#prism-fab-grad)" d="M12 2.6 21.4 21.2H2.6Z"/></svg>'
};

const PRISM_STYLES = `
    :host {
        --md-primary: #c084fc;
        --md-on-primary: #2a1248;
        --md-primary-dim: rgba(192, 132, 252, 0.18);
        --md-primary-glow: rgba(192, 132, 252, 0.28);
        --md-accent: #5ee9f2;
        --md-on-accent: #00363c;
        --md-accent-dim: rgba(94, 233, 242, 0.16);
        --md-accent-glow: rgba(94, 233, 242, 0.32);
        --md-tertiary: #e8c47c;
        --md-error: #ffb4ab;
        --md-surface: rgba(8, 6, 14, 0.55);
        --md-surface-2: rgba(255, 255, 255, 0.05);
        --md-surface-3: rgba(255, 255, 255, 0.075);
        --md-surface-4: rgba(12, 8, 20, 0.5);
        --md-on-surface: #f4f0fb;
        --md-on-variant: #c4b8d4;
        --md-outline: rgba(255, 255, 255, 0.14);
        --md-outline-v: rgba(255, 255, 255, 0.08);
        --md-scrim: rgba(6, 2, 12, 0.22);
        --glass-blur: blur(48px) saturate(1.85);
        --glass-inset: inset 0 1px 0 rgba(255, 255, 255, 0.22);
        --glass-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        --font: "Roboto", "YouTube Sans", "Segoe UI", system-ui, sans-serif;
        --font-mono: "Roboto Mono", ui-monospace, Menlo, monospace;
        --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
        font-family: var(--font);
        color: var(--md-on-surface);
        line-height: 1.35;
        -webkit-font-smoothing: antialiased;
    }
    * { box-sizing: border-box; }
    * { scrollbar-width: thin; scrollbar-color: var(--md-outline-v) transparent; }
    *::-webkit-scrollbar { width: 8px; height: 8px; }
    *::-webkit-scrollbar-thumb { background: var(--md-outline); border-radius: 8px; }

    :host(.dragging) { cursor: ns-resize !important; }
    :host(.dragging) * { cursor: ns-resize !important; user-select: none !important; }

    #unified-trigger {
        position: fixed; right: 20px; bottom: 152px; z-index: 2147483647;
        width: 44px; height: 44px; padding: 0;
        border: 1px solid rgba(255,255,255,0.18); border-radius: 50%;
        background: rgba(10, 6, 16, 0.62);
        color: var(--md-primary); cursor: grab;
        display: grid; place-items: center; pointer-events: auto;
        touch-action: none; user-select: none;
        backdrop-filter: blur(22px) saturate(1.6);
        -webkit-backdrop-filter: blur(22px) saturate(1.6);
        box-shadow: var(--glass-inset), 0 8px 28px rgba(0,0,0,0.5);
        transition: transform 0.2s var(--ease), opacity 0.2s, border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    #unified-trigger.placed { right: auto; bottom: auto; }
    #unified-trigger.moving {
        cursor: grabbing;
        transition: none;
        transform: none;
    }
    #unified-trigger.moving:hover { transform: none; }
    #unified-trigger svg {
        width: 22px; height: 22px; display: block; pointer-events: none;
        filter: drop-shadow(0 0 6px var(--md-primary-glow));
    }
    #unified-trigger:hover {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--md-primary) 55%, transparent);
        background: rgba(16, 10, 26, 0.78);
    }
    #unified-trigger:active { transform: scale(0.96); }
    #unified-trigger:focus-visible { outline: 2px solid var(--md-accent); outline-offset: 3px; }
    #unified-trigger.panel-open { opacity: 0; transform: scale(0.6); pointer-events: none; }
    #unified-trigger.live {
        border-color: color-mix(in srgb, var(--md-accent) 50%, transparent);
        box-shadow:
            var(--glass-inset),
            0 8px 28px rgba(0,0,0,0.5),
            0 0 0 1px color-mix(in srgb, var(--md-accent) 22%, transparent),
            0 0 18px var(--md-accent-dim);
    }
    #unified-trigger .fab-dot {
        position: absolute; top: 5px; right: 5px; width: 7px; height: 7px; border-radius: 50%;
        background: var(--md-accent);
        box-shadow: 0 0 0 2px rgba(10, 6, 16, 0.92);
        opacity: 0; transform: scale(0.5); transition: 0.2s;
    }
    #unified-trigger.live .fab-dot { opacity: 1; transform: scale(1); animation: prism-pulse 2.2s ease-out infinite; }
    @keyframes prism-pulse {
        0% { box-shadow: 0 0 0 2px rgba(10, 6, 16, 0.92), 0 0 0 0 var(--md-accent-glow); }
        70% { box-shadow: 0 0 0 2px rgba(10, 6, 16, 0.92), 0 0 0 7px rgba(94, 233, 242, 0); }
        100% { box-shadow: 0 0 0 2px rgba(10, 6, 16, 0.92), 0 0 0 0 rgba(94, 233, 242, 0); }
    }

    #prism-overlay {
        position: fixed; inset: 0; z-index: 2147483640;
        display: flex; padding: 12px;
        background: transparent; opacity: 0; pointer-events: none;
        transition: opacity 0.22s ease, background 0.22s ease;
    }
    #prism-overlay.open {
        opacity: 1; pointer-events: auto;
        background: var(--md-scrim);
        backdrop-filter: blur(40px) saturate(1.8);
        -webkit-backdrop-filter: blur(40px) saturate(1.8);
    }

    #prism-sheet {
        position: relative;
        isolation: isolate;
        flex: 1; min-height: 0; display: flex; flex-direction: column;
        background:
            radial-gradient(900px 480px at 8% -20%, rgba(192, 132, 252, 0.18), transparent 58%),
            radial-gradient(640px 320px at 100% 0%, rgba(94, 233, 242, 0.06), transparent 50%),
            linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02) 28%, rgba(4, 2, 10, 0.28));
        border: 1px solid rgba(255,255,255,0.22); border-radius: 32px;
        box-shadow:
            var(--glass-inset),
            inset 0 -1px 0 rgba(0,0,0,0.35),
            0 0 0 1px rgba(192, 132, 252, 0.08),
            0 40px 90px rgba(0,0,0,0.55);
        backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
        overflow: hidden;
        transform: translateY(16px) scale(0.985); opacity: 0.7;
        transition: transform 0.34s var(--ease), opacity 0.28s;
    }
    #prism-sheet::before {
        content: '';
        position: absolute; inset: 0; pointer-events: none; z-index: 0;
        background-image: var(--glass-noise);
        background-size: 180px 180px;
        opacity: 0.07;
        mix-blend-mode: overlay;
    }
    #prism-sheet > * { position: relative; z-index: 1; }
    #prism-overlay.open #prism-sheet { transform: none; opacity: 1; }

    .sheet-header {
        flex-shrink: 0; height: 64px;
        display: flex; align-items: center; gap: 12px;
        padding: 0 6px 0 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04);
        backdrop-filter: blur(24px) saturate(1.5);
        -webkit-backdrop-filter: blur(24px) saturate(1.5);
        box-shadow: var(--glass-inset);
    }
    .brand { display: flex; align-items: center; gap: 12px; min-width: 0; flex-shrink: 0; }
    .brand-glyph {
        width: 42px; height: 42px;
        object-fit: contain;
        display: block;
        filter: drop-shadow(0 0 10px var(--md-primary-glow));
    }
    .brand-word {
        font-size: 22px;
        font-weight: 750;
        letter-spacing: 0.01em;
        line-height: 1;
        white-space: nowrap;
        background: linear-gradient(90deg, #e9d5ff 0%, #c084fc 40%, #e879f9 72%, #5ee9f2 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
    }
    .brand-word span { font-weight: 650; }

    .status-chip {
        display: inline-flex; align-items: center; gap: 7px;
        height: 26px; padding: 0 10px; border-radius: 999px; flex-shrink: 0;
        background: rgba(255,255,255,0.06); color: var(--md-on-variant);
        font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        border: 1px solid rgba(255,255,255,0.12);
        backdrop-filter: blur(12px);
    }
    .status-chip::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: #6b7780; }
    .status-chip.live { color: var(--md-accent); border-color: color-mix(in srgb, var(--md-accent) 45%, transparent); background: var(--md-accent-dim); }
    .status-chip.live::before { background: var(--md-accent); box-shadow: 0 0 8px var(--md-accent); }
    .status-chip.error { color: var(--md-error); }
    .status-chip.error::before { background: var(--md-error); }

    .preset-row {
        display: flex; align-items: center; gap: 6px;
        margin-left: auto; min-width: 0; overflow-x: auto; padding: 4px 0;
    }
    .preset-chip {
        height: 30px; padding: 0 12px; border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05);
        color: var(--md-on-surface); font: 500 12px var(--font);
        cursor: pointer; white-space: nowrap;
        backdrop-filter: blur(10px);
        transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
    }
    .preset-chip:hover { background: rgba(255,255,255,0.1); }
    .preset-chip.active {
        background: var(--md-primary-dim);
        border-color: color-mix(in srgb, var(--md-primary) 55%, transparent);
        color: #e9d5ff;
        box-shadow: 0 0 18px var(--md-primary-glow);
    }
    .preset-chip:focus-visible { outline: 2px solid var(--md-primary); outline-offset: 2px; }

    .icon-btn {
        width: 40px; height: 40px; border: none; border-radius: 20px; flex-shrink: 0;
        background: transparent; color: var(--md-on-variant); cursor: pointer;
        display: grid; place-items: center; transition: background 0.15s, color 0.15s;
    }
    .icon-btn svg { width: 22px; height: 22px; }
    .icon-btn:hover { background: rgba(255,255,255,0.1); color: var(--md-on-surface); }
    .icon-btn:focus-visible { outline: 2px solid var(--md-primary); outline-offset: 2px; }
    .icon-btn.power.live { color: var(--md-accent); }
    .icon-btn.power.live:hover { background: var(--md-accent-dim); }

    .now-row {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 16px 10px 18px;
        border-bottom: none;
        background: rgba(255,255,255,0.035);
        flex-shrink: 0; min-height: 58px;
        flex-wrap: wrap;
        box-shadow: var(--glass-inset);
    }
    .now-art {
        width: 44px; height: 44px; border-radius: 10px; object-fit: cover; flex-shrink: 0;
        background: rgba(255,255,255,0.06);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
    }
    .transport { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .tport-btn {
        width: 34px; height: 34px; border: 1px solid rgba(255,255,255,0.1);
        border-radius: 50%; background: rgba(255,255,255,0.05);
        color: var(--md-on-surface); cursor: pointer;
        display: grid; place-items: center;
        backdrop-filter: blur(10px);
        transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
    }
    .tport-btn svg { width: 16px; height: 16px; }
    .tport-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }
    .tport-btn:active { transform: scale(0.94); }
    .tport-btn:focus-visible { outline: 2px solid var(--md-primary); outline-offset: 2px; }
    .tport-play {
        width: 42px; height: 42px;
        background: var(--md-primary-dim);
        border-color: color-mix(in srgb, var(--md-primary) 42%, transparent);
        color: var(--md-primary);
        box-shadow: 0 0 16px var(--md-primary-glow);
    }
    .tport-play svg { width: 20px; height: 20px; }
    .tport-play:hover { background: color-mix(in srgb, var(--md-primary) 28%, transparent); }
    .tport-play.is-playing {
        background: var(--md-accent-dim);
        border-color: color-mix(in srgb, var(--md-accent) 55%, transparent);
        color: var(--md-accent);
        box-shadow: 0 0 16px var(--md-accent-glow);
    }
    .now-meta { flex: 1; min-width: 0; }
    .now-title {
        font-size: 14px; font-weight: 650; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis;
    }
    .now-sub {
        font-size: 11px; color: var(--md-on-variant);
        display: flex; align-items: center; gap: 8px; margin-top: 3px;
        min-width: 0;
    }
    .now-sub #now-artist {
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
    }
    .now-chip {
        flex-shrink: 0; height: 18px; padding: 0 7px; border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.05);
        font: 600 10px/18px var(--font-mono);
        color: var(--md-on-surface); white-space: nowrap;
    }
    .now-chip:empty { display: none; }
    .now-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: auto; }
    .ghost-btn {
        height: 32px; padding: 0 12px; border-radius: 999px; flex-shrink: 0;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.05);
        color: var(--md-on-surface); font: 600 11px/1 var(--font);
        letter-spacing: 0.02em; cursor: pointer; white-space: nowrap;
        backdrop-filter: blur(10px);
        transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .ghost-btn:hover { background: rgba(255,255,255,0.1); }
    .ghost-btn.active {
        border-color: color-mix(in srgb, var(--md-primary) 55%, transparent);
        color: #e9d5ff;
        background: var(--md-primary-dim);
    }
    .ghost-btn.ab-hold {
        background: rgba(255,180,171,0.18);
        border-color: rgba(255,180,171,0.55);
        color: #ffb4ab;
    }
    .kbd-btn { width: 32px; height: 32px; }
    .kbd-btn svg { width: 18px; height: 18px; }
    .kbd-hint {
        display: none;
        position: absolute; top: 124px; right: 18px; z-index: 50;
        width: 228px; padding: 10px 12px; border-radius: 14px;
        background: rgba(10, 6, 18, 0.78);
        border: 1px solid rgba(255,255,255,0.16);
        box-shadow: var(--glass-inset), 0 16px 40px rgba(0,0,0,0.5);
        backdrop-filter: blur(28px) saturate(1.5);
        -webkit-backdrop-filter: blur(28px) saturate(1.5);
        gap: 6px;
    }
    .kbd-hint.open { display: grid; }
    .kbd-row {
        display: flex; justify-content: space-between; align-items: center; gap: 12px;
        font-size: 12px; color: var(--md-on-surface);
    }
    .kbd-row kbd {
        font: 600 11px var(--font-mono); color: var(--md-primary);
        background: var(--md-primary-dim); border: 1px solid color-mix(in srgb, var(--md-primary) 28%, transparent);
        padding: 1px 7px; border-radius: 6px; white-space: nowrap;
    }

    .track-bar {
        height: 14px; flex-shrink: 0; display: flex; align-items: center;
        padding: 0 18px 6px; cursor: pointer;
    }
    .track-bar-track {
        position: relative; flex: 1; height: 5px; border-radius: 99px;
        background: rgba(0,0,0,0.35);
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.45), var(--glass-inset);
    }
    .track-bar:hover .track-bar-track { height: 7px; }
    .track-bar-fill {
        position: absolute; left: 0; top: 0; bottom: 0; width: 0%;
        background: linear-gradient(90deg, var(--md-primary), var(--md-accent));
        border-radius: inherit; pointer-events: none;
        box-shadow: 0 0 12px var(--md-accent-glow);
    }

    .deck-content {
        flex: 1; min-height: 0; overflow: auto;
        display: flex; align-items: stretch; justify-content: center;
        padding: 18px 20px 20px;
    }
    .console {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 268px;
        gap: 16px;
        width: min(1360px, 100%);
        flex: 1;
        min-height: 0;
        align-items: stretch;
    }

    .module-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        grid-template-rows: 1fr 1fr;
        gap: 14px;
        min-height: 0;
    }
    .module {
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: rgba(255, 255, 255, 0.045);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 24px;
        padding: 12px 14px 14px;
        min-width: 0;
        min-height: 0;
        height: 100%;
        box-shadow: var(--glass-inset), 0 12px 32px rgba(0,0,0,0.28);
        backdrop-filter: blur(28px) saturate(1.55);
        -webkit-backdrop-filter: blur(28px) saturate(1.55);
        transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, filter 0.2s;
    }
    .module.on {
        background: rgba(255, 255, 255, 0.055);
        border-color: color-mix(in srgb, var(--md-primary) 55%, rgba(255,255,255,0.18));
        box-shadow:
            var(--glass-inset),
            inset 0 0 48px rgba(192, 132, 252, 0.14),
            0 0 32px rgba(192, 132, 252, 0.16),
            0 12px 32px rgba(0,0,0,0.28);
    }
    .module.off { background: rgba(255, 255, 255, 0.03); }
    .module.off .knob { filter: saturate(0.45); opacity: 0.82; }
    .module.off .knob-ring { opacity: 0.42; }
    .module.off .knob::after { background: #b7a8c9; box-shadow: none; }
    .module.off .knob-value { color: var(--md-on-variant); }
    .module.off .spatial-meter { opacity: 0.4; }
    .module-footer:empty { display: none; height: 0; margin: 0; }

    .module-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; min-width: 0; height: 28px; flex-shrink: 0; }
    .module-label {
        display: flex; align-items: center; gap: 6px; min-width: 0;
        font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    }
    .module-label svg { width: 14px; height: 14px; color: var(--md-on-variant); flex-shrink: 0; }

    .knob-row {
        display: flex; justify-content: space-evenly; align-items: center;
        gap: 4px; min-width: 0; padding: 4px 0 2px; flex: 1; min-height: 96px;
        position: relative;
    }
    .spatial-meter {
        position: absolute; left: 8px; right: 8px; bottom: 0;
        display: flex; align-items: center; gap: 6px; pointer-events: none;
    }
    .spatial-cap {
        font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
        color: var(--md-on-variant); flex-shrink: 0; width: 10px; text-align: center;
    }
    .spatial-led {
        position: relative; flex: 1; height: 10px;
        background: rgba(0,0,0,0.4); border-radius: 99px;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08);
    }
    .spatial-fill {
        position: absolute; top: 0; bottom: 0; left: 50%; width: 0;
        background: color-mix(in srgb, var(--md-accent) 55%, transparent);
        border-radius: 99px;
    }
    .spatial-dot {
        position: absolute; top: 50%; left: 50%; width: 12px; height: 12px;
        border-radius: 50%;
        background: var(--md-accent); box-shadow: 0 0 10px var(--md-accent);
        transform: translate(-50%, -50%);
        will-change: left;
        transition: width 0.08s linear, height 0.08s linear, opacity 0.08s linear;
    }
    .module[data-mod="panner"] .knob-row { padding-bottom: 18px; }
    .module-footer { height: 36px; display: flex; align-items: stretch; flex-shrink: 0; margin-top: auto; }

    .knob-wrapper {
        display: flex; flex-direction: column; align-items: center;
        flex: 1; min-width: 0; max-width: 104px;
        cursor: ns-resize; touch-action: none; user-select: none;
        padding: 2px;
        border-radius: 10px;
    }
    .knob-wrapper:focus-visible { outline: 2px solid var(--md-primary); outline-offset: 2px; }
    .knob-wrapper.dragging .knob-value { color: #fff; }
    .knob {
        width: 60px; height: 60px; border-radius: 50%; position: relative;
        background:
            radial-gradient(circle at 30% 22%, rgba(255,255,255,0.38) 0 1.5px, transparent 8px),
            radial-gradient(circle at 32% 28%, rgba(255,255,255,0.16), transparent 40%),
            radial-gradient(circle at 50% 100%, rgba(192,132,252,0.16), transparent 48%),
            radial-gradient(circle at 50% 54%, #14101c 0%, #07060b 74%);
        border: 1px solid rgba(255,255,255,0.16);
        box-shadow:
            0 12px 22px rgba(0,0,0,0.55),
            inset 0 1px 1px rgba(255,255,255,0.28),
            inset 0 -10px 16px rgba(0,0,0,0.55);
        flex-shrink: 0;
    }
    .knob-ring {
        position: absolute; inset: -7px; border-radius: 50%; pointer-events: none;
        --ring-percent: 0;
        background: conic-gradient(from 220deg, #f3e8ff 0 2%, var(--md-primary) calc(var(--ring-percent) * 280deg), rgba(255,255,255,0.1) 0);
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #fff calc(100% - 4.5px));
        mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #fff calc(100% - 4.5px));
        filter: drop-shadow(0 0 5px var(--md-primary-glow));
    }
    .knob::after {
        content: ''; position: absolute; top: 10%; left: 50%;
        width: 3px; height: 30%;
        background: linear-gradient(180deg, #fff, var(--md-primary));
        border-radius: 2px;
        transform-origin: center bottom; transform: translateX(-50%) rotate(var(--knob-rotation, 0deg));
        box-shadow: 0 0 10px var(--md-primary);
    }
    .knob-value {
        margin-top: 8px; font-size: 12px; font-family: var(--font-mono); font-weight: 600;
        color: var(--md-primary); letter-spacing: 0.01em; text-align: center;
        min-height: 14px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        text-shadow: 0 0 12px var(--md-primary-glow);
    }
    .knob-name {
        font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
        color: var(--md-on-variant); margin-top: 1px;
    }
    .knob-row:has(.knob-wrapper:nth-child(3)) .knob { width: 50px; height: 50px; }
    .knob-row:has(.knob-wrapper:nth-child(3)) .knob-value { font-size: 10px; }

    .toggle {
        width: 48px; height: 28px; border-radius: 14px; flex-shrink: 0;
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
        position: relative; cursor: pointer; transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
        backdrop-filter: blur(8px);
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.35);
    }
    .toggle::after {
        content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
        background: linear-gradient(180deg, #f4f0fb, #c4b8d4);
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        transition: transform 0.2s var(--ease), background 0.2s;
    }
    .toggle.active {
        background: linear-gradient(180deg, #d4b4ff, var(--md-primary));
        border-color: var(--md-primary);
        box-shadow: 0 0 16px var(--md-primary-glow), inset 0 1px 0 rgba(255,255,255,0.35);
    }
    .toggle.active::after { transform: translateX(20px); background: #fff; }
    .toggle:focus-visible { outline: 2px solid var(--md-primary); outline-offset: 3px; }

    .menu-btn {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        width: 100%; min-height: 36px; padding: 0 10px 0 12px;
        border-radius: 12px; border: 1px solid rgba(255,255,255,0.14);
        background: rgba(10, 6, 18, 0.4); color: var(--md-on-surface);
        font: 500 12px var(--font); cursor: pointer; text-align: left;
        backdrop-filter: blur(12px);
    }
    .menu-btn:hover { border-color: color-mix(in srgb, var(--md-primary) 50%, var(--md-outline)); }
    .menu-btn[aria-expanded="true"] { border-color: var(--md-primary); }
    .menu-btn .chev { width: 12px; height: 8px; color: var(--md-on-variant); flex-shrink: 0; }
    .menu-btn .menu-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    #menu-layer { position: absolute; inset: 0; pointer-events: none; z-index: 80; }
    .menu-popover {
        position: fixed; min-width: 180px; max-width: 280px; pointer-events: auto;
        background: rgba(10, 6, 18, 0.78); border: 1px solid rgba(255,255,255,0.16);
        border-radius: 16px; padding: 6px; box-shadow: var(--glass-inset), 0 18px 48px rgba(0,0,0,0.5);
        backdrop-filter: blur(28px) saturate(1.55); -webkit-backdrop-filter: blur(28px) saturate(1.55);
    }
    .menu-item {
        display: block; width: 100%; text-align: left; border: none; background: transparent;
        color: var(--md-on-surface); font: 500 13px var(--font);
        padding: 9px 10px; border-radius: 8px; cursor: pointer;
    }
    .menu-item:hover, .menu-item:focus { background: var(--md-surface-4); outline: none; }
    .menu-item.active { color: var(--md-primary); background: var(--md-primary-dim); }

    .mixer-panel {
        background: rgba(255, 255, 255, 0.045);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 24px; padding: 14px 12px 12px;
        display: flex; flex-direction: column; min-height: 0; min-width: 0;
        box-shadow: var(--glass-inset), 0 12px 32px rgba(0,0,0,0.28);
        backdrop-filter: blur(28px) saturate(1.55);
        -webkit-backdrop-filter: blur(28px) saturate(1.55);
    }
    .mixer-title {
        font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
        text-align: center; color: var(--md-on-variant); margin-bottom: 8px;
    }
    .mixer-vu {
        height: 6px; border-radius: 99px; background: var(--md-surface-4);
        overflow: hidden; margin: 0 10px 12px; flex-shrink: 0;
    }
    .mixer-vu > div {
        height: 100%; width: 100%; transform: scaleX(0); transform-origin: left center;
        background: linear-gradient(90deg, var(--md-primary), var(--md-accent));
    }
    .mixer-faders { display: flex; align-items: stretch; gap: 0; flex: 1; min-height: 220px; }
    .fader-group { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .fader-group-label {
        font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
        color: var(--md-on-variant); text-align: center; margin-bottom: 6px;
    }
    .fader-group-row { display: flex; justify-content: space-evenly; align-items: stretch; flex: 1; gap: 2px; }
    .mixer-rule { width: 1px; background: var(--md-outline-v); margin: 18px 8px 28px; flex-shrink: 0; }

    .fader-wrap {
        display: flex; flex-direction: column; align-items: center;
        height: 100%; flex: 1; min-width: 40px; max-width: 64px;
        cursor: ns-resize; touch-action: none; user-select: none; position: relative;
    }
    .fader-wrap:focus-visible { outline: 2px solid var(--md-primary); outline-offset: 2px; border-radius: 8px; }
    .fader-hit {
        flex: 1; width: 100%; min-height: 80px; position: relative;
        display: flex; justify-content: center;
    }
    .fader-track {
        width: 7px; height: 100%; background: rgba(0,0,0,0.38); border-radius: 99px;
        position: relative; pointer-events: none;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08);
        background-image: linear-gradient(to top, transparent 0, transparent calc(50% - 0.5px), var(--md-outline) calc(50% - 0.5px), var(--md-outline) calc(50% + 0.5px), transparent calc(50% + 0.5px));
    }
    .fader-wrap.unipolar .fader-track {
        background-image: linear-gradient(to top, transparent 0, transparent calc(66.6% - 0.5px), var(--md-accent) calc(66.6% - 0.5px), var(--md-accent) calc(66.6% + 0.5px), transparent calc(66.6% + 0.5px));
    }
    .fader-fill {
        position: absolute; left: 0; width: 100%; border-radius: 99px;
        background: linear-gradient(180deg, #f3e8ff, var(--md-primary));
        box-shadow: 0 0 16px color-mix(in srgb, var(--md-primary) 55%, transparent);
    }
    .fader-handle {
        position: absolute; left: 50%; width: 20px; height: 20px;
        background: linear-gradient(160deg, #fff 0%, #efe6ff 46%, #c4b0e8 100%);
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5), 0 0 12px var(--md-primary-glow), inset 0 1px 0 #fff;
        transform: translate(-50%, 50%);
        pointer-events: none;
    }
    .fader-val {
        font-size: 10px; font-family: var(--font-mono); font-weight: 600;
        color: var(--md-primary); margin: 6px 0 2px; text-align: center;
        min-height: 12px; white-space: nowrap;
    }
    .fader-name {
        font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        color: var(--md-on-variant); text-align: center;
    }

    @media (max-width: 1180px) {
        .console { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) 210px; }
        .mixer-panel { min-height: 200px; }
        .mixer-faders { min-height: 150px; }
        .module-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    @media (max-width: 920px) {
        .module-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(200px, auto)); overflow: auto; min-height: 0; }
        #prism-overlay { padding: 8px; }
        #prism-sheet { border-radius: 20px; }
        .brand-word { font-size: 18px; }
        .brand-glyph { width: 36px; height: 36px; }
        .knob { width: 48px; height: 48px; }
        .knob-row { min-height: 78px; }
        .console { grid-template-rows: minmax(0, 1fr) 200px; min-height: 0; }
    }
    @media (max-width: 640px) {
        .module-grid { grid-template-columns: 1fr 1fr; }
        .sheet-header { height: auto; min-height: 64px; flex-wrap: wrap; padding-top: 6px; padding-bottom: 6px; }
        .brand-word { font-size: 20px; }
        .preset-row { flex-basis: 100%; margin-left: 0; order: 5; }
        .ghost-btn { padding: 0 10px; }
        .kbd-hint { right: 10px; top: auto; bottom: 16px; }
    }
    @media (prefers-reduced-motion: reduce) {
        #prism-overlay, #prism-sheet, #unified-trigger, .module, .toggle, .toggle::after { transition: none; }
        #unified-trigger.live .fab-dot { animation: none; }
    }
`;

const PRISM_HTML = `
    <button id="unified-trigger" type="button" aria-label="Open AuDioPrism mixer" title="Drag to move · click to open">
        ${ICONS.mark}
        <span class="fab-dot"></span>
    </button>
    <div id="prism-overlay">
        <div id="prism-sheet" role="dialog" aria-modal="true" aria-labelledby="prism-title">
            <div class="sheet-header">
                <div class="brand" id="prism-title">
                    <img class="brand-glyph" src="${ICON_MARK}" alt="">
                    <div class="brand-word">Au<span>Dio</span>Prism</div>
                </div>
                <div class="status-chip" id="status-chip">Idle</div>
                <div class="preset-row" id="preset-row">
                    <button type="button" class="preset-chip" data-preset="focus">Focus</button>
                    <button type="button" class="preset-chip" data-preset="relax">Relax</button>
                    <button type="button" class="preset-chip" data-preset="sensory">Sensory</button>
                    <button type="button" class="preset-chip" data-preset="sleep">Sleep</button>
                    <button type="button" class="preset-chip" data-preset="clean">Clean</button>
                </div>
                <button class="icon-btn power" id="btn-power" type="button" title="Stop engine" aria-label="Stop engine">${ICONS.power}</button>
                <button class="icon-btn" id="close-audio" type="button" title="Close mixer — engine keeps running" aria-label="Close mixer">${ICONS.close}</button>
            </div>
            <div class="now-row">
                <img class="now-art" id="now-art" alt="">
                <div class="transport">
                    <button class="tport-btn" id="btn-prev" type="button" title="Previous track ([)" aria-label="Previous track">${ICONS.prev}</button>
                    <button class="tport-btn tport-play" id="btn-play" type="button" title="Play / pause (Space)" aria-label="Play">${ICONS.play}</button>
                    <button class="tport-btn" id="btn-next" type="button" title="Next track (])" aria-label="Next track">${ICONS.next}</button>
                </div>
                <div class="now-meta">
                    <div class="now-title" id="now-title">YouTube Music</div>
                    <div class="now-sub">
                        <span id="now-artist">Play a track</span>
                        <span class="now-chip" id="now-time" title="Track position"></span>
                        <span class="now-chip" id="now-bpm" title="Detected tempo"></span>
                        <span class="now-chip" id="flow-timer" title="Engine session time" hidden></span>
                    </div>
                </div>
                <div class="now-actions">
                    <button class="ghost-btn" id="btn-ab" type="button" title="Hold to hear the unprocessed track (A)">Hold A/B</button>
                    <button class="ghost-btn" id="btn-sync" type="button" title="Lock 8D motion to the song tempo (S)">Beat-sync</button>
                    <button class="ghost-btn" id="btn-share" type="button" title="Copy this mixer state as JSON">Share</button>
                    <button class="icon-btn kbd-btn" id="btn-keys" type="button" title="Keyboard shortcuts" aria-label="Keyboard shortcuts" aria-expanded="false">${ICONS.help}</button>
                </div>
            </div>
            <div class="track-bar" id="track-progress" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" tabindex="0">
                <div class="track-bar-track"><div class="track-bar-fill" id="track-progress-fill"></div></div>
            </div>
            <div class="kbd-hint" id="kbd-hint">
                <div class="kbd-row"><kbd>Space</kbd><span>Play / pause</span></div>
                <div class="kbd-row"><kbd>[ ]</kbd><span>Prev / next</span></div>
                <div class="kbd-row"><kbd>A</kbd><span>Hold dry compare</span></div>
                <div class="kbd-row"><kbd>S</kbd><span>Beat-sync</span></div>
                <div class="kbd-row"><kbd>1–5</kbd><span>Presets</span></div>
                <div class="kbd-row"><kbd>Esc</kbd><span>Close mixer</span></div>
            </div>
            <div class="deck-content">
                <div class="console">
                    <div class="module-grid">
                        <div class="module on" data-mod="panner">
                            <div class="module-header"><span class="module-label">8D Spatial</span><div class="toggle active" id="sw-8d" role="switch" aria-checked="true" tabindex="0"></div></div>
                            <div class="knob-row"><div id="k-speed"></div><div id="k-depth"></div>
                                <div class="spatial-meter" id="spatial-meter">
                                    <span class="spatial-cap">L</span>
                                    <div class="spatial-led">
                                        <div class="spatial-fill" id="spatial-fill"></div>
                                        <span class="spatial-dot" id="spatial-dot"></span>
                                    </div>
                                    <span class="spatial-cap">R</span>
                                </div>
                            </div>
                            <div class="module-footer"><div id="sel-8d-shape"></div></div>
                        </div>
                        <div class="module on" data-mod="width">
                            <div class="module-header"><span class="module-label">Stereo Field</span><div class="toggle active" id="sw-width" role="switch" aria-checked="true" tabindex="0"></div></div>
                            <div class="knob-row"><div id="k-width-amt"></div><div id="k-cross-amount"></div></div>
                            <div class="module-footer"></div>
                        </div>
                        <div class="module on" data-mod="compressor">
                            <div class="module-header"><span class="module-label">Dynamics</span><div class="toggle active" id="sw-comp" role="switch" aria-checked="true" tabindex="0"></div></div>
                            <div class="knob-row"><div id="k-comp-thresh"></div><div id="k-comp-ratio"></div><div id="k-comp-attack"></div></div>
                            <div class="module-footer"></div>
                        </div>
                        <div class="module off" data-mod="binaural">
                            <div class="module-header"><span class="module-label">Binaural ${ICONS.phones}</span><div class="toggle" id="sw-bin" role="switch" aria-checked="false" tabindex="0"></div></div>
                            <div class="knob-row"><div id="k-bin-vol"></div><div id="k-bin-base"></div></div>
                            <div class="module-footer"><div id="sel-bin-wave"></div></div>
                        </div>
                        <div class="module off" data-mod="iso">
                            <div class="module-header"><span class="module-label">Isochronic</span><div class="toggle" id="sw-iso" role="switch" aria-checked="false" tabindex="0"></div></div>
                            <div class="knob-row"><div id="k-iso-freq"></div><div id="k-iso-depth"></div></div>
                            <div class="module-footer"><div id="sel-iso-wave"></div></div>
                        </div>
                        <div class="module off" data-mod="noise">
                            <div class="module-header"><span class="module-label">Masking</span><div class="toggle" id="sw-noise" role="switch" aria-checked="false" tabindex="0"></div></div>
                            <div class="knob-row"><div id="k-noise-vol"></div><div id="k-noise-color"></div></div>
                            <div class="module-footer"></div>
                        </div>
                        <div class="module off" data-mod="saturation">
                            <div class="module-header"><span class="module-label">Harmonics</span><div class="toggle" id="sw-sat" role="switch" aria-checked="false" tabindex="0"></div></div>
                            <div class="knob-row"><div id="k-sat-drive"></div><div id="k-sat-warmth"></div></div>
                            <div class="module-footer"></div>
                        </div>
                        <div class="module on" data-mod="filter">
                            <div class="module-header"><span class="module-label">Sensory EQ</span><div class="toggle active" id="sw-filter" role="switch" aria-checked="true" tabindex="0"></div></div>
                            <div class="knob-row"><div id="k-filter-freq"></div><div id="k-filter-res"></div></div>
                            <div class="module-footer"></div>
                        </div>
                    </div>
                    <div class="mixer-panel">
                        <div class="mixer-title">Master</div>
                        <div class="mixer-vu" aria-hidden="true"><div id="vu-fill"></div></div>
                        <div class="mixer-faders">
                            <div class="fader-group">
                                <div class="fader-group-label">Level</div>
                                <div class="fader-group-row">
                                    <div id="f-music-vol"></div>
                                    <div id="f-fx-vol"></div>
                                </div>
                            </div>
                            <div class="mixer-rule"></div>
                            <div class="fader-group">
                                <div class="fader-group-label">EQ</div>
                                <div class="fader-group-row">
                                    <div id="f-eq-low"></div>
                                    <div id="f-eq-mid"></div>
                                    <div id="f-eq-high"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="menu-layer"></div>
    </div>
`;

const PRESETS = {
    focus: {
        knobs: {
            'k-speed': 0.15, 'k-depth': 0.8,
            'k-width-amt': 1.05, 'k-cross-amount': 0.25,
            'k-comp-thresh': -20, 'k-comp-ratio': 4, 'k-comp-attack': 0.012,
            'k-bin-vol': 0.08, 'k-bin-base': 200,
            'k-iso-freq': 10, 'k-iso-depth': 0.5,
            'k-noise-vol': 0.03, 'k-noise-color': 0.45,
            'k-sat-drive': 0.08, 'k-sat-warmth': 620,
            'k-filter-freq': 14000, 'k-filter-res': 0.6,
            'k-music-vol': 1.0, 'k-fx-vol': 0.9,
            'k-eq-low': 1, 'k-eq-mid': 0, 'k-eq-high': -1
        },
        toggles: { panner: true, width: true, compressor: true, binaural: true, iso: false, noise: false, saturation: false, filter: true },
        params: { panner_shape: 'sine', binaural_beatFreq: 40, iso_wave: 'sine' }
    },
    relax: {
        knobs: {
            'k-speed': 0.08, 'k-depth': 0.6,
            'k-width-amt': 1.15, 'k-cross-amount': 0.3,
            'k-comp-thresh': -18, 'k-comp-ratio': 3, 'k-comp-attack': 0.02,
            'k-bin-vol': 0.07, 'k-bin-base': 200,
            'k-iso-freq': 8, 'k-iso-depth': 0.4,
            'k-noise-vol': 0.04, 'k-noise-color': 0.05,
            'k-sat-drive': 0.12, 'k-sat-warmth': 380,
            'k-filter-freq': 10000, 'k-filter-res': 0.5,
            'k-music-vol': 0.95, 'k-fx-vol': 0.85,
            'k-eq-low': 2, 'k-eq-mid': -1, 'k-eq-high': -2
        },
        toggles: { panner: true, width: true, compressor: true, binaural: true, iso: false, noise: true, saturation: false, filter: true },
        params: { panner_shape: 'random', binaural_beatFreq: 10, iso_wave: 'sine' }
    },
    sensory: {
        knobs: {
            'k-speed': 0.06, 'k-depth': 0.35,
            'k-width-amt': 0.85, 'k-cross-amount': 0.2,
            'k-comp-thresh': -24, 'k-comp-ratio': 6, 'k-comp-attack': 0.008,
            'k-bin-vol': 0.05, 'k-bin-base': 180,
            'k-iso-freq': 6, 'k-iso-depth': 0.3,
            'k-noise-vol': 0.035, 'k-noise-color': 0.0,
            'k-sat-drive': 0.0, 'k-sat-warmth': 300,
            'k-filter-freq': 7500, 'k-filter-res': 0.45,
            'k-music-vol': 0.9, 'k-fx-vol': 0.7,
            'k-eq-low': 0, 'k-eq-mid': -2, 'k-eq-high': -6
        },
        toggles: { panner: false, width: false, compressor: true, binaural: false, iso: false, noise: true, saturation: false, filter: true },
        params: { panner_shape: 'sine', binaural_beatFreq: 10, iso_wave: 'sine' }
    },
    sleep: {
        knobs: {
            'k-speed': 0.05, 'k-depth': 0.45,
            'k-width-amt': 1.0, 'k-cross-amount': 0.2,
            'k-comp-thresh': -16, 'k-comp-ratio': 3, 'k-comp-attack': 0.03,
            'k-bin-vol': 0.06, 'k-bin-base': 180,
            'k-iso-freq': 4, 'k-iso-depth': 0.35,
            'k-noise-vol': 0.05, 'k-noise-color': 0.0,
            'k-sat-drive': 0.05, 'k-sat-warmth': 280,
            'k-filter-freq': 6000, 'k-filter-res': 0.4,
            'k-music-vol': 0.8, 'k-fx-vol': 0.8,
            'k-eq-low': 3, 'k-eq-mid': -2, 'k-eq-high': -8
        },
        toggles: { panner: true, width: false, compressor: true, binaural: true, iso: false, noise: true, saturation: false, filter: true },
        params: { panner_shape: 'random', binaural_beatFreq: 6, iso_wave: 'sine' }
    },
    clean: {
        knobs: {
            'k-speed': 0.15, 'k-depth': 0.0,
            'k-width-amt': 1.0, 'k-cross-amount': 0.3,
            'k-comp-thresh': -20, 'k-comp-ratio': 4, 'k-comp-attack': 0.01,
            'k-bin-vol': 0.1, 'k-bin-base': 200,
            'k-iso-freq': 10, 'k-iso-depth': 0.5,
            'k-noise-vol': 0.05, 'k-noise-color': 0.0,
            'k-sat-drive': 0.0, 'k-sat-warmth': 500,
            'k-filter-freq': 20000, 'k-filter-res': 0.5,
            'k-music-vol': 1.0, 'k-fx-vol': 1.0,
            'k-eq-low': 0, 'k-eq-mid': 0, 'k-eq-high': 0
        },
        toggles: { panner: false, width: false, compressor: false, binaural: false, iso: false, noise: false, saturation: false, filter: false },
        params: { panner_shape: 'sine', binaural_beatFreq: 10, iso_wave: 'sine' }
    }
};

const TOGGLE_MAP = {
    'sw-8d': 'panner',
    'sw-width': 'width',
    'sw-comp': 'compressor',
    'sw-bin': 'binaural',
    'sw-iso': 'iso',
    'sw-noise': 'noise',
    'sw-sat': 'saturation',
    'sw-filter': 'filter'
};

const host = document.createElement('div');
host.id = 'prism-host';
host.dataset.prismVersion = PRISM_UI_VERSION;
host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;display:block;';
(document.documentElement || document.body).appendChild(host);
const shadow = host.attachShadow({ mode: 'open' });
const styleSheet = document.createElement('style');
styleSheet.textContent = PRISM_STYLES;
shadow.appendChild(styleSheet);
const wrapper = document.createElement('div');
wrapper.style.pointerEvents = 'none';
wrapper.innerHTML = PRISM_HTML;
shadow.appendChild(wrapper);

const trigger = shadow.getElementById('unified-trigger');
const overlay = shadow.getElementById('prism-overlay');
const sheet = shadow.getElementById('prism-sheet');
const statusChip = shadow.getElementById('status-chip');
const btnPower = shadow.getElementById('btn-power');
const btnClose = shadow.getElementById('close-audio');
const meterFill = shadow.getElementById('meter-fill');
const meterPeak = shadow.getElementById('meter-peak');
const vuFill = shadow.getElementById('vu-fill');
const menuLayer = shadow.getElementById('menu-layer');
const nowArt = shadow.getElementById('now-art');
const nowTitle = shadow.getElementById('now-title');
const nowArtist = shadow.getElementById('now-artist');
const nowTime = shadow.getElementById('now-time');
const flowEl = shadow.getElementById('flow-timer');
const nowBpm = shadow.getElementById('now-bpm');
const trackBar = shadow.getElementById('track-progress');
const trackFill = shadow.getElementById('track-progress-fill');
const btnAb = shadow.getElementById('btn-ab');
const btnSync = shadow.getElementById('btn-sync');
const btnShare = shadow.getElementById('btn-share');
const btnKeys = shadow.getElementById('btn-keys');
const kbdHint = shadow.getElementById('kbd-hint');
const btnPlay = shadow.getElementById('btn-play');
const btnPrev = shadow.getElementById('btn-prev');
const btnNext = shadow.getElementById('btn-next');

let flowStarted = 0;
let flowClock = null;
let nowClock = null;
let abHeld = false;

const knobs = {};
const faders = {};
const menus = {};
let engineOn = false;
let panelOpen = false;
let starting = false;
let saveTimer = null;
let meterShown = 0;
let peakShown = 0;
let dragCount = 0;

const model = {
    knobs: { ...PRISM_DEFAULTS.knobs },
    toggles: { ...PRISM_DEFAULTS.toggles },
    params: { ...PRISM_DEFAULTS.params },
    preset: PRISM_DEFAULTS.preset
};

function collectSnapshot() {
    return {
        knobs: { ...model.knobs },
        toggles: { ...model.toggles },
        params: { ...model.params },
        preset: model.preset
    };
}

function extSend(msg) {
    try {
        const p = chrome.runtime.sendMessage(msg);
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) { /* preview / disconnected */ }
}

function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try { chrome.storage.local.set({ [STORAGE_KEY]: collectSnapshot() }); } catch (_) { /* ignore */ }
    }, 220);
}

function kSend(id, v) {
    model.knobs[id] = v;
    if (model.preset) {
        model.preset = null;
        highlightPreset(null);
    }
    scheduleSave();
    if (engineOn) extSend({ type: 'UPDATE_KNOB', id, value: v });
}

function setParam(mod, param, val) {
    model.params[mod + '_' + param] = val;
    if (model.preset) {
        model.preset = null;
        highlightPreset(null);
    }
    scheduleSave();
    if (engineOn) extSend({ type: 'SET_PARAM', module: mod, param, value: val });
}

function engageModule(mod) {
    if (!model.toggles[mod]) setToggleUi(mod, true, { send: true });
}

function setStatus(text, kind) {
    statusChip.textContent = text;
    statusChip.classList.toggle('live', kind === 'live');
    statusChip.classList.toggle('error', kind === 'error');
}

function setEngineUi(on) {
    engineOn = on;
    trigger.classList.toggle('live', on);
    btnPower.classList.toggle('live', on);
    if (on) {
        setStatus('Live', 'live');
        startFlowClock();
    } else {
        setStatus('Idle');
        stopFlowClock();
        meterShown = 0;
        peakShown = 0;
        if (meterFill) meterFill.style.transform = 'scaleX(0)';
        if (meterPeak) meterPeak.style.left = '0%';
        if (vuFill) vuFill.style.transform = 'scaleX(0)';
        if (nowBpm) nowBpm.textContent = '';
    }
}

function formatFlow(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function startFlowClock() {
    if (!flowStarted) flowStarted = Date.now();
    if (flowClock) return;
    const tick = () => {
        if (!flowEl) return;
        flowEl.hidden = false;
        flowEl.textContent = 'flow ' + formatFlow(Date.now() - flowStarted);
    };
    tick();
    flowClock = setInterval(tick, 1000);
}

function stopFlowClock() {
    if (flowClock) { clearInterval(flowClock); flowClock = null; }
    flowStarted = 0;
    if (flowEl) {
        flowEl.textContent = '';
        flowEl.hidden = true;
    }
}

function scrapeNowPlaying() {
    if (typeof prismPlayer !== 'undefined' && prismPlayer.scrape) return prismPlayer.scrape();
    return { title: 'YouTube Music', artist: '', art: '' };
}

function parseClock(s) {
    const p = String(s || '').trim().split(':').map(Number);
    if (!p.length || p.some((n) => !isFinite(n))) return 0;
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return p[0];
}

function formatClock(sec) {
    const t = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    if (h) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return m + ':' + String(s).padStart(2, '0');
}

function ytmMedia() {
    if (typeof prismPlayer !== 'undefined' && prismPlayer.mediaEl) return prismPlayer.mediaEl();
    const videos = document.querySelectorAll('video, audio');
    let best = null;
    for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (!v || !isFinite(v.duration) || v.duration <= 0) continue;
        best = v;
        if (!v.paused) return v;
    }
    return best;
}

function scrapeTiming() {
    if (typeof prismPlayer !== 'undefined' && prismPlayer.timing) return prismPlayer.timing();
    const v = ytmMedia();
    if (v) return { current: v.currentTime || 0, duration: v.duration };
    return { current: 0, duration: 0 };
}

function renderTiming(t) {
    const cur = t && t.current || 0;
    const dur = t && t.duration || 0;
    if (nowTime) nowTime.textContent = dur > 0 ? (formatClock(cur) + ' / ' + formatClock(dur)) : '';
    const pct = dur > 0 ? Math.max(0, Math.min(1, cur / dur)) * 100 : 0;
    if (trackFill) trackFill.style.width = pct + '%';
    if (trackBar) {
        trackBar.setAttribute('aria-valuenow', String(Math.floor(cur)));
        trackBar.setAttribute('aria-valuemax', String(Math.floor(dur)));
        trackBar.setAttribute('aria-valuetext', dur > 0 ? formatClock(cur) + ' of ' + formatClock(dur) : 'No track');
    }
}

function ytmSeekRatio(ratio) {
    if (typeof prismPlayer !== 'undefined' && prismPlayer.seek) {
        prismPlayer.seek(ratio);
        renderTiming(scrapeTiming());
        return;
    }
    const v = ytmMedia();
    if (!v || !isFinite(v.duration) || v.duration <= 0) return;
    const t = Math.max(0, Math.min(1, ratio)) * v.duration;
    try { v.currentTime = t; } catch (_) { /* ignore */ }
    renderTiming({ current: t, duration: v.duration });
}

function ytmIsPlaying() {
    if (typeof prismPlayer !== 'undefined' && prismPlayer.isPlaying) return prismPlayer.isPlaying();
    return false;
}

function ytmPlayPause() {
    if (typeof prismPlayer !== 'undefined' && prismPlayer.playPause) prismPlayer.playPause();
}

function ytmPrev() {
    if (typeof prismPlayer !== 'undefined' && prismPlayer.prev) prismPlayer.prev();
}

function ytmNext() {
    if (typeof prismPlayer !== 'undefined' && prismPlayer.next) prismPlayer.next();
}

function syncPlayButton() {
    if (!btnPlay) return;
    const playing = ytmIsPlaying();
    btnPlay.innerHTML = playing ? ICONS.pause : ICONS.play;
    btnPlay.classList.toggle('is-playing', playing);
    btnPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    btnPlay.title = playing ? 'Pause (Space)' : 'Play (Space)';
}

const watchedVideos = new WeakSet();
let playBtnObs = null;
let playBtnWatched = null;

function bindYtmPlaybackWatch() {
    document.querySelectorAll('video, audio').forEach((v) => {
        if (watchedVideos.has(v)) return;
        watchedVideos.add(v);
        ['play', 'pause', 'ended', 'playing', 'seeked', 'timeupdate'].forEach((ev) => {
            v.addEventListener(ev, ev === 'timeupdate' ? () => renderTiming(scrapeTiming()) : syncPlayButton);
        });
    });
    const btn = (typeof prismPlayer !== 'undefined' && prismPlayer.playButton)
        ? prismPlayer.playButton()
        : null;
    if (!btn || btn === playBtnWatched) return;
    playBtnWatched = btn;
    if (playBtnObs) playBtnObs.disconnect();
    playBtnObs = new MutationObserver(syncPlayButton);
    playBtnObs.observe(btn, { attributes: true, attributeFilter: ['title', 'aria-label', 'class'] });
}

function tickNowPlaying() {
    const n = scrapeNowPlaying();
    if (nowTitle) nowTitle.textContent = n.title;
    if (nowArtist) nowArtist.textContent = n.artist || 'Play a track';
    if (nowArt && n.art && nowArt.getAttribute('src') !== n.art) nowArt.src = n.art;
    renderTiming(scrapeTiming());
    bindYtmPlaybackWatch();
    syncPlayButton();
}

function setAb(on) {
    abHeld = !!on;
    if (btnAb) btnAb.classList.toggle('ab-hold', abHeld);
    if (abHeld) setStatus('Dry compare', 'live');
    else if (engineOn) setStatus('Live', 'live');
    extSend({ type: 'SET_BYPASS', active: abHeld });
}

function setBeatSync(on) {
    model.params.panner_beatSync = !!on;
    if (btnSync) btnSync.classList.toggle('active', !!on);
    scheduleSave();
    if (engineOn) extSend({ type: 'SET_PARAM', module: 'panner', param: 'beatSync', value: !!on });
}

if (btnAb) {
    btnAb.addEventListener('pointerdown', (e) => { e.preventDefault(); setAb(true); });
    btnAb.addEventListener('pointerup', () => setAb(false));
    btnAb.addEventListener('pointerleave', () => { if (abHeld) setAb(false); });
    btnAb.addEventListener('pointercancel', () => setAb(false));
}
if (btnSync) btnSync.addEventListener('click', () => setBeatSync(!model.params.panner_beatSync));
if (btnShare) {
    btnShare.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(collectSnapshot(), null, 2));
            setStatus('Preset copied', 'live');
        } catch (_) {
            setStatus('Copy failed', 'error');
        }
    });
}
if (btnPlay) btnPlay.addEventListener('click', () => { ytmPlayPause(); setTimeout(syncPlayButton, 80); });
if (btnPrev) btnPrev.addEventListener('click', () => { ytmPrev(); setTimeout(tickNowPlaying, 250); });
if (btnNext) btnNext.addEventListener('click', () => { ytmNext(); setTimeout(tickNowPlaying, 250); });
if (btnKeys && kbdHint) {
    btnKeys.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !kbdHint.classList.contains('open');
        kbdHint.classList.toggle('open', open);
        btnKeys.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
}
if (trackBar) {
    const ratioFromEvent = (e) => {
        const r = trackBar.getBoundingClientRect();
        return (e.clientX - r.left) / Math.max(1, r.width);
    };
    trackBar.addEventListener('pointerdown', (e) => {
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        try { trackBar.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        ytmSeekRatio(ratioFromEvent(e));
        const pid = e.pointerId;
        const move = (ev) => { if (ev.pointerId === pid) ytmSeekRatio(ratioFromEvent(ev)); };
        const up = (ev) => {
            if (ev.pointerId !== pid) return;
            try { trackBar.releasePointerCapture(pid); } catch (_) { /* ignore */ }
            trackBar.removeEventListener('pointermove', move);
            trackBar.removeEventListener('pointerup', up);
            trackBar.removeEventListener('pointercancel', up);
        };
        trackBar.addEventListener('pointermove', move);
        trackBar.addEventListener('pointerup', up);
        trackBar.addEventListener('pointercancel', up);
    });
    trackBar.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const t = scrapeTiming();
        if (!t.duration) return;
        const delta = e.key === 'ArrowRight' ? 5 : -5;
        ytmSeekRatio((t.current + delta) / t.duration);
    });
}

function openPanel() {
    panelOpen = true;
    overlay.classList.add('open');
    trigger.classList.add('panel-open');
}

function closePanel() {
    Menu.closeAll();
    if (kbdHint) kbdHint.classList.remove('open');
    if (btnKeys) btnKeys.setAttribute('aria-expanded', 'false');
    panelOpen = false;
    overlay.classList.remove('open');
    trigger.classList.remove('panel-open');
}

async function startEngine() {
    if (PREVIEW) {
        setEngineUi(true);
        return;
    }
    if (engineOn) {
        extSend({ type: 'SNAPSHOT', snapshot: collectSnapshot() });
        return;
    }
    if (starting) return;
    starting = true;
    setStatus('Starting…');
    try {
        const res = await chrome.runtime.sendMessage({
            type: 'START_PRISM_SILENT',
            snapshot: collectSnapshot()
        });
        if (res && res.already) {
            setEngineUi(true);
            extSend({ type: 'SNAPSHOT', snapshot: collectSnapshot() });
        } else if (res && res.ok === false) {
            setEngineUi(false);
            setStatus(res.error || 'Capture failed', 'error');
        }
    } catch (err) {
        setEngineUi(false);
        setStatus(String(err.message || err), 'error');
    } finally {
        starting = false;
    }
}

async function stopEngine() {
    if (!PREVIEW) {
        try { await chrome.runtime.sendMessage({ type: 'STOP_PRISM' }); } catch (_) { /* ignore */ }
    }
    setEngineUi(false);
    closePanel();
}

async function activate() {
    openPanel();
    await startEngine();
}

const FAB_SIZE = 44;
const FAB_MARGIN = 10;
const FAB_POS_KEY = 'prismFabPos';
let fabDrag = null;
let fabSkipClick = false;

function clampFab(x, y) {
    const w = window.innerWidth || 400;
    const h = window.innerHeight || 400;
    return {
        x: Math.max(FAB_MARGIN, Math.min(w - FAB_SIZE - FAB_MARGIN, x)),
        y: Math.max(FAB_MARGIN, Math.min(h - FAB_SIZE - FAB_MARGIN, y))
    };
}

function applyFabPos(x, y, { save = false } = {}) {
    const pos = clampFab(x, y);
    trigger.style.left = pos.x + 'px';
    trigger.style.top = pos.y + 'px';
    trigger.style.right = 'auto';
    trigger.style.bottom = 'auto';
    trigger.classList.add('placed');
    if (save && !PREVIEW) {
        try { chrome.storage.local.set({ [FAB_POS_KEY]: pos }); } catch (_) { /* ignore */ }
    }
    return pos;
}

trigger.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    if (panelOpen) return;
    const r = trigger.getBoundingClientRect();
    fabDrag = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: r.left,
        origY: r.top,
        moved: false
    };
    try { trigger.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
});
trigger.addEventListener('pointermove', (e) => {
    if (!fabDrag || e.pointerId !== fabDrag.id) return;
    const dx = e.clientX - fabDrag.startX;
    const dy = e.clientY - fabDrag.startY;
    if (!fabDrag.moved && (dx * dx + dy * dy) < 36) return;
    fabDrag.moved = true;
    trigger.classList.add('moving');
    applyFabPos(fabDrag.origX + dx, fabDrag.origY + dy, { save: false });
});
function endFabDrag(e) {
    if (!fabDrag || (e && e.pointerId !== fabDrag.id)) return;
    const moved = fabDrag.moved;
    try { trigger.releasePointerCapture(fabDrag.id); } catch (_) { /* ignore */ }
    trigger.classList.remove('moving');
    if (moved) {
        const r = trigger.getBoundingClientRect();
        applyFabPos(r.left, r.top, { save: true });
        fabSkipClick = true;
    }
    fabDrag = null;
}
trigger.addEventListener('pointerup', endFabDrag);
trigger.addEventListener('pointercancel', endFabDrag);
window.addEventListener('resize', () => {
    if (!trigger.classList.contains('placed')) return;
    const r = trigger.getBoundingClientRect();
    applyFabPos(r.left, r.top, { save: true });
});

trigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fabSkipClick) { fabSkipClick = false; return; }
    if (!panelOpen) activate();
});
btnClose.addEventListener('click', (e) => { e.stopPropagation(); closePanel(); });
btnPower.addEventListener('click', (e) => {
    e.stopPropagation();
    if (engineOn) stopEngine();
    else activate();
});
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePanel();
});
sheet.addEventListener('click', (e) => {
    e.stopPropagation();
    if (kbdHint && kbdHint.classList.contains('open') && !(btnKeys && btnKeys.contains(e.target))) {
        kbdHint.classList.remove('open');
        if (btnKeys) btnKeys.setAttribute('aria-expanded', 'false');
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (Menu.openInstance) {
            Menu.closeAll();
            e.stopPropagation();
            return;
        }
        if (kbdHint && kbdHint.classList.contains('open')) {
            kbdHint.classList.remove('open');
            if (btnKeys) btnKeys.setAttribute('aria-expanded', 'false');
            e.stopPropagation();
            return;
        }
        if (panelOpen) {
            e.stopPropagation();
            closePanel();
        }
        return;
    }
    if (!panelOpen) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'KeyA' && !e.repeat) {
        e.preventDefault();
        setAb(true);
    }
    if (e.code === 'KeyS' && !e.repeat) {
        e.preventDefault();
        setBeatSync(!model.params.panner_beatSync);
    }
    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        ytmPlayPause();
        setTimeout(syncPlayButton, 80);
    }
    if (e.code === 'BracketLeft' && !e.repeat) {
        e.preventDefault();
        ytmPrev();
        setTimeout(tickNowPlaying, 250);
    }
    if (e.code === 'BracketRight' && !e.repeat) {
        e.preventDefault();
        ytmNext();
        setTimeout(tickNowPlaying, 250);
    }
    if (e.code === 'MediaPlayPause' && !e.repeat) {
        e.preventDefault();
        ytmPlayPause();
        setTimeout(syncPlayButton, 80);
    }
    if (e.code === 'MediaTrackPrevious' && !e.repeat) ytmPrev();
    if (e.code === 'MediaTrackNext' && !e.repeat) ytmNext();
    const presetKeys = { Digit1: 'focus', Digit2: 'relax', Digit3: 'sensory', Digit4: 'sleep', Digit5: 'clean' };
    if (presetKeys[e.code] && !e.repeat) {
        e.preventDefault();
        applyPreset(presetKeys[e.code]);
    }
}, true);

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA' && abHeld) setAb(false);
}, true);

if (!PREVIEW) {
    chrome.runtime.onMessage.addListener((m, _s, sendResponse) => {
        if (m.type === 'PING_UI') {
            sendResponse({ ok: true, version: PRISM_UI_VERSION });
            return false;
        }
        if (m.type === 'OPEN_OVERLAY') activate();
        if (m.type === 'TOGGLE_OVERLAY') {
            if (panelOpen) closePanel();
            else activate();
        }
        if (m.type === 'FORCE_DEACTIVATE') {
            setEngineUi(false);
            closePanel();
        }
        if (m.type === 'ENGINE_READY') {
            setEngineUi(true);
            extSend({ type: 'SNAPSHOT', snapshot: collectSnapshot() });
        }
        if (m.type === 'ENGINE_STOPPED') setEngineUi(false);
        if (m.type === 'ENGINE_ERROR') {
            setEngineUi(false);
            setStatus(m.error || 'Engine error', 'error');
        }
        if (m.type === 'METER') onMeter(m);
    });
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res && res.engineOn) setEngineUi(true);
    });
}

function onMeter(m) {
    const rms = Math.min(1, (m.rms || 0) * 3.4);
    const peak = Math.min(1, m.peak || 0);
    meterShown += (rms - meterShown) * 0.4;
    peakShown += (peak - peakShown) * 0.25;
    if (meterFill) meterFill.style.transform = `scaleX(${meterShown})`;
    if (vuFill) vuFill.style.transform = `scaleX(${meterShown})`;
    if (meterPeak) meterPeak.style.left = (peakShown * 100) + '%';
    if (typeof m.pan === 'number') {
        const pan = Math.max(-1, Math.min(1, m.pan));
        const pct = (pan + 1) * 50;
        const dot = shadow.getElementById('spatial-dot');
        const fill = shadow.getElementById('spatial-fill');
        if (dot) {
            const near = (typeof m.near === 'number') ? Math.max(0, Math.min(1, m.near)) : 0.7;
            const sz = 8 + near * 8;
            dot.style.left = pct + '%';
            dot.style.width = sz + 'px';
            dot.style.height = sz + 'px';
            dot.style.opacity = String(0.4 + near * 0.6);
            dot.style.boxShadow = '0 0 ' + (6 + near * 10) + 'px var(--md-accent)';
        }
        if (fill) {
            const w = Math.abs(pan) * 50;
            fill.style.left = (pan >= 0 ? 50 : 50 - w) + '%';
            fill.style.width = w + '%';
        }
    }
    if (nowBpm) {
        nowBpm.textContent = m.bpm ? (m.bpm + ' BPM') : '';
    }
}

function formatValue(id, value, unit, compact) {
    if (id === 'k-noise-color') {
        if (value < 0.25) return 'Brown';
        if (value < 0.75) return 'Pink';
        return 'White';
    }
    if (id === 'k-sat-warmth') return Math.round(value / 10) + '%';
    if (unit === 'Hz') {
        if (value >= 1000) return (value / 1000).toFixed(1) + ' kHz';
        if (value >= 100) return Math.round(value) + ' Hz';
        return value.toFixed(2) + ' Hz';
    }
    if (unit === 'dB') {
        const rounded = Math.abs(value - Math.round(value)) < 0.05;
        const n = rounded ? String(Math.round(value)) : value.toFixed(1);
        return (value >= 0 ? '+' : '') + n + (compact ? '' : ' dB');
    }
    if (unit === ':1') return value.toFixed(1) + ':1';
    if (unit === 's') return Math.round(value * 1000) + ' ms';
    if (unit === 'x') return value.toFixed(2) + '×';
    return Number(value).toFixed(2);
}

function beginDrag() {
    dragCount += 1;
    host.classList.add('dragging');
}
function endDrag() {
    dragCount = Math.max(0, dragCount - 1);
    if (!dragCount) host.classList.remove('dragging');
}

function toNorm(value, min, max, log) {
    if (log) {
        const a = Math.max(min, value);
        return Math.log(a / min) / Math.log(max / min);
    }
    return (value - min) / (max - min);
}
function fromNorm(n, min, max, log) {
    const t = Math.max(0, Math.min(1, n));
    if (log) return min * Math.pow(max / min, t);
    return min + t * (max - min);
}

class Knob {
    constructor(id, label, min, max, initial, unit, callback, opts = {}) {
        this.id = id;
        this.min = min;
        this.max = max;
        this.initial = initial;
        this.value = initial;
        this.unit = unit;
        this.callback = callback;
        this.log = !!opts.log;
        this.snap = opts.snap;
        this.el = shadow.getElementById(id);
        if (!this.el) return;
        this.el.className = 'knob-wrapper';
        this.el.innerHTML = `<div class="knob" aria-hidden="true"><div class="knob-ring"></div></div><div class="knob-value"></div><div class="knob-name">${label}</div>`;
        this.elRing = this.el.querySelector('.knob-ring');
        this.elKnob = this.el.querySelector('.knob');
        this.elVal = this.el.querySelector('.knob-value');
        this.el.setAttribute('role', 'slider');
        this.el.setAttribute('aria-label', label);
        this.el.tabIndex = 0;

        this.el.addEventListener('pointerdown', (e) => this.onDown(e));
        this.el.addEventListener('dblclick', () => this.setValue(this.initial, { send: true, flush: true }));
        this.el.addEventListener('wheel', (e) => {
            e.preventDefault();
            const dir = Math.sign(-e.deltaY || 0);
            const n = toNorm(this.value, this.min, this.max, this.log) + dir * (e.shiftKey ? 0.008 : 0.03);
            this.setValue(fromNorm(n, this.min, this.max, this.log), { send: true, flush: true });
        }, { passive: false });
        this.el.addEventListener('keydown', (e) => this.onKey(e));
        this.el.addEventListener('contextmenu', (e) => e.preventDefault());
        this.updateUI();
    }

    onKey(e) {
        const step = (e.shiftKey ? 0.008 : 0.03) * (e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 1);
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const n = toNorm(this.value, this.min, this.max, this.log) + step;
            this.setValue(fromNorm(n, this.min, this.max, this.log), { send: true, flush: true });
        }
        if (e.key === 'Home' || e.key === '0') {
            e.preventDefault();
            this.setValue(this.initial, { send: true, flush: true });
        }
    }

    onDown(e) {
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        try { this.el.setPointerCapture(e.pointerId); } catch (_) { /* synthetic / inactive pointer */ }
        this.el.classList.add('dragging');
        beginDrag();
        const startY = e.clientY;
        const startN = toNorm(this.value, this.min, this.max, this.log);
        const pid = e.pointerId;
        const move = (ev) => {
            if (ev.pointerId !== pid) return;
            ev.preventDefault();
            const fine = ev.shiftKey ? 720 : 170;
            const nextN = startN + (startY - ev.clientY) / fine;
            this.setValue(fromNorm(nextN, this.min, this.max, this.log), { send: true });
        };
        const up = (ev) => {
            if (ev.pointerId !== pid) return;
            try { this.el.releasePointerCapture(pid); } catch (_) { /* ignore */ }
            this.el.removeEventListener('pointermove', move);
            this.el.removeEventListener('pointerup', up);
            this.el.removeEventListener('pointercancel', up);
            this.el.classList.remove('dragging');
            endDrag();
            this.flush();
        };
        this.el.addEventListener('pointermove', move);
        this.el.addEventListener('pointerup', up);
        this.el.addEventListener('pointercancel', up);
    }

    queueSend() {
        this.pendingSend = true;
        if (this.raf) return;
        this.raf = requestAnimationFrame(() => {
            this.raf = 0;
            if (this.pendingSend) this.flush();
        });
    }

    flush() {
        this.pendingSend = false;
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
        this.callback(this.value);
    }

    setValue(v, { send = false, flush = false } = {}) {
        let next = Math.max(this.min, Math.min(this.max, v));
        if (this.snap != null && !flush) {
            /* snap applied only when close and not shift-fine — handled in drag via default */
        }
        if (this.snap != null && Math.abs(next - this.snap) <= (this.max - this.min) * 0.012) next = this.snap;
        this.value = next;
        this.updateUI();
        if (send) {
            if (flush) this.flush();
            else this.queueSend();
        }
    }

    updateUI() {
        const percent = toNorm(this.value, this.min, this.max, this.log);
        this.elVal.textContent = formatValue(this.id, this.value, this.unit);
        this.elRing.style.setProperty('--ring-percent', String(percent));
        this.elKnob.style.setProperty('--knob-rotation', (-140 + percent * 280) + 'deg');
        this.el.setAttribute('aria-valuenow', String(this.value));
        this.el.setAttribute('aria-valuetext', this.elVal.textContent);
    }
}

class Fader {
    constructor(id, label, min, max, initial, unit, callback, opts = {}) {
        this.id = id;
        this.min = min;
        this.max = max;
        this.initial = initial;
        this.value = initial;
        this.unit = unit;
        this.callback = callback;
        this.bipolar = !!opts.bipolar;
        this.snap = opts.snap;
        this.el = shadow.getElementById(id);
        if (!this.el) return;
        this.el.className = 'fader-wrap ' + (this.bipolar ? 'bipolar' : 'unipolar');
        this.el.innerHTML = `<div class="fader-hit"><div class="fader-track"><div class="fader-fill"></div><div class="fader-handle"></div></div></div><div class="fader-val"></div><div class="fader-name">${label}</div>`;
        this.elFill = this.el.querySelector('.fader-fill');
        this.elHandle = this.el.querySelector('.fader-handle');
        this.elVal = this.el.querySelector('.fader-val');
        this.elHit = this.el.querySelector('.fader-hit');
        this.el.setAttribute('role', 'slider');
        this.el.setAttribute('aria-label', label);
        this.el.tabIndex = 0;

        this.elHit.addEventListener('pointerdown', (e) => this.onDown(e));
        this.el.addEventListener('dblclick', () => this.setValue(this.initial, { send: true, flush: true }));
        this.el.addEventListener('wheel', (e) => {
            e.preventDefault();
            const span = this.max - this.min;
            this.setValue(this.value + (e.shiftKey ? 0.01 : 0.04) * span * Math.sign(-e.deltaY || 0), { send: true, flush: true });
        }, { passive: false });
        this.el.addEventListener('keydown', (e) => {
            const span = this.max - this.min;
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                e.preventDefault();
                this.setValue(this.value + span * 0.04, { send: true, flush: true });
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                e.preventDefault();
                this.setValue(this.value - span * 0.04, { send: true, flush: true });
            }
            if (e.key === 'Home' || e.key === '0') {
                e.preventDefault();
                this.setValue(this.initial, { send: true, flush: true });
            }
        });
        this.updateUI();
    }

    valueFromEvent(ev) {
        const rect = this.elHit.getBoundingClientRect();
        const percent = 1 - Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
        return this.min + percent * (this.max - this.min);
    }

    onDown(e) {
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        try { this.elHit.setPointerCapture(e.pointerId); } catch (_) { /* synthetic / inactive pointer */ }
        beginDrag();
        this.setValue(this.valueFromEvent(e), { send: true });
        const pid = e.pointerId;
        const move = (ev) => {
            if (ev.pointerId !== pid) return;
            ev.preventDefault();
            this.setValue(this.valueFromEvent(ev), { send: true });
        };
        const up = (ev) => {
            if (ev.pointerId !== pid) return;
            try { this.elHit.releasePointerCapture(pid); } catch (_) { /* ignore */ }
            this.elHit.removeEventListener('pointermove', move);
            this.elHit.removeEventListener('pointerup', up);
            this.elHit.removeEventListener('pointercancel', up);
            endDrag();
            this.flush();
        };
        this.elHit.addEventListener('pointermove', move);
        this.elHit.addEventListener('pointerup', up);
        this.elHit.addEventListener('pointercancel', up);
    }

    queueSend() {
        this.pendingSend = true;
        if (this.raf) return;
        this.raf = requestAnimationFrame(() => {
            this.raf = 0;
            if (this.pendingSend) this.flush();
        });
    }
    flush() {
        this.pendingSend = false;
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
        this.callback(this.value);
    }

    setValue(v, { send = false, flush = false } = {}) {
        let next = Math.max(this.min, Math.min(this.max, v));
        if (this.snap != null && Math.abs(next - this.snap) <= (this.max - this.min) * 0.02) next = this.snap;
        this.value = next;
        this.updateUI();
        if (send) {
            if (flush) this.flush();
            else this.queueSend();
        }
    }

    updateUI() {
        const percent = (this.value - this.min) / (this.max - this.min);
        if (this.bipolar) {
            const mid = (0 - this.min) / (this.max - this.min);
            const a = Math.min(percent, mid);
            const b = Math.max(percent, mid);
            this.elFill.style.bottom = (a * 100) + '%';
            this.elFill.style.height = ((b - a) * 100) + '%';
        } else {
            this.elFill.style.bottom = '0';
            this.elFill.style.height = (percent * 100) + '%';
        }
        this.elHandle.style.bottom = (percent * 100) + '%';
        this.elVal.textContent = formatValue(this.id, this.value, this.unit, true);
        this.el.setAttribute('aria-valuenow', String(this.value));
        this.el.setAttribute('aria-valuetext', formatValue(this.id, this.value, this.unit));
    }
}

class Menu {
    static openInstance = null;
    static closeAll() {
        if (Menu.openInstance) Menu.openInstance.close();
    }

    constructor(id, options, onChange) {
        this.id = id;
        this.options = options;
        this.onChange = onChange;
        this.value = options[0].value;
        this.host = shadow.getElementById(id);
        if (!this.host) return;
        this.btn = document.createElement('button');
        this.btn.type = 'button';
        this.btn.className = 'menu-btn';
        this.btn.innerHTML = `<span class="menu-label"></span><span class="chev">${ICONS.chev}</span>`;
        this.labelEl = this.btn.querySelector('.menu-label');
        this.host.replaceWith(this.btn);
        this.btn.id = id;
        this.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (Menu.openInstance === this) this.close();
            else this.open();
        });
        this.btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.open();
            }
        });
        this.updateLabel();
    }

    labelFor(value) {
        const hit = this.options.find((o) => String(o.value) === String(value));
        return hit ? hit.label : String(value);
    }

    setValue(value, { send = false } = {}) {
        this.value = value;
        this.updateLabel();
        if (send) this.onChange(this.value);
    }

    updateLabel() {
        this.labelEl.textContent = this.labelFor(this.value);
        this.btn.setAttribute('aria-expanded', Menu.openInstance === this ? 'true' : 'false');
        this.btn.setAttribute('aria-haspopup', 'listbox');
        this.btn.title = this.labelFor(this.value);
    }

    open() {
        Menu.closeAll();
        Menu.openInstance = this;
        this.updateLabel();
        const pop = document.createElement('div');
        pop.className = 'menu-popover';
        pop.setAttribute('role', 'listbox');
        this.options.forEach((opt) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'menu-item' + (String(opt.value) === String(this.value) ? ' active' : '');
            item.textContent = opt.label;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setValue(opt.value, { send: true });
                this.close();
            });
            pop.appendChild(item);
        });
        menuLayer.appendChild(pop);
        this.pop = pop;
        const r = this.btn.getBoundingClientRect();
        const width = Math.max(r.width, 180);
        let left = r.left;
        let top = r.bottom + 6;
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        requestAnimationFrame(() => {
            const h = pop.offsetHeight;
            if (top + h > vh - 8) top = Math.max(8, r.top - h - 6);
            if (left + width > vw - 8) left = Math.max(8, vw - width - 8);
            pop.style.width = width + 'px';
            pop.style.left = left + 'px';
            pop.style.top = top + 'px';
        });
        this._outside = (ev) => {
            const path = ev.composedPath ? ev.composedPath() : [];
            if (path.includes(this.btn) || path.includes(pop)) return;
            this.close();
        };
        setTimeout(() => window.addEventListener('pointerdown', this._outside, true), 0);
    }

    close() {
        if (this.pop && this.pop.parentNode) this.pop.parentNode.removeChild(this.pop);
        this.pop = null;
        if (Menu.openInstance === this) Menu.openInstance = null;
        this.updateLabel();
        if (this._outside) window.removeEventListener('pointerdown', this._outside, true);
        this._outside = null;
    }
}

function syncModuleCard(mod, on) {
    const card = shadow.querySelector(`.module[data-mod="${mod}"]`);
    if (!card) return;
    card.classList.toggle('on', on);
    card.classList.toggle('off', !on);
}

function setToggleUi(mod, on, { send = false } = {}) {
    model.toggles[mod] = on;
    const id = Object.keys(TOGGLE_MAP).find((k) => TOGGLE_MAP[k] === mod);
    const el = id ? shadow.getElementById(id) : null;
    if (el) {
        el.classList.toggle('active', on);
        el.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    syncModuleCard(mod, on);
    if (send) {
        if (model.preset) {
            model.preset = null;
            highlightPreset(null);
        }
        scheduleSave();
        if (engineOn) extSend({ type: 'TOGGLE_MODULE', module: mod, active: on });
    }
}

function bindToggle(id, mod) {
    const el = shadow.getElementById(id);
    if (!el) return;
    const flip = (e) => {
        e && e.stopPropagation();
        setToggleUi(mod, !el.classList.contains('active'), { send: true });
    };
    el.addEventListener('click', flip);
    el.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            flip();
        }
    });
}

function highlightPreset(name) {
    shadow.querySelectorAll('.preset-chip').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.preset === name);
    });
}

function applySnapshotToUI(snap, { send = false } = {}) {
    if (!snap) return;
    if (snap.knobs) {
        for (const [id, v] of Object.entries(snap.knobs)) {
            model.knobs[id] = v;
            if (knobs[id]) knobs[id].setValue(v, { send, flush: true });
            else if (faders[id]) faders[id].setValue(v, { send, flush: true });
            else if (send) kSend(id, v);
        }
    }
    if (snap.toggles) {
        for (const [mod, on] of Object.entries(snap.toggles)) {
            setToggleUi(mod, on, { send });
        }
    }
    if (snap.params) {
        model.params = { ...model.params, ...snap.params };
        if (menus.shape && snap.params.panner_shape != null) {
            menus.shape.setValue(snap.params.panner_shape, { send });
        }
        if (menus.bin && snap.params.binaural_beatFreq != null) {
            menus.bin.setValue(Number(snap.params.binaural_beatFreq), { send });
        }
        if (menus.iso && snap.params.iso_wave != null) {
            menus.iso.setValue(snap.params.iso_wave, { send });
        }
        if (btnSync && snap.params.panner_beatSync != null) {
            btnSync.classList.toggle('active', !!snap.params.panner_beatSync);
        }
        if (send) {
            if (snap.params.panner_shape) setParam('panner', 'shape', snap.params.panner_shape);
            if (snap.params.binaural_beatFreq != null) setParam('binaural', 'beatFreq', Number(snap.params.binaural_beatFreq));
            if (snap.params.iso_wave) setParam('iso', 'wave', snap.params.iso_wave);
            if (snap.params.panner_beatSync != null) setParam('panner', 'beatSync', !!snap.params.panner_beatSync);
        }
    }
    model.preset = snap.preset || null;
    highlightPreset(model.preset);
}

function applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    applySnapshotToUI({ ...preset, preset: name }, { send: false });
    model.preset = name;
    highlightPreset(name);
    scheduleSave();
    if (engineOn) extSend({ type: 'SNAPSHOT', snapshot: collectSnapshot() });
}

const D = PRISM_DEFAULTS.knobs;
faders['k-music-vol'] = new Fader('f-music-vol', 'Music', 0, 1.5, D['k-music-vol'], '', v => kSend('k-music-vol', v), { snap: 1 });
faders['k-fx-vol'] = new Fader('f-fx-vol', 'FX', 0, 1.5, D['k-fx-vol'], '', v => kSend('k-fx-vol', v), { snap: 1 });
faders['k-eq-low'] = new Fader('f-eq-low', 'Low', -15, 15, D['k-eq-low'], 'dB', v => kSend('k-eq-low', v), { bipolar: true, snap: 0 });
faders['k-eq-mid'] = new Fader('f-eq-mid', 'Mid', -15, 15, D['k-eq-mid'], 'dB', v => kSend('k-eq-mid', v), { bipolar: true, snap: 0 });
faders['k-eq-high'] = new Fader('f-eq-high', 'High', -15, 15, D['k-eq-high'], 'dB', v => kSend('k-eq-high', v), { bipolar: true, snap: 0 });

knobs['k-speed'] = new Knob('k-speed', 'Speed', 0.02, 2.0, D['k-speed'], 'Hz', v => kSend('k-speed', v), { log: true });
knobs['k-depth'] = new Knob('k-depth', 'Depth', 0, 1.0, D['k-depth'], '', v => kSend('k-depth', v));
knobs['k-width-amt'] = new Knob('k-width-amt', 'Width', 0, 2.0, D['k-width-amt'], 'x', v => kSend('k-width-amt', v), { snap: 1 });
knobs['k-cross-amount'] = new Knob('k-cross-amount', 'Amt', 0, 1.0, D['k-cross-amount'], '', v => kSend('k-cross-amount', v));
knobs['k-bin-vol'] = new Knob('k-bin-vol', 'Lvl', 0, 0.5, D['k-bin-vol'], '', v => kSend('k-bin-vol', v));
knobs['k-bin-base'] = new Knob('k-bin-base', 'Base', 60, 400, D['k-bin-base'], 'Hz', v => kSend('k-bin-base', v), { log: true });
knobs['k-iso-freq'] = new Knob('k-iso-freq', 'Freq', 1, 20, D['k-iso-freq'], 'Hz', v => kSend('k-iso-freq', v));
knobs['k-iso-depth'] = new Knob('k-iso-depth', 'Depth', 0, 1.0, D['k-iso-depth'], '', v => kSend('k-iso-depth', v));
knobs['k-noise-vol'] = new Knob('k-noise-vol', 'Lvl', 0, 0.5, D['k-noise-vol'], '', v => kSend('k-noise-vol', v));
knobs['k-noise-color'] = new Knob('k-noise-color', 'Color', 0, 1.0, D['k-noise-color'], '', v => kSend('k-noise-color', v));
knobs['k-comp-thresh'] = new Knob('k-comp-thresh', 'Thresh', -50, 0, D['k-comp-thresh'], 'dB', v => kSend('k-comp-thresh', v));
knobs['k-comp-ratio'] = new Knob('k-comp-ratio', 'Ratio', 1, 20, D['k-comp-ratio'], ':1', v => kSend('k-comp-ratio', v));
knobs['k-comp-attack'] = new Knob('k-comp-attack', 'Attack', 0, 0.1, D['k-comp-attack'], 's', v => kSend('k-comp-attack', v));
knobs['k-sat-drive'] = new Knob('k-sat-drive', 'Drive', 0, 1.0, D['k-sat-drive'], '', v => kSend('k-sat-drive', v));
knobs['k-sat-warmth'] = new Knob('k-sat-warmth', 'Warmth', 0, 1000, D['k-sat-warmth'], '', v => kSend('k-sat-warmth', v));
knobs['k-filter-freq'] = new Knob('k-filter-freq', 'Freq', 200, 20000, D['k-filter-freq'], 'Hz', v => kSend('k-filter-freq', v), { log: true });
knobs['k-filter-res'] = new Knob('k-filter-res', 'Res', 0.1, 8, D['k-filter-res'], '', v => kSend('k-filter-res', v));

Object.entries(TOGGLE_MAP).forEach(([id, mod]) => bindToggle(id, mod));

menus.shape = new Menu('sel-8d-shape', [
    { value: 'sine', label: 'Orbit · smooth circle' },
    { value: 'pingpong', label: 'Ping-pong · hard L/R' },
    { value: 'beat', label: 'Figure-8 · 2× cross' },
    { value: 'pendulum', label: 'Pendulum · hang at ears' },
    { value: 'tumble', label: 'Tumble · rolls over your head' },
    { value: 'breathe', label: 'Breathe · closer / farther' },
    { value: 'random', label: 'Drift · irregular wander' }
], (v) => {
    setParam('panner', 'shape', v);
    engageModule('panner');
});

menus.bin = new Menu('sel-bin-wave', [
    { value: 40, label: '40 Hz Gamma · Focus' },
    { value: 14, label: '14 Hz Beta · Alert' },
    { value: 10, label: '10 Hz Alpha · Relax' },
    { value: 6, label: '6 Hz Theta · Deep' }
], (v) => {
    setParam('binaural', 'beatFreq', Number(v));
    engageModule('binaural');
});

menus.iso = new Menu('sel-iso-wave', [
    { value: 'sine', label: 'Sine pulse' },
    { value: 'square', label: 'Square pulse' }
], (v) => {
    setParam('iso', 'wave', v);
    engageModule('iso');
});

shadow.getElementById('preset-row').addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-chip');
    if (!btn) return;
    applyPreset(btn.dataset.preset);
});

applySnapshotToUI(PRISM_DEFAULTS, { send: false });
tickNowPlaying();
if (!nowClock) nowClock = setInterval(tickNowPlaying, 400);

if (!PREVIEW) {
    try {
        chrome.storage.local.get([STORAGE_KEY, FAB_POS_KEY], (data) => {
            const saved = data && data[STORAGE_KEY];
            if (saved) {
                applySnapshotToUI({
                    knobs: { ...PRISM_DEFAULTS.knobs, ...(saved.knobs || {}) },
                    toggles: { ...PRISM_DEFAULTS.toggles, ...(saved.toggles || {}) },
                    params: { ...PRISM_DEFAULTS.params, ...(saved.params || {}) },
                    preset: saved.preset || null
                }, { send: false });
            }
            const fab = data && data[FAB_POS_KEY];
            if (fab && typeof fab.x === 'number' && typeof fab.y === 'number') {
                applyFabPos(fab.x, fab.y, { save: false });
            }
        });
    } catch (_) { /* ignore */ }
}

if (PREVIEW) {
    setEngineUi(true);
    openPanel();
    window.__PRISM__ = {
        knobs, faders, menus, model, shadow,
        collectSnapshot, applyPreset, applySnapshotToUI, setToggleUi, kSend, setParam,
        formatValue, toNorm, fromNorm, onMeter, TOGGLE_MAP, PRESETS,
        ytmPlayPause, ytmPrev, ytmNext, ytmIsPlaying, syncPlayButton,
        scrapeTiming, renderTiming, ytmSeekRatio, formatClock,
        applyFabPos, prismPlayer: typeof prismPlayer !== 'undefined' ? prismPlayer : null
    };
}

} // boot guard else
