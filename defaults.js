// defaults.js — boot patch. Loaded by the mixer and the offscreen engine.
// Goal: music first, motion present, no extra tones, no seasick 8D.

const PRISM_DEFAULTS = {
    knobs: {
        'k-speed': 0.12,
        'k-depth': 0.55,
        'k-width-amt': 1.0,
        'k-cross-amount': 0.25,
        'k-comp-thresh': -18,
        'k-comp-ratio': 3,
        'k-comp-attack': 0.012,
        'k-bin-vol': 0.07,
        'k-bin-base': 200,
        'k-iso-freq': 10,
        'k-iso-depth': 0.4,
        'k-noise-vol': 0.04,
        'k-noise-color': 0.0,
        'k-sat-drive': 0.0,
        'k-sat-warmth': 550,
        'k-filter-freq': 12000,
        'k-filter-res': 0.55,
        'k-music-vol': 1.0,
        'k-fx-vol': 0.8,
        'k-eq-low': 1,
        'k-eq-mid': 0,
        'k-eq-high': -1.5
    },
    toggles: {
        panner: true,
        width: true,
        compressor: true,
        binaural: false,
        iso: false,
        noise: false,
        saturation: false,
        filter: true
    },
    params: {
        panner_shape: 'sine',
        binaural_beatFreq: 14,
        iso_wave: 'sine',
        panner_beatSync: false
    },
    preset: null
};

function prismKnob(id, fallback) {
    const v = PRISM_DEFAULTS.knobs[id];
    return v == null ? fallback : v;
}

function prismToggle(mod, fallback) {
    const v = PRISM_DEFAULTS.toggles[mod];
    return v == null ? fallback : v;
}

function prismParam(key, fallback) {
    const v = PRISM_DEFAULTS.params[key];
    return v == null ? fallback : v;
}
