'use strict';
const assert = require('assert');
const { prismMotion, prismMotionRate } = require('./spatial-motion.js');

function sample(shape, n) {
    const out = [];
    const N = n || 256;
    for (let i = 0; i < N; i++) {
        const p = (i / N) * Math.PI * 2;
        out.push(prismMotion(shape, p, p * 0.618, p * 0.317));
    }
    return out;
}

function span(rows, key) {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < rows.length; i++) {
        const v = rows[i][key];
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return { min: min, max: max, range: max - min };
}

function corr(rows, a, b) {
    const n = rows.length;
    let ma = 0;
    let mb = 0;
    for (let i = 0; i < n; i++) {
        ma += rows[i][a];
        mb += rows[i][b];
    }
    ma /= n;
    mb /= n;
    let num = 0;
    let da = 0;
    let db = 0;
    for (let i = 0; i < n; i++) {
        const xa = rows[i][a] - ma;
        const xb = rows[i][b] - mb;
        num += xa * xb;
        da += xa * xa;
        db += xb * xb;
    }
    return num / Math.sqrt(da * db || 1);
}

function meanAbsDiff(a, b, key) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i][key] - b[i][key]);
    return s / a.length;
}

const orbit = sample('sine');
const tumble = sample('tumble');
const breathe = sample('breathe');
const drift = sample('random');
const driftAlias = sample('drift');

assert.ok(span(orbit, 'pan').range > 1.9, 'orbit pans full L/R');
assert.ok(span(tumble, 'pan').range > 1.7, 'tumble still pans hard L/R, not a shy orbit');
assert.ok(span(tumble, 'el').range > 2.0, 'tumble elevation is a real over-the-head roll');
assert.ok(Math.abs(corr(tumble, 'pan', 'el')) < 0.2, 'tumble pan and elevation are out of phase');

assert.ok(span(breathe, 'pan').range < 0.45, 'breathe is not an L/R pattern');
assert.ok(span(breathe, 'dist').range > 0.9, 'breathe distance covers near to far');
assert.ok(corr(breathe, 'el', 'dist') < -0.9, 'breathe near is bright/close, far is dark');

assert.ok(meanAbsDiff(orbit, tumble, 'el') > 0.4, 'tumble elevation unlike orbit');
assert.ok(meanAbsDiff(orbit, drift, 'pan') > 0.2, 'drift path is not a sine orbit');
assert.ok(meanAbsDiff(drift, driftAlias, 'pan') < 1e-12, 'drift alias matches random');

const p0 = prismMotion('random', 0, 0, 0).pan;
const pTau = prismMotion('random', Math.PI * 2, Math.PI * 2 * 0.618, Math.PI * 2 * 0.317).pan;
assert.ok(Math.abs(p0 - pTau) > 0.02, 'drift is not 2π-periodic like a circle');

assert.strictEqual(prismMotionRate('breathe') > 1, true, 'breathe cycles in a few seconds at default speed');
assert.ok(prismMotionRate('tumble') > 1, 'tumble a bit faster than orbit');

console.log('PASS  spatial-motion  tumble/breathe/drift are distinct');
