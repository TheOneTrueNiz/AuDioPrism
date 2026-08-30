// audio-engine.js (Offscreen) — AuDioPrism V17 "Quiet Prism"
// Click-free DSP: audio-clock ramps, dry/wet bypass, no HRTF kernel hopping,
// static waveshapers, lookahead 8D, fade in/out.

let audioCtx = null;
let source = null;
let captureStream = null;
let analyser = null;
let timeData = null;
let freqData = null;
let prevSpec = null;
let tickTimer = null;
let meterTimer = null;
let fadingOut = false;
let bpmEst = 0;
let lastOnset = 0;
const onsetGaps = [];

const TAU = 0.045;
const LOOKAHEAD = 0.22;
const STEP = 0.016;
const TICK_MS = 40;
const METER_MS = 40;

function stereo2(node) {
    try {
        node.channelCount = 2;
        node.channelCountMode = 'explicit';
        node.channelInterpretation = 'speakers';
    } catch (_) { /* some nodes reject channelCount */ }
}

function holdRamp(param, value, t, tau = TAU) {
    if (!param) return;
    const v = Number.isFinite(value) ? value : 0;
    try { param.cancelAndHoldAtTime(t); }
    catch (_) {
        try {
            param.cancelScheduledValues(t);
            param.setValueAtTime(param.value, t);
        } catch (__) { /* ignore */ }
    }
    try { param.setTargetAtTime(v, t, tau); }
    catch (_) {
        try { param.setValueAtTime(v, t); } catch (__) { /* ignore */ }
    }
}

function equalPower(wetAmt) {
    const w = Math.max(0, Math.min(1, wetAmt));
    return {
        wet: Math.sin(w * Math.PI * 0.5),
        dry: Math.cos(w * Math.PI * 0.5)
    };
}

function crossfade(dryGain, wetGain, wetAmt, t, tau = 0.06) {
    const { dry, wet } = equalPower(wetAmt);
    holdRamp(dryGain, dry, t, tau);
    holdRamp(wetGain, wet, t, tau);
}

function makeTanhCurve(drive = 1.15) {
    const n = 4096;
    const curve = new Float32Array(n);
    const norm = Math.tanh(drive) || 1;
    for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * drive) / norm;
    }
    return curve;
}

function normalizeBuffer(data, targetRms = 0.12) {
    let acc = 0;
    for (let i = 0; i < data.length; i++) acc += data[i] * data[i];
    const rms = Math.sqrt(acc / data.length) || 1;
    const g = targetRms / rms;
    for (let i = 0; i < data.length; i++) data[i] *= g;
}

function crossfadeLoop(data, fade = 512) {
    const n = data.length;
    if (fade * 2 >= n) return;
    for (let i = 0; i < fade; i++) {
        const a = i / fade;
        const head = data[i];
        const tail = data[n - fade + i];
        data[i] = tail * (1 - a) + head * a;
    }
}

function fillWhite(data) {
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

function fillPink(data) {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
        b6 = w * 0.115926;
    }
}

function fillBrown(data) {
    let last = 0;
    for (let i = 0; i < data.length; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + w * 0.02) * 0.996;
        data[i] = last;
    }
}

function makeNoiseBuffer(ctx, fill, seconds = 8) {
    const length = Math.floor(seconds * ctx.sampleRate);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        fill(data);
        normalizeBuffer(data, 0.10);
        crossfadeLoop(data, 1024);
    }
    return buffer;
}

function startLoop(ctx, buffer) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start();
    return src;
}

// --- MODULES ---

class SpatialPanner {
    /**
     * Smooth 8D: equal-power ILD + ITD + contralateral head-shadow.
     * HRTF convolution kernels were the main click source (discrete IR hops).
     * Position is scheduled on the audio clock as linear ramps.
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.active = prismToggle('panner', true);
        this.speed = prismKnob('k-speed', 0.12);
        this.depth = prismKnob('k-depth', 0.55);
        this.shape = prismParam('panner_shape', 'sine');
        this.originT = 0;
        this.origin = { phase: 0, phase2: 0, phase3: 0, breath: 0 };
        this.schedTime = 0;
        this.primed = false;
        this.lastPan = 0;
        this.lastNear = 0.5;
        this.beatSync = prismParam('panner_beatSync', false);
        this.bpm = 0;

        this.BASE_RADIUS = 1.5;
        this.CENTER = { x: 0, y: 0, z: -1 };
        this.ITD = 0.00066;

        this.input = ctx.createGain();
        this.output = ctx.createGain();
        this.dry = ctx.createGain();
        this.wet = ctx.createGain();
        stereo2(this.input);
        stereo2(this.output);
        this.dry.gain.value = this.active ? 0 : 1;
        this.wet.gain.value = this.active ? 1 : 0;

        // Keep L/R independent. Mono-sum + equal-power pan was ~-3 dB at
        // center and much quieter at the sides (the "8D mute").
        const split = ctx.createChannelSplitter(2);

        this.delayL = ctx.createDelay(0.005);
        this.delayR = ctx.createDelay(0.005);
        this.delayL.delayTime.value = 0;
        this.delayR.delayTime.value = 0;

        this.shadowL = ctx.createBiquadFilter();
        this.shadowR = ctx.createBiquadFilter();
        this.shadowL.type = 'highshelf';
        this.shadowR.type = 'highshelf';
        this.shadowL.frequency.value = 4800;
        this.shadowR.frequency.value = 4800;
        this.shadowL.gain.value = 0;
        this.shadowR.gain.value = 0;

        this.gainL = ctx.createGain();
        this.gainR = ctx.createGain();
        this.gainL.gain.value = 1;
        this.gainR.gain.value = 1;

        this.airL = ctx.createBiquadFilter();
        this.airR = ctx.createBiquadFilter();
        this.airL.type = 'highshelf';
        this.airR.type = 'highshelf';
        this.airL.frequency.value = 6000;
        this.airR.frequency.value = 6000;
        this.airL.gain.value = 0;
        this.airR.gain.value = 0;

        this.merger = ctx.createChannelMerger(2);
        stereo2(this.merger);

        this.input.connect(this.dry);
        this.dry.connect(this.output);

        this.input.connect(split);
        split.connect(this.delayL, 0);
        split.connect(this.delayR, 1);
        this.delayL.connect(this.shadowL);
        this.delayR.connect(this.shadowR);
        this.shadowL.connect(this.airL);
        this.shadowR.connect(this.airR);
        this.airL.connect(this.gainL);
        this.airR.connect(this.gainR);
        this.gainL.connect(this.merger, 0, 0);
        this.gainR.connect(this.merger, 0, 1);
        this.merger.connect(this.wet);
        this.wet.connect(this.output);
    }

    setActive(active) {
        this.active = active;
        const t = this.ctx.currentTime;
        crossfade(this.dry.gain, this.wet.gain, active ? 1 : 0, t, 0.08);
        this.reseed();
    }

    _rate() {
        return typeof prismMotionRate === 'function' ? prismMotionRate(this.shape) : 1;
    }

    _hz() {
        const rate = this._rate();
        if (this.beatSync && this.bpm >= 60) {
            const base = (this.bpm / 60) / 8;
            return base * (this.speed / 0.12) * rate;
        }
        return this.speed * rate;
    }

    _phasesAt(t) {
        if (!this.originT) this.originT = t;
        const dt = Math.max(0, t - this.originT);
        const o = this._hz() * Math.PI * 2 * dt;
        return {
            phase: this.origin.phase + o,
            phase2: this.origin.phase2 + o * 0.618,
            phase3: this.origin.phase3 + o * 0.317,
            breath: this.origin.breath + o * 0.23
        };
    }

    reseed() {
        const t = this.ctx.currentTime + 0.008;
        this.origin = this._phasesAt(t);
        this.originT = t;
        const params = [
            this.delayL.delayTime, this.delayR.delayTime,
            this.gainL.gain, this.gainR.gain,
            this.shadowL.gain, this.shadowR.gain,
            this.airL.gain, this.airR.gain
        ];
        for (const p of params) {
            try { p.cancelAndHoldAtTime(t); } catch (_) { /* ignore */ }
        }
        this.schedTime = t;
        this.primed = true;
    }

    _motion(phase, phase2, phase3) {
        if (typeof prismMotion === 'function') return prismMotion(this.shape, phase, phase2, phase3);
        return { pan: Math.sin(phase), el: 0, dist: 0, ild: 1, itd: 1, snap: false };
    }

    panFromMotion(mot) {
        const depth = this.active ? this.depth : 0;
        const span = mot.snap ? (0.72 + 0.28 * depth) : depth;
        return Math.max(-1, Math.min(1, mot.pan * span));
    }

    readPan(at) {
        const ph = this._phasesAt(at);
        return this.panFromMotion(this._motion(ph.phase, ph.phase2, ph.phase3));
    }

    _applyAt(t, mot) {
        const pan = this.panFromMotion(mot);
        const depth = this.active ? this.depth : 0;
        // Keep 3D cues readable at moderate Depth. Old path scaled el/dist
        // by depth then only ±2 dB of air — breathe was inaudible.
        const feel = 0.42 + 0.58 * depth;
        const elAmt = mot.el * feel;
        const distAmt = Math.max(0, mot.dist) * feel;
        const itd = this.ITD * pan * mot.itd;

        const ildDb = 6.5 * pan * mot.ild;
        let gL = Math.pow(10, -ildDb / 20);
        let gR = Math.pow(10, ildDb / 20);
        const pwr = Math.sqrt((gL * gL + gR * gR) * 0.5) || 1;
        gL /= pwr;
        gR /= pwr;
        // Distance must hit LEVEL. Air-only "far" cancelled elevation and
        // left breathe as a ~2 dB brightness wobble.
        const distGain = Math.pow(10, (-8.5 * distAmt) / 20);
        gL *= distGain;
        gR *= distGain;

        const far = -8 * Math.abs(pan);
        const sL = pan > 0 ? far : 0;
        const sR = pan < 0 ? far : 0;
        const air = Math.max(-12, Math.min(12, elAmt * 6.5 - distAmt * 8));

        const write = (param, value) => {
            const v = Number.isFinite(value) ? value : param.value;
            try {
                if (!this.primed) param.setValueAtTime(v, t);
                else param.linearRampToValueAtTime(v, t);
            } catch (_) { /* ignore */ }
        };

        write(this.delayL.delayTime, Math.max(0, itd));
        write(this.delayR.delayTime, Math.max(0, -itd));
        write(this.gainL.gain, gL);
        write(this.gainR.gain, gR);
        write(this.shadowL.gain, sL);
        write(this.shadowR.gain, sR);
        write(this.airL.gain, air);
        write(this.airR.gain, air);
        this.primed = true;
        return pan;
    }

    scheduleUntil(endTime) {
        const now = this.ctx.currentTime;
        if (!this.originT) this.originT = now;
        if (this.schedTime < now - 0.04) this.schedTime = now + 0.03;
        let t = this.schedTime;

        while (t < endTime) {
            const ph = this._phasesAt(t);
            const mot = this._motion(ph.phase, ph.phase2, ph.phase3);
            this._applyAt(t, mot);
            t += STEP;
        }

        this.schedTime = t;
        const phNow = this._phasesAt(now);
        const motNow = this._motion(phNow.phase, phNow.phase2, phNow.phase3);
        this.lastPan = this.active ? this.panFromMotion(motNow) : 0;
        this.lastNear = this.active ? (1 - Math.max(0, Math.min(1, motNow.dist))) : 0.5;
    }
}

class StereoWidener {
    constructor(ctx) {
        this.ctx = ctx;
        this.active = prismToggle('width', true);
        this.width = prismKnob('k-width-amt', 1.0);
        this.crossAmount = prismKnob('k-cross-amount', 0.25);

        this.input = ctx.createGain();
        this.output = ctx.createGain();
        this.dry = ctx.createGain();
        this.wet = ctx.createGain();
        stereo2(this.input);
        stereo2(this.output);
        this.dry.gain.value = this.active ? 0 : 1;
        this.wet.gain.value = this.active ? 1 : 0;

        this.splitter = ctx.createChannelSplitter(2);
        this.merger = ctx.createChannelMerger(2);
        stereo2(this.merger);

        this.gainL = ctx.createGain();
        this.gainR = ctx.createGain();
        this.crossL = ctx.createGain();
        this.crossR = ctx.createGain();

        this.shelfL = ctx.createBiquadFilter();
        this.shelfR = ctx.createBiquadFilter();
        this.shelfL.type = 'highshelf';
        this.shelfR.type = 'highshelf';
        this.shelfL.frequency.value = 5000;
        this.shelfR.frequency.value = 5000;
        this.shelfL.gain.value = -4;
        this.shelfR.gain.value = -4;

        this.input.connect(this.dry);
        this.dry.connect(this.output);

        this.input.connect(this.splitter);
        this.splitter.connect(this.gainL, 0);
        this.splitter.connect(this.gainR, 1);
        this.splitter.connect(this.crossL, 0);
        this.splitter.connect(this.crossR, 1);
        this.crossL.connect(this.shelfL);
        this.crossR.connect(this.shelfR);
        this.gainL.connect(this.merger, 0, 0);
        this.gainR.connect(this.merger, 0, 1);
        this.shelfL.connect(this.merger, 0, 1);
        this.shelfR.connect(this.merger, 0, 0);
        this.merger.connect(this.wet);
        this.wet.connect(this.output);

        this.updateWidth();
    }

    setActive(active) {
        this.active = active;
        crossfade(this.dry.gain, this.wet.gain, active ? 1 : 0, this.ctx.currentTime, 0.07);
    }

    updateWidth() {
        const t = this.ctx.currentTime;
        const w = this.width;
        const c = this.crossAmount;
        const direct = 1.0;
        const cross = -c * (w - 1);
        holdRamp(this.gainL.gain, direct, t, 0.05);
        holdRamp(this.gainR.gain, direct, t, 0.05);
        holdRamp(this.crossL.gain, cross, t, 0.05);
        holdRamp(this.crossR.gain, cross, t, 0.05);
        const shelfGain = w > 1 ? -4 - ((w - 1) * 4) : -2;
        holdRamp(this.shelfL.gain, shelfGain, t, 0.08);
        holdRamp(this.shelfR.gain, shelfGain, t, 0.08);
    }
}

class BinauralBeat {
    constructor(ctx) {
        this.ctx = ctx;
        this.active = prismToggle('binaural', false);
        this.vol = prismKnob('k-bin-vol', 0.07);
        this.baseFreq = prismKnob('k-bin-base', 200);
        this.beatFreq = prismParam('binaural_beatFreq', 14);

        this.oscL = ctx.createOscillator();
        this.oscR = ctx.createOscillator();
        this.oscL.type = 'sine';
        this.oscR.type = 'sine';

        this.gainL = ctx.createGain();
        this.gainR = ctx.createGain();
        this.gainL.gain.value = 1;
        this.gainR.gain.value = 1;

        this.merger = ctx.createChannelMerger(2);
        stereo2(this.merger);

        this.gain = ctx.createGain();
        this.gain.gain.value = 0;

        this.oscL.connect(this.gainL);
        this.oscR.connect(this.gainR);
        this.gainL.connect(this.merger, 0, 0);
        this.gainR.connect(this.merger, 0, 1);
        this.merger.connect(this.gain);

        this.oscL.start();
        this.oscR.start();
        this.output = this.gain;
        this._updateFrequencies(true);
    }

    _updateFrequencies(immediate) {
        const t = this.ctx.currentTime;
        const tau = immediate ? 0.02 : 0.25;
        holdRamp(this.oscL.frequency, this.baseFreq, t, tau);
        holdRamp(this.oscR.frequency, this.baseFreq + this.beatFreq, t, tau);
    }

    update() {
        const t = this.ctx.currentTime;
        const targetVol = this.active ? this.vol : 0;
        holdRamp(this.gain.gain, targetVol, t, 0.12);
        this._updateFrequencies(false);
    }
}

class Isochronic {
    constructor(ctx) {
        this.ctx = ctx;
        this.active = prismToggle('iso', false);
        this.freq = prismKnob('k-iso-freq', 10);
        this.depth = prismKnob('k-iso-depth', 0.4);
        this.wave = 'sine';
        this.carrierFreq = 220;

        this.carrier = ctx.createOscillator();
        this.carrier.type = 'sine';
        this.carrier.frequency.value = this.carrierFreq;

        this.dcOffset = ctx.createConstantSource();
        this.dcOffset.offset.value = 0.5;

        this.modulator = ctx.createOscillator();
        this.modulator.type = 'sine';
        this.modulator.frequency.value = this.freq;

        this.edge = ctx.createBiquadFilter();
        this.edge.type = 'lowpass';
        this.edge.frequency.value = 1800;
        this.edge.Q.value = 0.5;

        this.modGain = ctx.createGain();
        this.modGain.gain.value = 0.25;

        this.amGain = ctx.createGain();
        this.amGain.gain.value = 0;

        this.output = ctx.createGain();
        this.output.gain.value = 0;

        this.carrier.connect(this.amGain);
        this.amGain.connect(this.output);

        this.dcOffset.connect(this.amGain.gain);
        this.modulator.connect(this.edge);
        this.edge.connect(this.modGain);
        this.modGain.connect(this.amGain.gain);

        this.carrier.start();
        this.modulator.start();
        this.dcOffset.start();
    }

    setWave(type) {
        this.wave = type === 'square' ? 'square' : 'sine';
        this.modulator.type = this.wave;
        // Square edges get ~4–6ms rounding so they don't click.
        const cutoff = this.wave === 'square' ? 240 : 1800;
        holdRamp(this.edge.frequency, cutoff, this.ctx.currentTime, 0.08);
    }

    setCarrierFreq(freq) {
        this.carrierFreq = freq;
        holdRamp(this.carrier.frequency, freq, this.ctx.currentTime, 0.08);
    }

    update() {
        const t = this.ctx.currentTime;
        holdRamp(this.modulator.frequency, this.freq, t, 0.08);
        const modAmount = Math.max(0, Math.min(1, this.depth)) * 0.5;
        holdRamp(this.modGain.gain, modAmount, t, 0.08);
        holdRamp(this.output.gain, this.active ? 0.12 : 0, t, 0.14);
    }
}

class NoiseGen {
    constructor(ctx) {
        this.ctx = ctx;
        this.active = prismToggle('noise', false);
        this.vol = prismKnob('k-noise-vol', 0.04);
        this.color = prismKnob('k-noise-color', 0.0);

        const whiteBuf = makeNoiseBuffer(ctx, fillWhite, 6);
        const pinkBuf = makeNoiseBuffer(ctx, fillPink, 6);
        const brownBuf = makeNoiseBuffer(ctx, fillBrown, 6);

        this.srcW = startLoop(ctx, whiteBuf);
        this.srcP = startLoop(ctx, pinkBuf);
        this.srcB = startLoop(ctx, brownBuf);

        this.gainW = ctx.createGain();
        this.gainP = ctx.createGain();
        this.gainB = ctx.createGain();
        this.gainW.gain.value = 0;
        this.gainP.gain.value = 0;
        this.gainB.gain.value = 1;

        this.dc = ctx.createBiquadFilter();
        this.dc.type = 'highpass';
        this.dc.frequency.value = 18;
        this.dc.Q.value = 0.7;

        this.gain = ctx.createGain();
        this.gain.gain.value = 0;

        this.srcW.connect(this.gainW);
        this.srcP.connect(this.gainP);
        this.srcB.connect(this.gainB);
        this.gainW.connect(this.dc);
        this.gainP.connect(this.dc);
        this.gainB.connect(this.dc);
        this.dc.connect(this.gain);

        this.output = this.gain;
        this.updateColor();
    }

    updateColor() {
        const t = this.ctx.currentTime;
        const c = Math.max(0, Math.min(1, this.color));
        let b = 0, p = 0, w = 0;
        if (c < 0.5) {
            const x = c * 2;
            b = Math.cos(x * Math.PI * 0.5);
            p = Math.sin(x * Math.PI * 0.5);
        } else {
            const x = (c - 0.5) * 2;
            p = Math.cos(x * Math.PI * 0.5);
            w = Math.sin(x * Math.PI * 0.5);
        }
        holdRamp(this.gainB.gain, b, t, 0.1);
        holdRamp(this.gainP.gain, p, t, 0.1);
        holdRamp(this.gainW.gain, w, t, 0.1);
    }

    update() {
        holdRamp(this.gain.gain, this.active ? this.vol : 0, this.ctx.currentTime, 0.12);
        this.updateColor();
    }
}

class Saturation {
    constructor(ctx) {
        this.ctx = ctx;
        this.active = prismToggle('saturation', false);
        this.drive = prismKnob('k-sat-drive', 0);
        this.warmth = prismKnob('k-sat-warmth', 550);

        this.input = ctx.createGain();
        this.output = ctx.createGain();
        this.dry = ctx.createGain();
        this.wetIn = ctx.createGain();
        this.wetOut = ctx.createGain();
        stereo2(this.input);
        stereo2(this.output);
        this.dry.gain.value = 1;
        this.wetOut.gain.value = 0;
        this.wetIn.gain.value = 1;

        this.shaper = ctx.createWaveShaper();
        this.shaper.oversample = '4x';
        this.shaper.curve = makeTanhCurve(3);

        this.warmthFilter = ctx.createBiquadFilter();
        this.warmthFilter.type = 'lowpass';
        this.warmthFilter.frequency.value = 12000;
        this.warmthFilter.Q.value = 0.5;

        this.makeup = ctx.createGain();
        this.makeup.gain.value = 1;

        this.input.connect(this.dry);
        this.dry.connect(this.output);

        this.input.connect(this.wetIn);
        this.wetIn.connect(this.shaper);
        this.shaper.connect(this.warmthFilter);
        this.warmthFilter.connect(this.makeup);
        this.makeup.connect(this.wetOut);
        this.wetOut.connect(this.output);

        this.updateDrive();
        this.updateWarmth();
    }

    setActive(active) {
        this.active = active;
        crossfade(this.dry.gain, this.wetOut.gain, active ? 1 : 0, this.ctx.currentTime, 0.07);
    }

    updateDrive() {
        const t = this.ctx.currentTime;
        const d = Math.max(0, Math.min(1, this.drive));
        // Static tanh curve; drive is pre-gain. Never swap WaveShaper.curve while audio runs.
        const pre = 1 + d * 7;
        const makeup = 1 / (0.55 + 0.45 * Math.tanh(pre * 0.35));
        holdRamp(this.wetIn.gain, pre, t, 0.06);
        holdRamp(this.makeup.gain, makeup, t, 0.06);
    }

    updateWarmth() {
        const minFreq = 2000;
        const maxFreq = 18000;
        const normalized = Math.max(0, Math.min(1, this.warmth / 1000));
        const freq = Math.exp(Math.log(minFreq) + normalized * (Math.log(maxFreq) - Math.log(minFreq)));
        holdRamp(this.warmthFilter.frequency, freq, this.ctx.currentTime, 0.06);
    }
}

class SensoryFilter {
    constructor(ctx) {
        this.ctx = ctx;
        this.active = prismToggle('filter', true);
        this.freq = prismKnob('k-filter-freq', 12000);
        this.res = prismKnob('k-filter-res', 0.55);

        this.input = ctx.createGain();
        this.output = ctx.createGain();
        this.dry = ctx.createGain();
        this.wet = ctx.createGain();
        stereo2(this.input);
        stereo2(this.output);
        this.dry.gain.value = this.active ? 0 : 1;
        this.wet.gain.value = this.active ? 1 : 0;

        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = this.freq;
        this.filter.Q.value = this.res;

        this.input.connect(this.dry);
        this.dry.connect(this.output);
        this.input.connect(this.filter);
        this.filter.connect(this.wet);
        this.wet.connect(this.output);
    }

    setActive(active) {
        this.active = active;
        crossfade(this.dry.gain, this.wet.gain, active ? 1 : 0, this.ctx.currentTime, 0.08);
    }

    update() {
        const t = this.ctx.currentTime;
        holdRamp(this.filter.frequency, this.freq, t, 0.06);
        holdRamp(this.filter.Q, this.res, t, 0.06);
    }
}

class CompressorWrap {
    constructor(ctx) {
        this.ctx = ctx;
        this.active = prismToggle('compressor', true);

        this.input = ctx.createGain();
        this.output = ctx.createGain();
        this.dry = ctx.createGain();
        this.wet = ctx.createGain();
        stereo2(this.input);
        stereo2(this.output);
        this.dry.gain.value = this.active ? 0 : 1;
        this.wet.gain.value = this.active ? 1 : 0;

        this.node = ctx.createDynamicsCompressor();
        this.node.knee.value = 8;
        this.node.ratio.value = prismKnob('k-comp-ratio', 3);
        this.node.attack.value = prismKnob('k-comp-attack', 0.012);
        this.node.release.value = 0.22;
        this.node.threshold.value = prismKnob('k-comp-thresh', -18);

        this.input.connect(this.dry);
        this.dry.connect(this.output);
        this.input.connect(this.node);
        this.node.connect(this.wet);
        this.wet.connect(this.output);
    }

    setActive(active) {
        this.active = active;
        crossfade(this.dry.gain, this.wet.gain, active ? 1 : 0, this.ctx.currentTime, 0.08);
    }
}

// --- STATE ---
let state = {
    audio: null,
    panner: null, bin: null, iso: null, noise: null, sat: null,
    widener: null, sensoryFilter: null, compressor: null,
    musicGain: null, fxGain: null, masterGain: null,
    eqLow: null, eqMid: null, eqHigh: null, limiter: null,
    settings: {},
    toggles: {}
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'PING_ENGINE') {
        sendResponse({ ready: true, running: !!(audioCtx && audioCtx.state !== 'closed') });
        return false;
    }

    if (msg.type === 'INIT_AUDIO') {
        initFromMessage(msg)
            .then(() => sendResponse({ ok: true }))
            .catch((err) => {
                console.error('Prism INIT_AUDIO failed', err);
                chrome.runtime.sendMessage({
                    type: 'ENGINE_ERROR',
                    error: String(err && err.message ? err.message : err)
                }).catch(() => {});
                sendResponse({ ok: false, error: String(err) });
            });
        return true;
    }

    if (msg.type === 'UPDATE_KNOB') {
        state.settings[msg.id] = msg.value;
        if (state.audio) updateParam(msg.id, msg.value);
        return false;
    }

    if (msg.type === 'SET_PARAM') {
        state.settings[msg.module + '_' + msg.param] = msg.value;
        applySetParam(msg.module, msg.param, msg.value);
        return false;
    }

    if (msg.type === 'TOGGLE_MODULE') {
        if (state.audio) setToggle(msg.module, msg.active);
        else state.toggles[msg.module] = msg.active;
        return false;
    }

    if (msg.type === 'SNAPSHOT') {
        applySnapshot(msg.snapshot || {});
        return false;
    }

    if (msg.type === 'SET_BYPASS') {
        setBypass(!!msg.active);
        return false;
    }

    if (msg.type === 'FADE_STOP') {
        fadeStop().then(() => sendResponse({ ok: true }));
        return true;
    }

    return false;
});

async function initFromMessage(msg) {
    if (audioCtx && audioCtx.state !== 'closed') {
        chrome.runtime.sendMessage({ type: 'ENGINE_READY' }).catch(() => {});
        if (msg.snapshot) applySnapshot(msg.snapshot);
        return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: msg.streamId
            }
        },
        video: false
    });
    try {
        await initAudioGraph(stream, msg.snapshot);
    } catch (err) {
        try { stream.getTracks().forEach((tr) => tr.stop()); } catch (_) { /* ignore */ }
        throw err;
    }
}

async function initAudioGraph(stream, snapshot) {
    fadingOut = false;
    captureStream = stream;

    audioCtx = new AudioContext({ latencyHint: 'playback' });
    try {
        audioCtx.destination.channelCount = 2;
        audioCtx.destination.channelCountMode = 'explicit';
        audioCtx.destination.channelInterpretation = 'speakers';
    } catch (_) { /* ignore */ }

    await audioCtx.resume().catch(() => {});

    source = audioCtx.createMediaStreamSource(stream);
    stereo2(source);

    const musicGain = audioCtx.createGain();
    const fxGain = audioCtx.createGain();
    const masterGain = audioCtx.createGain();
    stereo2(musicGain);
    stereo2(fxGain);
    stereo2(masterGain);
    musicGain.gain.value = 1;
    fxGain.gain.value = 1;
    masterGain.gain.value = 0;

    const panner = new SpatialPanner(audioCtx);
    const bin = new BinauralBeat(audioCtx);
    const iso = new Isochronic(audioCtx);
    const noise = new NoiseGen(audioCtx);
    const sat = new Saturation(audioCtx);
    const widener = new StereoWidener(audioCtx);
    const sensoryFilter = new SensoryFilter(audioCtx);
    const compressor = new CompressorWrap(audioCtx);

    const eqLow = audioCtx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 250;
    const eqMid = audioCtx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 1.0;
    const eqHigh = audioCtx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 4000;

    const dcBlock = audioCtx.createBiquadFilter();
    dcBlock.type = 'highpass';
    dcBlock.frequency.value = 16;
    dcBlock.Q.value = 0.7;

    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -1.2;
    limiter.knee.value = 2;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.12;

    const softClip = audioCtx.createWaveShaper();
    softClip.oversample = '4x';
    softClip.curve = makeTanhCurve(1.12);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.7;
    timeData = new Float32Array(analyser.fftSize);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    prevSpec = new Uint8Array(analyser.frequencyBinCount);

    // Music: source -> musicGain -> widener -> EQ -> filter -> sat -> comp -> 8D -> master
    source.connect(musicGain);
    musicGain.connect(widener.input);
    widener.output.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(sensoryFilter.input);
    sensoryFilter.output.connect(sat.input);
    sat.output.connect(compressor.input);
    compressor.output.connect(panner.input);
    panner.output.connect(masterGain);

    // FX sit under the music, DC-blocked, no 8D (keeps beats spatially stable)
    const fxDc = audioCtx.createBiquadFilter();
    fxDc.type = 'highpass';
    fxDc.frequency.value = 18;
    fxDc.Q.value = 0.7;
    bin.output.connect(fxGain);
    iso.output.connect(fxGain);
    noise.output.connect(fxGain);
    fxGain.connect(fxDc);
    fxDc.connect(masterGain);

    const processedSend = audioCtx.createGain();
    processedSend.gain.value = 1;
    stereo2(processedSend);
    const bypassDry = audioCtx.createGain();
    bypassDry.gain.value = 0;
    stereo2(bypassDry);

    masterGain.connect(processedSend);
    processedSend.connect(dcBlock);
    source.connect(bypassDry);
    bypassDry.connect(dcBlock);
    dcBlock.connect(limiter);
    limiter.connect(softClip);
    softClip.connect(analyser);
    analyser.connect(audioCtx.destination);

    state = {
        audio: audioCtx,
        panner, bin, iso, noise, sat, widener, sensoryFilter, compressor,
        musicGain, fxGain, masterGain, processedSend, bypassDry,
        eqLow, eqMid, eqHigh, limiter,
        settings: state.settings || {},
        toggles: state.toggles || {}
    };

    panner.setActive(prismToggle('panner', true));
    widener.setActive(prismToggle('width', true));
    sensoryFilter.setActive(prismToggle('filter', true));
    sat.setActive(prismToggle('saturation', false));
    compressor.setActive(prismToggle('compressor', true));

    if (typeof PRISM_DEFAULTS !== 'undefined') applySnapshot(PRISM_DEFAULTS);
    if (snapshot) applySnapshot(snapshot);

    const t = audioCtx.currentTime;
    holdRamp(masterGain.gain, 0.95, t, 0.06);

    startLoops();
    chrome.runtime.sendMessage({ type: 'ENGINE_READY' }).catch(() => {});
}

function applySetParam(module, param, value) {
    if (!state.audio) return;
    if (module === 'panner' && param === 'shape' && state.panner) {
        state.panner.shape = value;
        state.panner.reseed();
    }
    if (module === 'binaural' && param === 'beatFreq' && state.bin) {
        state.bin.beatFreq = Number(value);
        state.bin.update();
    }
    if (module === 'iso' && param === 'wave' && state.iso) {
        state.iso.setWave(value);
    }
    if (module === 'panner' && param === 'beatSync' && state.panner) {
        state.panner.beatSync = !!value;
        state.panner.reseed();
    }
}

function setBypass(on) {
    if (!state.audio || !state.bypassDry || !state.processedSend) return;
    const t = state.audio.currentTime;
    holdRamp(state.bypassDry.gain, on ? 1 : 0, t, 0.03);
    holdRamp(state.processedSend.gain, on ? 0 : 1, t, 0.03);
}

function setToggle(module, active) {
    state.toggles[module] = active;
    if (!state.audio) return;
    if (module === 'panner' && state.panner) state.panner.setActive(active);
    if (module === 'binaural' && state.bin) { state.bin.active = active; state.bin.update(); }
    if (module === 'iso' && state.iso) { state.iso.active = active; state.iso.update(); }
    if (module === 'noise' && state.noise) { state.noise.active = active; state.noise.update(); }
    if (module === 'width' && state.widener) state.widener.setActive(active);
    if (module === 'compressor' && state.compressor) state.compressor.setActive(active);
    if (module === 'saturation' && state.sat) state.sat.setActive(active);
    if (module === 'filter' && state.sensoryFilter) state.sensoryFilter.setActive(active);
}

function applySnapshot(snapshot) {
    if (!snapshot) return;
    if (snapshot.knobs) {
        for (const [id, v] of Object.entries(snapshot.knobs)) {
            state.settings[id] = v;
            if (state.audio) updateParam(id, v);
        }
    }
    if (snapshot.params) {
        for (const [key, v] of Object.entries(snapshot.params)) {
            const [module, param] = key.split('_');
            state.settings[key] = v;
            if (state.audio) applySetParam(module, param, v);
        }
    }
    if (snapshot.toggles) {
        for (const [mod, active] of Object.entries(snapshot.toggles)) {
            setToggle(mod, active);
        }
    }
}

function updateParam(id, v) {
    if (!state.audio) return;
    state.settings[id] = v;
    const t = state.audio.currentTime;

    switch (id) {
        case 'k-music-vol': holdRamp(state.musicGain.gain, v, t, 0.04); break;
        case 'k-fx-vol': holdRamp(state.fxGain.gain, v, t, 0.04); break;

        case 'k-speed':
            if (state.panner) {
                const at = Math.max(state.audio.currentTime, state.panner.schedTime || 0);
                state.panner.origin = state.panner._phasesAt(at);
                state.panner.originT = at;
                state.panner.speed = v;
            }
            break;
        case 'k-depth':
            if (state.panner) state.panner.depth = v;
            break;

        case 'k-eq-low': holdRamp(state.eqLow.gain, v, t, 0.08); break;
        case 'k-eq-mid': holdRamp(state.eqMid.gain, v, t, 0.08); break;
        case 'k-eq-high': holdRamp(state.eqHigh.gain, v, t, 0.08); break;

        case 'k-comp-thresh':
            if (state.compressor) holdRamp(state.compressor.node.threshold, v, t, 0.08);
            break;
        case 'k-comp-ratio':
            if (state.compressor) holdRamp(state.compressor.node.ratio, v, t, 0.08);
            break;
        case 'k-comp-attack':
            if (state.compressor) holdRamp(state.compressor.node.attack, v, t, 0.08);
            break;

        case 'k-bin-vol':
            if (state.bin) { state.bin.vol = v; state.bin.update(); }
            break;
        case 'k-bin-base':
            if (state.bin) { state.bin.baseFreq = v; state.bin.update(); }
            break;

        case 'k-iso-freq':
            if (state.iso) { state.iso.freq = v; state.iso.update(); }
            break;
        case 'k-iso-depth':
            if (state.iso) { state.iso.depth = v; state.iso.update(); }
            break;

        case 'k-noise-vol':
            if (state.noise) { state.noise.vol = v; state.noise.update(); }
            break;
        case 'k-noise-color':
            if (state.noise) { state.noise.color = v; state.noise.update(); }
            break;

        case 'k-sat-drive':
            if (state.sat) { state.sat.drive = v; state.sat.updateDrive(); }
            break;
        case 'k-sat-warmth':
            if (state.sat) { state.sat.warmth = v; state.sat.updateWarmth(); }
            break;

        case 'k-width-amt':
            if (state.widener) { state.widener.width = v; state.widener.updateWidth(); }
            break;
        case 'k-cross-amount':
            if (state.widener) { state.widener.crossAmount = v; state.widener.updateWidth(); }
            break;

        case 'k-filter-freq':
            if (state.sensoryFilter) { state.sensoryFilter.freq = v; state.sensoryFilter.update(); }
            break;
        case 'k-filter-res':
            if (state.sensoryFilter) { state.sensoryFilter.res = v; state.sensoryFilter.update(); }
            break;
    }
}

function startLoops() {
    stopLoops();
    const tick = () => {
        if (!state.audio || fadingOut) return;
        if (state.panner) state.panner.scheduleUntil(state.audio.currentTime + LOOKAHEAD);
        tickTimer = setTimeout(tick, TICK_MS);
    };
    tick();

    const meter = () => {
        if (!state.audio || !analyser || fadingOut) return;
        analyser.getFloatTimeDomainData(timeData);
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < timeData.length; i++) {
            const s = timeData[i];
            sum += s * s;
            const a = Math.abs(s);
            if (a > peak) peak = a;
        }
        const rms = Math.sqrt(sum / timeData.length);

        if (freqData && prevSpec) {
            analyser.getByteFrequencyData(freqData);
            let flux = 0;
            for (let i = 0; i < freqData.length; i++) {
                const d = freqData[i] - prevSpec[i];
                if (d > 0) flux += d;
                prevSpec[i] = freqData[i];
            }
            const now = state.audio.currentTime;
            if (flux > 180 && now - lastOnset > 0.22) {
                if (lastOnset > 0) {
                    onsetGaps.push(now - lastOnset);
                    if (onsetGaps.length > 16) onsetGaps.shift();
                }
                lastOnset = now;
                if (onsetGaps.length >= 4) {
                    const sorted = onsetGaps.slice().sort((a, b) => a - b);
                    const med = sorted[(sorted.length / 2) | 0];
                    let bpm = 60 / Math.max(0.001, med);
                    while (bpm < 70) bpm *= 2;
                    while (bpm > 168) bpm /= 2;
                    bpmEst = bpmEst ? (bpmEst * 0.82 + bpm * 0.18) : bpm;
                    if (state.panner) state.panner.bpm = bpmEst;
                }
            }
        }

        chrome.runtime.sendMessage({
            type: 'METER',
            rms,
            peak,
            pan: (state.panner && state.panner.active) ? state.panner.lastPan : 0,
            near: (state.panner && state.panner.active) ? state.panner.lastNear : 0.5,
            bpm: bpmEst ? Math.round(bpmEst) : 0,
            beatSync: !!(state.panner && state.panner.beatSync)
        }).catch(() => {});
        meterTimer = setTimeout(meter, METER_MS);
    };
    meter();
}

function stopLoops() {
    if (tickTimer) { clearTimeout(tickTimer); tickTimer = null; }
    if (meterTimer) { clearTimeout(meterTimer); meterTimer = null; }
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function fadeStop() {
    if (fadingOut) return;
    fadingOut = true;
    stopLoops();
    if (state.audio && state.masterGain) {
        const t = state.audio.currentTime;
        holdRamp(state.masterGain.gain, 0, t, 0.045);
        holdRamp(state.fxGain.gain, 0, t, 0.045);
        if (state.bin) { state.bin.active = false; state.bin.update(); }
        if (state.iso) { state.iso.active = false; state.iso.update(); }
        if (state.noise) { state.noise.active = false; state.noise.update(); }
        await sleep(200);
    }
    try {
        if (captureStream) captureStream.getTracks().forEach((tr) => tr.stop());
    } catch (_) { /* ignore */ }
    captureStream = null;
    try { if (audioCtx && audioCtx.state !== 'closed') await audioCtx.close(); } catch (_) { /* ignore */ }
    audioCtx = null;
    source = null;
    analyser = null;
    state.audio = null;
    fadingOut = false;
    chrome.runtime.sendMessage({ type: 'ENGINE_STOPPED' }).catch(() => {});
}

chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' }).catch(() => {});
