// content.js - "Venom" Protocol V15.3 (Responsive Grid & Simulation Core)

// --- STYLES ---
const PRISM_STYLES = `
    :host {
      --bg: #07080b;
      --glass: rgba(10, 14, 20, 0.9);
      --glass-border: rgba(120, 230, 255, 0.2);
      --accent: #2af6ff;
      --accent-dim: rgba(42, 246, 255, 0.2);
      --text: #eaf2f2;
      --font-tech: "Space Grotesk", "Sora", "Avenir Next", "Futura", "Gill Sans", "Trebuchet MS", sans-serif;
      --font-hud: "JetBrains Mono", "IBM Plex Mono", "Menlo", "Monaco", "Consolas", monospace;
    }

    * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
    *::-webkit-scrollbar { width: 0px !important; height: 0px !important; background: transparent !important; display: none !important; }

    #prism-overlay {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        z-index: 2147483640; pointer-events: none; opacity: 0; 
        transition: transform 0.4s cubic-bezier(0.1, 0.7, 0.1, 1), opacity 0.3s;
        display: flex; flex-direction: column;
        transform: translateY(100%);
        --overlay-bg: rgba(0, 5, 10, 0.6);
        --viz-bg: transparent;
        --mask-bg: transparent;
        background: var(--overlay-bg);
        backdrop-filter: blur(20px);
        font-family: var(--font-tech);
        color: var(--text);
        overflow: hidden;
    }
    #prism-overlay.active { opacity: 1; pointer-events: auto; transform: translateY(0); }
    
    #viz-container {
        position: relative;
        flex: 1;
        min-height: 0;
        width: 100%;
        z-index: 1; pointer-events: none; overflow: hidden;
        background: var(--viz-bg);
        box-sizing: border-box;
    }

    .deck {
        position: absolute; left: 0; width: 100%;
        bottom: 0; height: 100%;
        background: rgba(0, 5, 10, 0.18);
        opacity: 0; pointer-events: none;
        transform: translateY(100%);
        transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease;
        display: flex; flex-direction: column; z-index: 50;
        backdrop-filter: blur(8px);
        box-sizing: border-box;
    }
    .deck.open { opacity: 1; pointer-events: auto; transform: translateY(0); }

    .deck-header {
        height: 70px; border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex; align-items: center; justify-content: space-between; padding: 0 35px;
        flex-shrink: 0; background: rgba(0, 5, 10, 0.5);
        overflow: visible; position: relative; z-index: 5;
    }
    .deck-title {
        display: flex; align-items: center;
    }
    .deck-logo {
        height: 160px; width: auto;
        position: relative; z-index: 10;
        pointer-events: none;
        transform: rotate(-8deg) translate(-8px, 22px);
    }
    .btn-close-deck { background: none; border: none; color: #777; cursor: pointer; font-size: 2.5rem; transition: 0.2s; line-height: 1; }
    .btn-close-deck:hover { color: #fff; transform: scale(1.1); }

    .deck-content {
        flex: 1;
        padding: 2.5vh 2.5vw;
        overflow: hidden;
        display: grid;
        grid-template-columns: 1fr 320px;
        grid-template-rows: 1fr;
        gap: 2.5vh;
        box-sizing: border-box;
        min-height: 0;
    }

    .module-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(2, 1fr);
        gap: 1.5vh 1.5vw;
        height: 100%;
        align-content: stretch;
        min-height: 0;
    }

    .module {
        background: rgba(11, 20, 28, 0.8);
        border: 1px solid rgba(42, 246, 255, 0.2);
        backdrop-filter: blur(12px);
        border-radius: 10px; padding: 1.2vh 1.5vw;
        position: relative; overflow: hidden;
        transition: border-color 0.3s, box-shadow 0.3s;
        display: flex; flex-direction: column; justify-content: space-between;
        min-height: 0; gap: 0.5vh;
    }
    .module:hover { border-color: var(--accent); box-shadow: 0 0 30px rgba(0, 243, 255, 0.12); }

    .mixer-panel {
        grid-column: 2; grid-row: 1 / span 2;
        background: rgba(11, 20, 28, 0.9);
        border: 1px solid var(--accent-dim);
        border-radius: 12px; padding: 2vh 1.5vw;
        display: flex; flex-direction: column;
        align-items: center;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
    }

    .module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-shrink: 0; }
    .module-label { font-size: 1rem; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }

    .knob-row { display: flex; justify-content: space-evenly; gap: 10px; flex: 1; align-items: center; align-content: center; min-height: 0; }
    .knob-wrapper { display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 120px; cursor: ns-resize; }
    .knob {
        width: 70px; height: 70px;
        border-radius: 50%;
        background: linear-gradient(145deg, #1a1f26, #0e1115);
        border: none;
        position: relative;
        box-shadow: 0 8px 20px rgba(0,0,0,0.6), inset 0 2px 5px rgba(255,255,255,0.05);
    }
    .knob-ring {
        position: absolute;
        top: -6px; left: -6px; right: -6px; bottom: -6px;
        border-radius: 50%;
        pointer-events: none;
        --ring-percent: 0;
        background: conic-gradient(
            from 220deg,
            var(--accent) calc(var(--ring-percent) * 280deg),
            rgba(42, 246, 255, 0.15) calc(var(--ring-percent) * 280deg)
        );
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #fff calc(100% - 5px));
        mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #fff calc(100% - 5px));
    }
    .knob::after {
        content: '';
        position: absolute;
        top: 12%; left: 50%;
        width: 3px; height: 28%;
        background: var(--accent);
        transform-origin: center bottom;
        transform: translateX(-50%) rotate(var(--knob-rotation, 0deg));
        border-radius: 2px;
        box-shadow: 0 0 8px var(--accent);
    }
    .knob-value {
        font-size: 1.1rem; color: var(--accent); margin-top: 10px;
        font-family: var(--font-hud); font-weight: bold; text-shadow: 0 0 8px rgba(42, 246, 255, 0.5);
    }
    .knob-name { font-size: 0.85rem; color: #999; text-transform: uppercase; margin-top: 4px; font-weight: 700; letter-spacing: 1px; }

    .fader-wrap { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; width: 14%; min-width: 50px; cursor: ns-resize; }
    .fader-track {
        width: 6px; background: #0e1115; border-radius: 3px; position: relative;
        box-shadow: inset 0 0 5px #000; border: 1px solid #333;
        flex: 1; max-height: 70%; min-height: 100px;
        margin-bottom: 12px;
    }
    .fader-fill { position: absolute; bottom: 0; left: 0; width: 100%; background: var(--accent); border-radius: 3px; box-shadow: 0 0 15px var(--accent); }
    .fader-handle {
        position: absolute; left: 50%; width: 24px; height: 12px;
        background: linear-gradient(180deg, #fff 0%, #ccc 100%);
        border: 1px solid #666; border-radius: 3px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 10px var(--accent);
        pointer-events: none;
        transform: translateX(-50%) translateY(50%);
    }
    .fader-val { font-size: 1rem; color: var(--accent); font-family: var(--font-hud); font-weight: bold; margin-bottom: 6px; text-align: center; }
    .fader-name { font-size: 0.85rem; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; text-align: center; }

    .toggle { width: 44px; height: 24px; background: #222; border-radius: 12px; position: relative; cursor: pointer; border: 1px solid #444; flex-shrink: 0; transition: 0.2s; }
    .toggle.active { background: var(--accent-dim); border-color: var(--accent); }
    .toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; background: #666; border-radius: 50%; transition: 0.2s; }
    .toggle.active::after { left: 23px; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
    
    select {
        background: #0e141b; color: #fff; border: 1px solid #3d4a58; padding: 8px 12px;
        width: 100%; margin-top: auto; border-radius: 5px; font-size: 0.95rem; font-weight: 600; font-family: var(--font-tech); cursor: pointer;
        flex-shrink: 0;
    }
    select:focus { outline: none; border-color: var(--accent); }
    option { font-size: 0.95rem; background: #0b141c; }

    #unified-trigger {
        position: fixed; bottom: 100px; right: 30px; z-index: 2147483647;
        background: #000; border: 2px solid #00f3ff; color: #00f3ff;
        width: 50px; height: 50px; border-radius: 50%; 
        box-shadow: 0 0 25px rgba(0, 243, 255, 0.5);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 24px; transition: transform 0.2s;
    }
    #unified-trigger.active { display: none; }
`;

const PRISM_HTML = `
    <div id="unified-trigger">▲</div>
    <div id="prism-overlay">
        <div id="audio-deck" class="deck open">
            <div class="deck-header">
                <span class="deck-title">
                    <img src="${chrome.runtime.getURL('icons/513d19b9-d3db-435d-bd2a-c31d8b8d5097.png')}" alt="AuDioPrism" class="deck-logo">
                </span>
                <button class="btn-close-deck" id="close-audio">×</button>
            </div>
            <div class="deck-content">
                <div class="module-grid">
                    <div class="module">
                        <div class="module-header"><span class="module-label">8D Bilateral</span><div class="toggle active" id="sw-8d"></div></div>
                        <div class="knob-row"><div id="k-speed"></div><div id="k-depth"></div></div>
                        <select id="sel-8d-shape"><option value="sine">Sine Orbit</option><option value="beat">Figure 8</option><option value="tumble">Tumble</option><option value="random">Drift</option></select>
                    </div>
                    <div class="module">
                        <div class="module-header"><span class="module-label">Stereo Field</span><div class="toggle active" id="sw-width"></div></div>
                        <div class="knob-row"><div id="k-width-amt"></div><div id="k-cross-amount"></div></div>
                    </div>
                    <div class="module">
                        <div class="module-header"><span class="module-label">Dynamics</span><div class="toggle" id="sw-comp"></div></div>
                        <div class="knob-row"><div id="k-comp-thresh"></div><div id="k-comp-ratio"></div><div id="k-comp-attack"></div></div>
                    </div>
                    <div class="module">
                        <div class="module-header"><span class="module-label">Binaural</span><div class="toggle" id="sw-bin"></div></div>
                        <div class="knob-row"><div id="k-bin-vol"></div><div id="k-bin-base"></div></div>
                        <select id="sel-bin-wave"><option value="40">40Hz Gamma (Focus)</option><option value="14">14Hz Beta (Alert)</option><option value="10">10Hz Alpha (Relax)</option><option value="6">6Hz Theta (Deep)</option></select>
                    </div>
                    <div class="module">
                        <div class="module-header"><span class="module-label">Isochronic</span><div class="toggle" id="sw-iso"></div></div>
                        <div class="knob-row"><div id="k-iso-freq"></div><div id="k-iso-depth"></div></div>
                        <select id="sel-iso-wave"><option value="sine">Sine Pulse</option><option value="square">Square Pulse</option></select>
                    </div>
                    <div class="module">
                        <div class="module-header"><span class="module-label">Masking</span><div class="toggle" id="sw-noise"></div></div>
                        <div class="knob-row"><div id="k-noise-vol"></div><div id="k-noise-color"></div></div>
                    </div>
                    <div class="module">
                        <div class="module-header"><span class="module-label">Harmonics</span><div class="toggle" id="sw-sat"></div></div>
                        <div class="knob-row"><div id="k-sat-drive"></div><div id="k-sat-warmth"></div></div>
                    </div>
                    <div class="module">
                        <div class="module-header"><span class="module-label">Sensory EQ</span><div class="toggle active" id="sw-filter"></div></div>
                        <div class="knob-row"><div id="k-filter-freq"></div><div id="k-filter-res"></div></div>
                    </div>
                </div>
                <div class="mixer-panel">
                    <span class="module-label" style="margin-bottom:2vh; display:block; text-align:center; letter-spacing:4px; font-size:1.1rem;">MASTER CONSOLE</span>
                    <div style="display:flex; justify-content:center; align-items:stretch; gap:10px; flex:1; width:100%; min-height:0;">
                        <div id="f-music-vol"></div><div id="f-fx-vol"></div>
                        <div style="width:1px; background:rgba(255,255,255,0.15); margin:10px 15px;"></div>
                        <div id="f-eq-low"></div><div id="f-eq-mid"></div><div id="f-eq-high"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

// --- LOGIC & COMPONENTS ---
const host = document.createElement('div'); host.id = 'prism-host'; document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'open' });
const styleSheet = document.createElement('style'); styleSheet.textContent = PRISM_STYLES; shadow.appendChild(styleSheet);
const wrapper = document.createElement('div'); wrapper.innerHTML = PRISM_HTML; shadow.appendChild(wrapper);

const trigger = shadow.getElementById('unified-trigger');
const overlay = shadow.getElementById('prism-overlay');
const audioDeck = shadow.getElementById('audio-deck');

if (trigger && overlay) {
    trigger.onclick = () => {
        const isActive = overlay.classList.toggle('active');
        if (isActive && audioDeck) audioDeck.classList.add('open');
        trigger.classList.toggle('active');
        trigger.innerHTML = isActive ? '▼' : '▲';
        if (isActive) chrome.runtime.sendMessage({ type: 'START_PRISM_SILENT' });
    };
}

chrome.runtime.onMessage.addListener(m => {
    if (m.type === 'TOGGLE_OVERLAY') trigger.click();
    if (m.type === 'FORCE_DEACTIVATE') {
        if (overlay) overlay.classList.remove('active');
        if (trigger) {
            trigger.classList.remove('active');
            trigger.innerHTML = '▲';
            trigger.style.display = 'flex';
        }
        if (audioDeck) audioDeck.classList.remove('open');
    }
});

const closeDecks = () => { if (trigger) trigger.click(); };
const btnCloseAudio = shadow.getElementById('close-audio');
if (btnCloseAudio) btnCloseAudio.onclick = closeDecks;

class Fader {
    constructor(id, label, min, max, initial, unit, callback) {
        this.min = min; this.max = max; this.value = initial; this.unit = unit; this.callback = callback;
        const container = shadow.getElementById(id); 
        if(!container) return;
        container.className = 'fader-wrap';
        container.innerHTML = `<div class="fader-track"><div class="fader-fill"></div><div class="fader-handle"></div></div><div class="fader-val">${initial.toFixed(2)}</div><div class="fader-name">${label}</div>`;
        this.elFill = container.querySelector('.fader-fill'); this.elHandle = container.querySelector('.fader-handle'); this.elVal = container.querySelector('.fader-val'); this.elTrack = container.querySelector('.fader-track');
        this.elTrack.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const move = (me) => {
                const rect = this.elTrack.getBoundingClientRect();
                const percent = 1 - Math.max(0, Math.min(1, (me.clientY - rect.top) / rect.height));
                this.value = this.min + (percent * (this.max - this.min)); this.updateUI(); this.callback(this.value);
            };
            const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
            window.addEventListener('mousemove', move); window.addEventListener('mouseup', up); move(e);
        }); this.updateUI();
    }
    updateUI() {
        const percent = (this.value - this.min) / (this.max - this.min);
        const trackHeight = this.elTrack.offsetHeight || 100;
        this.elFill.style.height = (percent * 100) + '%';
        this.elHandle.style.bottom = `calc(${percent * 100}% - 6px)`;
        this.elVal.innerText = this.value.toFixed(2);
    }
}

class Knob {
    constructor(id, label, min, max, initial, unit, callback) {
        this.min = min; this.max = max; this.value = initial; this.unit = unit; this.callback = callback;
        const container = shadow.getElementById(id);
        if(!container) return;
        container.className = 'knob-wrapper';
        container.innerHTML = `<div class="knob"><div class="knob-ring"></div></div><div class="knob-value">${initial}${unit}</div><div class="knob-name">${label}</div>`;
        this.elRing = container.querySelector('.knob-ring');
        this.elKnob = container.querySelector('.knob');
        this.elVal = container.querySelector('.knob-value');
        container.addEventListener('mousedown', (e) => {
            const startY = e.clientY; const startVal = this.value;
            const move = (me) => {
                const dy = startY - me.clientY;
                let newVal = startVal + (dy / 200) * (this.max - this.min);
                this.value = Math.max(this.min, Math.min(this.max, newVal));
                this.updateUI(); this.callback(this.value);
            };
            const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
            window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }); this.updateUI();
    }
    updateUI() {
        const percent = (this.value - this.min) / (this.max - this.min);
        let decimals = (this.unit === 'Hz' && this.value >= 100) ? 0 : 2;
        this.elVal.innerText = this.value.toFixed(decimals) + this.unit;
        // Set the ring arc percentage
        this.elRing.style.setProperty('--ring-percent', percent);
        // Set rotation for the knob pointer
        const rotation = -140 + (percent * 280);
        this.elKnob.style.setProperty('--knob-rotation', rotation + 'deg');
    }
}

const kSend = (id, v) => chrome.runtime.sendMessage({ type: 'UPDATE_KNOB', id, value: v });

new Fader('f-music-vol', 'MUSIC', 0, 1.5, 1.0, '', v => kSend('k-music-vol', v));
new Fader('f-fx-vol', 'FX', 0, 1.5, 1.0, '', v => kSend('k-fx-vol', v));
new Fader('f-eq-low', 'LOW', -15, 15, 0, 'dB', v => kSend('k-eq-low', v));
new Fader('f-eq-mid', 'MID', -15, 15, 0, 'dB', v => kSend('k-eq-mid', v));
new Fader('f-eq-high', 'HIGH', -15, 15, 0, 'dB', v => kSend('k-eq-high', v));

new Knob('k-speed', 'Speed', 0.02, 2.0, 0.15, 'Hz', v => kSend('k-speed', v));
new Knob('k-depth', 'Depth', 0, 1.0, 1.0, '', v => kSend('k-depth', v));
new Knob('k-width-amt', 'Width', 0, 2.0, 1.0, 'x', v => kSend('k-width-amt', v));
new Knob('k-cross-amount', 'Amt', 0, 1.0, 0.3, '', v => kSend('k-cross-amount', v));
new Knob('k-bin-vol', 'Lvl', 0, 0.5, 0.1, '', v => kSend('k-bin-vol', v));
new Knob('k-bin-base', 'Base', 60, 400, 200, 'Hz', v => kSend('k-bin-base', v));
new Knob('k-iso-freq', 'Freq', 1, 20, 10, 'Hz', v => kSend('k-iso-freq', v));
new Knob('k-iso-depth', 'Depth', 0, 1.0, 0.5, '', v => kSend('k-iso-depth', v));
new Knob('k-noise-vol', 'Lvl', 0, 0.5, 0.05, '', v => kSend('k-noise-vol', v));
new Knob('k-noise-color', 'Color', 0, 1.0, 0.0, '', v => kSend('k-noise-color', v));
new Knob('k-comp-thresh', 'Thresh', -50, 0, -20, 'dB', v => kSend('k-comp-thresh', v));
new Knob('k-comp-ratio', 'Ratio', 1, 20, 4, ':1', v => kSend('k-comp-ratio', v));
new Knob('k-comp-attack', 'Attack', 0, 0.1, 0.01, 's', v => kSend('k-comp-attack', v));
new Knob('k-sat-drive', 'Drive', 0, 1.0, 0.0, '', v => kSend('k-sat-drive', v));
new Knob('k-sat-warmth', 'Warmth', 0, 1000, 500, '', v => kSend('k-sat-warmth', v));
new Knob('k-filter-freq', 'Freq', 200, 20000, 16000, 'Hz', v => kSend('k-filter-freq', v));
new Knob('k-filter-res', 'Res', 0.1, 8, 0.7, '', v => kSend('k-filter-res', v));

const toggle = (id, mod) => {
    const el = shadow.getElementById(id); if (!el) return;
    el.onclick = () => {
        el.classList.toggle('active');
        chrome.runtime.sendMessage({ type: 'TOGGLE_MODULE', module: mod, active: el.classList.contains('active') });
    };
};
toggle('sw-8d', 'panner'); toggle('sw-bin', 'binaural'); toggle('sw-noise', 'noise'); toggle('sw-iso', 'iso'); toggle('sw-filter', 'filter'); toggle('sw-comp', 'compressor'); toggle('sw-sat', 'saturation'); toggle('sw-width', 'width');

const setParam = (mod, param, val) => chrome.runtime.sendMessage({ type: 'SET_PARAM', module: mod, param: param, value: val });
const bindSelect = (id, handler) => { const el = shadow.getElementById(id); if (el) el.onchange = handler; };
bindSelect('sel-8d-shape', (e) => setParam('panner', 'shape', e.target.value));
bindSelect('sel-bin-wave', (e) => setParam('binaural', 'beatFreq', parseFloat(e.target.value)));
bindSelect('sel-iso-wave', (e) => setParam('iso', 'wave', e.target.value));