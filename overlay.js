// overlay.js - The "Venom" UI
// Contains the Glassmorphism Interface injected into YTM

export const PRISM_STYLES = `
    :host {
      --bg: transparent;
      --glass: rgba(10, 14, 20, 0.82);
      --glass-border: rgba(120, 230, 255, 0.16);
      --accent: #2af6ff;
      --accent-dim: rgba(42, 246, 255, 0.16);
      --text: #eaf2f2;
      --muted: #8fa4b6;
      --font-tech: "Space Grotesk", "Sora", "Avenir Next", "Futura", "Gill Sans", "Trebuchet MS", sans-serif;
      font-family: var(--font-tech);
      color: var(--text);
    }

    #prism-root {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        z-index: 99999;
        pointer-events: none; /* Let clicks pass through when idle */
        display: flex; flex-direction: column;
        transition: opacity 0.3s;
        opacity: 0;
    }
    #prism-root.active {
        opacity: 1;
        pointer-events: auto;
        background: rgba(4, 6, 10, 0.85); /* Dim the site behind */
    }

    /* VISUALIZER CANVAS */
    #viz-container {
        flex: 1; position: relative; overflow: hidden;
        border-bottom: 1px solid var(--glass-border);
    }
    canvas { display: block; width: 100%; height: 100%; }

    /* CLOSE BUTTON (Floating) */
    #btn-minimize {
        position: absolute; top: 20px; right: 30px;
        background: rgba(8, 12, 18, 0.75); border: 1px solid rgba(120, 230, 255, 0.35);
        color: var(--accent); padding: 8px 16px; border-radius: 999px;
        cursor: pointer; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;
        z-index: 100; backdrop-filter: blur(8px);
        transition: 0.2s;
    }
    #btn-minimize:hover { background: rgba(42, 246, 255, 0.15); border-color: var(--accent); }

    /* BOTTOM DOCK (Simplified for Overlay) */
    #bottom-dock {
        height: 90px; background: linear-gradient(90deg, rgba(7, 10, 16, 0.9), rgba(10, 14, 20, 0.9));
        border-top: 1px solid var(--glass-border);
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 30px; backdrop-filter: blur(15px) saturate(1.1);
    }

    /* TRACK INFO */
    #track-info { display: flex; align-items: center; gap: 15px; width: 300px; }
    #track-art { width: 50px; height: 50px; border-radius: 4px; background: #222; object-fit: cover; }
    #track-text { display: flex; flex-direction: column; }
    #track-title { font-weight: 600; color: #fff; white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
    #track-artist { font-size: 0.8rem; color: var(--muted); letter-spacing: 0.08em; }

    /* RACK TOGGLE */
    #rack-controls { display: flex; gap: 10px; align-items: center; }
    button.icon-btn {
        background: rgba(8, 12, 18, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); color: #cfd7dd;
        width: 40px; height: 40px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: 0.2s;
    }
    button.icon-btn:hover { border-color: var(--accent); color: var(--accent); box-shadow: 0 0 12px rgba(42, 246, 255, 0.25); }
    button.icon-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }

    /* MODULE RACK (Floating Panel) */
    #rack-panel {
        position: absolute; bottom: 100px; right: 30px;
        width: 300px; background: rgba(10, 14, 20, 0.95);
        border: 1px solid var(--glass-border); border-radius: 12px;
        backdrop-filter: blur(20px) saturate(1.1);
        display: none; flex-direction: column;
        max-height: 70vh; overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }
    #rack-panel.open { display: flex; }

    .module { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .module-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.7rem; color: var(--muted); font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
    
    /* KNOBS (Simplified CSS) */
    .knob-row { display: flex; justify-content: space-around; gap: 5px; }
    .knob-wrap { display: flex; flex-direction: column; align-items: center; width: 50px; }
    .knob-circle { width: 32px; height: 32px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #3a4453, #0b0f16); border: 1px solid rgba(255, 255, 255, 0.12); position: relative; }
    .knob-val { font-size: 0.6rem; color: var(--accent); margin-top: 2px; }
    .knob-label { font-size: 0.6rem; color: var(--muted); margin-top: 2px; letter-spacing: 0.14em; text-transform: uppercase; }

`;

export const PRISM_TEMPLATE = `
<div id="prism-root">
    <button id="btn-minimize">MINIMIZE TO TRAY</button>
    
    <div id="viz-container">
        <canvas id="viz"></canvas>
    </div>

    <div id="bottom-dock">
        <div id="track-info">
            <img id="track-art" src="">
            <div id="track-text">
                <div id="track-title">--</div>
                <div id="track-artist">--</div>
            </div>
        </div>

        <!-- Since we are ON YTM, we don't need play/pause buttons, we use theirs! -->
        <!-- We just provide the AUDIO FX controls -->
        
        <div id="rack-controls">
            <span style="font-size:0.7rem; color:#666; margin-right:10px;">AUDIO PRISM</span>
            <button class="icon-btn active" id="btn-viz-mode">👁️</button>
            <button class="icon-btn" id="btn-fx-rack">🎛️</button>
        </div>
    </div>

    <!-- FX RACK PANEL -->
    <div id="rack-panel">
        <div class="module">
            <div class="module-header">8D PANNER</div>
            <div class="knob-row">
                <div class="knob-wrap"><div class="knob-circle" id="k-speed"></div><div class="knob-val">0.2Hz</div><div class="knob-label">Speed</div></div>
                <div class="knob-wrap"><div class="knob-circle" id="k-depth"></div><div class="knob-val">1.0</div><div class="knob-label">Depth</div></div>
            </div>
        </div>
        <div class="module">
            <div class="module-header">BINAURAL BEATS</div>
            <div class="knob-row">
                <div class="knob-wrap"><div class="knob-circle" id="k-bin-vol"></div><div class="knob-val">0.1</div><div class="knob-label">Vol</div></div>
                <div class="knob-wrap"><div class="knob-circle" id="k-bin-base"></div><div class="knob-val">40Hz</div><div class="knob-label">Freq</div></div>
            </div>
        </div>
        <!-- More modules will be injected here via JS if needed -->
    </div>
</div>
`;
