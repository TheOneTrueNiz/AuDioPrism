// spatial-motion.js — pure 8D path math (no AudioContext).
// Used by the offscreen engine; also unit-tested from Node.

(function (root) {
    'use strict';

    function hash11(n) {
        const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return s - Math.floor(s);
    }

    function valueNoise(x) {
        const i = Math.floor(x);
        const f = x - i;
        const u = f * f * (3 - 2 * f);
        const a = hash11(i) * 2 - 1;
        const b = hash11(i + 1) * 2 - 1;
        return a + (b - a) * u;
    }

    function prismMotionRate(shape) {
        switch (shape) {
            case 'beat':
            case 'figure8': return 1.85;
            case 'tumble': return 1.15;
            case 'random':
            case 'drift': return 0.88;
            case 'pingpong': return 0.95;
            case 'pendulum': return 0.62;
            case 'breathe': return 1.25;
            default: return 1;
        }
    }

    function prismMotion(shape, phase, phase2, phase3) {
        const s = Math.sin(phase);
        switch (shape) {
            case 'pingpong':
                return { pan: Math.tanh(s * 12), el: 0, dist: 0, ild: 1.45, itd: 0.55, snap: true };
            case 'pendulum':
                return {
                    pan: Math.sign(s || 1) * Math.pow(Math.abs(s), 0.45),
                    el: 0, dist: 0, ild: 1.25, itd: 1.15, snap: false
                };
            case 'beat':
            case 'figure8':
                return {
                    pan: Math.sin(phase * 2),
                    el: Math.sin(phase) * 0.35,
                    dist: 0.1 * (1 - Math.cos(phase * 2)),
                    ild: 1.15, itd: 1, snap: false
                };
            case 'tumble':
                // Corkscrew: L/R and elevation are 90° apart, so the image
                // rolls over the head at each center crossing instead of
                // tracing a quieter, in-plane orbit.
                return {
                    pan: Math.sin(phase) * (0.92 + 0.08 * Math.sin(phase2)),
                    el: Math.cos(phase) * 1.2,
                    dist: 0.18 + 0.28 * (0.5 + 0.5 * Math.sin(phase3)),
                    ild: 1.28, itd: 1.4, snap: false
                };
            case 'random':
            case 'drift': {
                // Value noise, not stacked harmonics — those still orbit.
                const n1 = valueNoise(phase * 0.21 + 2.0);
                const n2 = valueNoise(phase * 0.13 + 11.7);
                const n3 = valueNoise(phase2 * 0.17 + 5.3);
                const n4 = valueNoise(phase3 * 0.09 + 19.1);
                return {
                    pan: Math.tanh(n1 * 1.4 + n2 * 0.85),
                    el: n3 * 0.85,
                    dist: 0.15 + 0.55 * (0.5 + 0.5 * n4),
                    ild: 1.05, itd: 1.15, snap: false
                };
            }
            case 'breathe': {
                // Near/far pump. L/R is a slow whisper so the LED isn't dead;
                // the audible identity is distance (level + air), not pan.
                const near = 0.5 + 0.5 * s;
                return {
                    pan: 0.2 * Math.sin(phase2),
                    el: (near - 0.5) * 1.85,
                    dist: 1 - near,
                    ild: 0.22, itd: 0.18, snap: false
                };
            }
            default:
                return {
                    pan: s,
                    el: Math.sin(phase * 2) * 0.3,
                    dist: 0.18 * (1 - Math.cos(phase)),
                    ild: 1, itd: 1, snap: false
                };
        }
    }

    const api = { prismMotion: prismMotion, prismMotionRate: prismMotionRate, valueNoise: valueNoise };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.prismMotion = prismMotion;
    root.prismMotionRate = prismMotionRate;
})(typeof globalThis !== 'undefined' ? globalThis : this);
