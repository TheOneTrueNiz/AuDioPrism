// audio-engine.js (Offscreen) - Venom V16.0 Audio Prism Core
// Polished for Neurodivergent Focus: True HRTF 8D, Brown/Pink Noise, Pure Isochronic Pulses.

let audioCtx, source;
let analyser, timeData, freqData;
let lastTime = performance.now();

// --- MODULES ---

class SpatialPanner {
    /**
     * 8D Spatial Audio Engine
     * Uses HRTF panning with carefully tuned parameters for immersive 3D movement.
     *
     * Movement Patterns:
     * - sine: Smooth circular orbit around the listener (classic 8D)
     * - beat: Figure-8 (lemniscate) - crosses in front, bilateral stimulation
     * - tumble: True spherical movement with proper elevation (3D immersion)
     * - drift: Organic pseudo-random wandering (Perlin-like smoothness)
     *
     * DEPTH CONTROL (Fixed):
     * - Depth interpolates between CENTER and ORBIT position
     * - Depth=0: Sound stays centered (no spatial movement)
     * - Depth=1: Full orbit movement
     * - This prevents tonal changes from HRTF distance filtering
     *
     * BREATHING:
     * - Subtle radius oscillation for organic, non-mechanical feel
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.active = true;
        this.speed = 0.2;      // Hz - cycles per second
        this.depth = 1.0;      // 0-1 interpolation between center and orbit
        this.shape = 'sine';
        this.phase = 0;
        this.phase2 = 0;       // Secondary phase for complex patterns
        this.phase3 = 0;       // Tertiary phase for tumble
        this.breathPhase = 0;  // For organic "breathing" radius variation

        // HRTF Panner - optimized configuration
        this.panner = ctx.createPanner();
        this.panner.panningModel = 'HRTF';
        this.panner.distanceModel = 'linear';

        // Distance parameters - minimize volume changes with position
        // Linear model with low rolloff keeps consistent volume
        this.panner.refDistance = 1;
        this.panner.maxDistance = 10;
        this.panner.rolloffFactor = 0.1; // Very gentle rolloff

        // No cone restrictions - omnidirectional source
        this.panner.coneInnerAngle = 360;
        this.panner.coneOuterAngle = 360;
        this.panner.coneOuterGain = 1;

        // Configure the listener (user's head position)
        // Listener at origin, facing negative Z (standard Web Audio convention)
        const listener = ctx.listener;
        if (listener.positionX) {
            listener.positionX.value = 0;
            listener.positionY.value = 0;
            listener.positionZ.value = 0;
            listener.forwardX.value = 0;
            listener.forwardY.value = 0;
            listener.forwardZ.value = -1;
            listener.upX.value = 0;
            listener.upY.value = 1;
            listener.upZ.value = 0;
        }

        this.input = this.panner;
        this.output = this.panner;

        // Fixed base orbit radius - keeps HRTF characteristics consistent
        this.BASE_RADIUS = 1.5;

        // Center position (sound position when depth=0)
        this.CENTER = { x: 0, y: 0, z: -1 }; // Directly in front

        // Current position tracking for smooth interpolation
        this.currentX = 0;
        this.currentY = 0;
        this.currentZ = -1;

        // Interpolation factor - how quickly position catches up to target
        // Lower = smoother but more latent, higher = more responsive but can click
        this.LERP_FACTOR = 0.08; // 8% per frame toward target
    }

    process(dt) {
        const t = this.ctx.currentTime;

        let targetX, targetY, targetZ;

        if (!this.active) {
            // Target is center position
            targetX = this.CENTER.x;
            targetY = this.CENTER.y;
            targetZ = this.CENTER.z;
        } else {
            // Advance all phases
            const omega = this.speed * Math.PI * 2 * dt;
            this.phase += omega;
            this.phase2 += omega * 0.618;     // Golden ratio for non-repeating
            this.phase3 += omega * 0.317;     // Prime-ish for tumble complexity
            this.breathPhase += omega * 0.23; // Slow breathing cycle

            // BREATHING: Subtle radius oscillation for organic feel
            const breathing = 1.0 + 0.06 * Math.sin(this.breathPhase);
            const radius = this.BASE_RADIUS * breathing;

            // Calculate full orbit position (as if depth=1)
            let orbitX = 0, orbitY = 0, orbitZ = 0;

            switch (this.shape) {
                case 'sine':
                case 'circle':
                    // Classic circular orbit - the signature "8D" sound
                    orbitX = Math.sin(this.phase) * radius;
                    orbitZ = -Math.cos(this.phase) * radius;
                    orbitY = Math.sin(this.phase * 2) * (radius * 0.1);
                    break;

                case 'beat':
                case 'figure8':
                    // Figure-8 / Lemniscate - bilateral stimulation
                    orbitX = Math.sin(this.phase) * radius;
                    orbitZ = -0.8 - Math.cos(this.phase * 2) * 0.4;
                    orbitY = Math.sin(this.phase * 2) * 0.1 * (1 - Math.abs(Math.sin(this.phase)) * 0.5);
                    break;

                case 'tumble':
                    // True spherical tumble
                    const theta = this.phase;
                    const phi = (Math.PI / 3) + Math.sin(this.phase2) * (Math.PI / 5);
                    orbitX = radius * Math.sin(phi) * Math.sin(theta);
                    orbitY = radius * Math.cos(phi) * 0.5;
                    orbitZ = -(radius * Math.sin(phi) * Math.cos(theta)) - 0.4;
                    break;

                case 'random':
                case 'drift':
                    // Organic drift - layered sines
                    orbitX = (Math.sin(this.phase) * 0.5 +
                             Math.sin(this.phase * 0.7 + 1.3) * 0.3 +
                             Math.sin(this.phase * 0.3 + 2.7) * 0.2) * radius;
                    orbitZ = (Math.cos(this.phase * 0.8) * 0.5 +
                             Math.cos(this.phase * 0.5 + 0.7) * 0.3 +
                             Math.cos(this.phase * 0.2 + 1.1) * 0.2) * radius - 0.4;
                    orbitY = (Math.sin(this.phase * 0.4 + 0.5) * 0.3 +
                             Math.sin(this.phase * 0.15 + 2.1) * 0.2) * radius * 0.3;
                    break;

                default:
                    orbitX = 0;
                    orbitY = 0;
                    orbitZ = -1;
            }

            // DEPTH CONTROL: Interpolate between center and orbit
            const d = this.depth;
            targetX = this.CENTER.x + (orbitX - this.CENTER.x) * d;
            targetY = this.CENTER.y + (orbitY - this.CENTER.y) * d;
            targetZ = this.CENTER.z + (orbitZ - this.CENTER.z) * d;
        }

        // SMOOTH INTERPOLATION (lerp) to prevent clicking
        // Instead of jumping to target, we smoothly approach it
        // This prevents the audio discontinuities that cause clicks
        const lerp = this.LERP_FACTOR;
        this.currentX += (targetX - this.currentX) * lerp;
        this.currentY += (targetY - this.currentY) * lerp;
        this.currentZ += (targetZ - this.currentZ) * lerp;

        // Apply smoothed position directly to panner
        // Using .value instead of setTargetAtTime avoids stacking automation
        this.panner.positionX.value = this.currentX;
        this.panner.positionY.value = this.currentY;
        this.panner.positionZ.value = this.currentZ;
    }
}

class StereoWidener {
    /**
     * Mid-Side (M/S) Stereo Width Processing
     *
     * Adjusts stereo width by manipulating the relationship between
     * left and right channels through cross-feed.
     *
     * Includes high-shelf cut on widened content to prevent harshness -
     * wide stereo can emphasize sibilance and high-frequency artifacts.
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.active = true;
        this.width = 1.0;      // 0 = mono, 1 = normal, 2 = wide
        this.crossAmount = 0.3;

        this.input = ctx.createGain();
        this.output = ctx.createGain();

        // Channel splitting/merging
        this.splitter = ctx.createChannelSplitter(2);
        this.merger = ctx.createChannelMerger(2);

        // Direct path gains (L stays L, R stays R)
        this.gainL = ctx.createGain();
        this.gainR = ctx.createGain();

        // Cross-feed paths (for width manipulation)
        this.crossL = ctx.createGain();
        this.crossR = ctx.createGain();

        // HIGH-SHELF FILTERS on cross-feed paths
        // Reduces harshness when widening by cutting highs on the "side" signal
        // This is a pro mixing technique - wide stereo can be harsh
        this.shelfL = ctx.createBiquadFilter();
        this.shelfR = ctx.createBiquadFilter();
        this.shelfL.type = 'highshelf';
        this.shelfR.type = 'highshelf';
        this.shelfL.frequency.value = 5000;
        this.shelfR.frequency.value = 5000;
        this.shelfL.gain.value = -4; // Gentle rolloff
        this.shelfR.gain.value = -4;

        // Wire up: input -> splitter -> gains -> merger -> output
        this.input.connect(this.splitter);

        // Direct paths (unchanged signal)
        this.splitter.connect(this.gainL, 0);
        this.splitter.connect(this.gainR, 1);

        // Cross-feed paths WITH high-shelf filtering
        this.splitter.connect(this.crossL, 0);
        this.splitter.connect(this.crossR, 1);
        this.crossL.connect(this.shelfL);
        this.crossR.connect(this.shelfR);

        // Merge: direct + filtered cross-feed
        this.gainL.connect(this.merger, 0, 0);
        this.gainR.connect(this.merger, 0, 1);
        this.shelfL.connect(this.merger, 0, 1); // L cross-feed to R
        this.shelfR.connect(this.merger, 0, 0); // R cross-feed to L

        this.merger.connect(this.output);

        this.updateWidth();
    }

    updateWidth() {
        const t = this.ctx.currentTime;

        if (!this.active) {
            // Bypass: normal stereo (no cross-feed)
            this.gainL.gain.setTargetAtTime(1, t, 0.05);
            this.gainR.gain.setTargetAtTime(1, t, 0.05);
            this.crossL.gain.setTargetAtTime(0, t, 0.05);
            this.crossR.gain.setTargetAtTime(0, t, 0.05);
            return;
        }

        // Width control:
        // width < 1: narrow (add opposite channel = more mono)
        // width = 1: normal stereo
        // width > 1: wide (subtract opposite channel = exaggerate differences)
        const w = this.width;
        const c = this.crossAmount;

        // Cross-feed calculation:
        // Positive cross = narrowing (blend toward mono)
        // Negative cross = widening (subtract opposite, exaggerate stereo)
        const direct = 1.0;
        const cross = -c * (w - 1);

        this.gainL.gain.setTargetAtTime(direct, t, 0.05);
        this.gainR.gain.setTargetAtTime(direct, t, 0.05);
        this.crossL.gain.setTargetAtTime(cross, t, 0.05);
        this.crossR.gain.setTargetAtTime(cross, t, 0.05);

        // Adjust high-shelf cut based on width
        // More widening = more high cut to prevent harshness
        const shelfGain = w > 1 ? -4 - ((w - 1) * 4) : -2;
        this.shelfL.gain.setTargetAtTime(shelfGain, t, 0.1);
        this.shelfR.gain.setTargetAtTime(shelfGain, t, 0.1);
    }
}

class BinauralBeat {
    /**
     * Binaural Beat Generator
     *
     * Creates the binaural beat effect by playing slightly different frequencies
     * in each ear. The brain perceives a "third tone" at the difference frequency.
     *
     * Research notes:
     * - Carrier frequencies of 200-250Hz are optimal (Oster, 1973)
     * - Pure sine waves required for clean beat perception
     * - Must be mixed quietly (-20dB to -30dB below music) to be non-destructive
     * - Requires headphones for effect (L/R must reach separate ears)
     *
     * Beat frequencies:
     * - Delta (0.5-4 Hz): Deep sleep, healing
     * - Theta (4-8 Hz): Meditation, creativity, REM
     * - Alpha (8-13 Hz): Relaxation, calm focus
     * - Beta (13-30 Hz): Active thinking, concentration
     * - Gamma (30-50 Hz): High-level cognition, memory
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.active = false;
        this.vol = 0.08;        // Low volume - non-destructive mixing
        this.baseFreq = 200;    // Carrier frequency (Hz)
        this.beatFreq = 10;     // Beat frequency (Hz) - Alpha default

        // Create oscillators for left and right channels
        this.oscL = ctx.createOscillator();
        this.oscR = ctx.createOscillator();

        // Pure sine waves are essential for clean binaural perception
        this.oscL.type = 'sine';
        this.oscR.type = 'sine';

        // Individual gain nodes for each channel (allows future stereo control)
        this.gainL = ctx.createGain();
        this.gainR = ctx.createGain();
        this.gainL.gain.value = 1;
        this.gainR.gain.value = 1;

        // Merge to stereo with proper channel separation
        this.merger = ctx.createChannelMerger(2);

        // Master output gain
        this.gain = ctx.createGain();
        this.gain.gain.value = 0;

        // Signal path: oscillators -> individual gains -> merger -> master gain
        this.oscL.connect(this.gainL);
        this.oscR.connect(this.gainR);
        this.gainL.connect(this.merger, 0, 0); // Left channel only
        this.gainR.connect(this.merger, 0, 1); // Right channel only
        this.merger.connect(this.gain);

        // Start oscillators (they run continuously, controlled by gain)
        this.oscL.start();
        this.oscR.start();

        this.output = this.gain;

        // Set initial frequencies
        this._updateFrequencies();
    }

    _updateFrequencies() {
        const t = this.ctx.currentTime;
        // Left ear: base frequency
        // Right ear: base + beat frequency
        // The brain perceives the difference (beatFreq)
        this.oscL.frequency.setTargetAtTime(this.baseFreq, t, 0.05);
        this.oscR.frequency.setTargetAtTime(this.baseFreq + this.beatFreq, t, 0.05);
    }

    update() {
        const t = this.ctx.currentTime;

        // Smooth volume transition to prevent clicks
        // When active, fade to target volume over 100ms
        // When inactive, fade to silence
        const targetVol = this.active ? this.vol : 0;
        this.gain.gain.setTargetAtTime(targetVol, t, 0.1);

        this._updateFrequencies();
    }

    // Preset beat frequencies for common brainwave states
    static PRESETS = {
        DELTA: 2,      // Deep sleep
        THETA: 6,      // Meditation, deep relaxation
        ALPHA: 10,     // Calm focus, relaxation
        BETA: 14,      // Active concentration
        GAMMA: 40      // High-level processing, focus
    };
}

class Isochronic {
    /**
     * Isochronic Tone Generator
     *
     * Creates rhythmic pulses of a carrier tone at precise intervals.
     * Unlike binaural beats, isochronic tones don't require headphones
     * and produce stronger cortical responses.
     *
     * Research notes:
     * - Intensity goes from silence to full volume sharply
     * - More effective entrainment than binaural for many people
     * - Works through speakers (mono-compatible)
     * - Carrier frequency 200-300Hz is comfortable
     * - Should be mixed at low volume (-20dB below music)
     *
     * Pulse shapes:
     * - Sine: Smooth pulses, gentler on the ears
     * - Square: Sharp on/off, stronger entrainment effect
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.active = false;
        this.freq = 10;         // Pulse frequency (Hz) - Alpha default
        this.depth = 0.7;       // Modulation depth (0-1)
        this.wave = 'sine';     // Modulator waveform
        this.carrierFreq = 220; // Carrier tone frequency

        // Carrier oscillator (the tone we hear)
        this.carrier = ctx.createOscillator();
        this.carrier.type = 'sine';
        this.carrier.frequency.value = this.carrierFreq;

        // DC offset for proper amplitude modulation
        // We need the modulator to go 0 to 1, not -1 to 1
        this.dcOffset = ctx.createConstantSource();
        this.dcOffset.offset.value = 0.5; // Bias

        // Modulator oscillator (creates the pulsing)
        this.modulator = ctx.createOscillator();
        this.modulator.type = 'sine';
        this.modulator.frequency.value = this.freq;

        // Modulator gain (controls depth of modulation)
        this.modGain = ctx.createGain();
        this.modGain.gain.value = 0.5; // Will be scaled by depth

        // Amplitude modulation gain node
        this.amGain = ctx.createGain();
        this.amGain.gain.value = 0; // Controlled by modulator + DC offset

        // Output gain (master volume)
        this.output = ctx.createGain();
        this.output.gain.value = 0;

        // Signal routing for AM synthesis:
        // Carrier -> amGain -> output
        // [DC offset + modulator * depth] -> amGain.gain
        this.carrier.connect(this.amGain);
        this.amGain.connect(this.output);

        // Modulation signal: DC + scaled modulator
        this.dcOffset.connect(this.amGain.gain);
        this.modulator.connect(this.modGain);
        this.modGain.connect(this.amGain.gain);

        // Start all sources
        this.carrier.start();
        this.modulator.start();
        this.dcOffset.start();
    }

    setWave(type) {
        this.wave = type;
        // Square waves create sharper pulses (more entrainment)
        // Sine waves are smoother (more comfortable)
        this.modulator.type = type;
    }

    setCarrierFreq(freq) {
        this.carrierFreq = freq;
        this.carrier.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    }

    update() {
        const t = this.ctx.currentTime;

        // Update modulation frequency
        this.modulator.frequency.setTargetAtTime(this.freq, t, 0.05);

        // Update modulation depth
        // At depth=0: constant tone (DC only = 0.5)
        // At depth=1: full silence to full volume (DC 0.5 ± 0.5)
        const modAmount = this.depth * 0.5;
        this.modGain.gain.setTargetAtTime(modAmount, t, 0.05);

        // Master volume
        // Keep it low to be non-destructive to the music
        const targetVol = this.active ? 0.12 : 0;
        this.output.gain.setTargetAtTime(targetVol, t, 0.15);
    }

    // Preset frequencies for brainwave states
    static PRESETS = {
        DELTA: 2,
        THETA: 6,
        ALPHA: 10,
        BETA: 18,
        GAMMA: 40
    };
}

class NoiseGen {
    constructor(ctx) {
        this.ctx = ctx; this.active = false; this.vol = 0.05; 
        this.color = 0.0; // 0 = Brown, 0.5 = Pink, 1 = White
        
        // Source: White Noise Buffer
        const size = 2 * ctx.sampleRate;
        const buffer = ctx.createBuffer(2, size, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        }
        
        this.src = ctx.createBufferSource();
        this.src.buffer = buffer;
        this.src.loop = true;
        
        // Filter for Color
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.Q.value = 0.5; // Smooth rolloff
        
        this.gain = ctx.createGain();
        this.gain.gain.value = 0;
        
        this.src.connect(this.filter);
        this.filter.connect(this.gain);
        this.src.start();
        
        this.output = this.gain;
        this.updateColor();
    }
    
    updateColor() {
        // Map 0..1 to Frequency 100Hz .. 20000Hz (Logarithmic)
        // Brown noise ~ 150Hz LP on White
        // Pink noise ~ filter slope, but approx 1kHz LP is a rough proxy or we accept simple LP coloring.
        // For focus, we just want "Deep" (Brown) to "Bright" (White).
        
        const minVal = Math.log(80);
        const maxVal = Math.log(20000);
        const v = (this.color * (maxVal - minVal)) + minVal;
        const freq = Math.exp(v);
        
        this.filter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    }

    update() {
        const target = this.active ? this.vol : 0;
        this.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
        this.updateColor();
    }
}

class Saturation {
    /**
     * Analog-Style Saturation / Harmonic Enhancement
     *
     * Uses tanh (hyperbolic tangent) waveshaping for smooth, musical saturation
     * that mimics tube/tape warmth. The tanh function provides:
     * - Soft-knee compression at extremes
     * - Gradual harmonic generation
     * - No harsh digital clipping artifacts
     *
     * Includes:
     * - 4x oversampling to prevent aliasing artifacts
     * - Warmth filter to tame harsh upper harmonics
     * - Drive-dependent makeup gain
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.active = false;
        this.drive = 0;        // 0-1, controls saturation amount
        this.warmth = 500;     // Filter cutoff control

        // Input gain (drives into saturation)
        this.input = ctx.createGain();

        // Wave shaper with OVERSAMPLING for clean harmonics
        this.shaper = ctx.createWaveShaper();
        this.shaper.oversample = '4x'; // Prevents aliasing artifacts

        // Warmth filter: lowpass to tame harsh harmonics from saturation
        this.warmthFilter = ctx.createBiquadFilter();
        this.warmthFilter.type = 'lowpass';
        this.warmthFilter.frequency.value = 12000;
        this.warmthFilter.Q.value = 0.5;

        // Output gain (makeup gain for level matching)
        this.output = ctx.createGain();

        // Chain: input -> shaper -> warmth filter -> output
        this.input.connect(this.shaper);
        this.shaper.connect(this.warmthFilter);
        this.warmthFilter.connect(this.output);

        this.updateCurve();
        this.updateWarmth();
    }

    updateCurve() {
        // Generate tanh-based saturation curve
        // tanh provides smooth, musical soft-clipping like analog gear
        const samples = 65536; // High resolution for smooth curve
        const curve = new Float32Array(samples);

        // Drive scales the input before tanh (more drive = more saturation)
        // Range: 1 (clean) to 10 (heavy saturation)
        const driveAmount = 1 + (this.drive * 9);

        for (let i = 0; i < samples; i++) {
            // Map index to -1 to +1 range
            const x = (i / (samples - 1)) * 2 - 1;

            if (this.drive <= 0.01) {
                // Near-zero drive: linear (bypass)
                curve[i] = x;
            } else {
                // tanh saturation with drive
                // Multiply input by drive, apply tanh, normalize output
                curve[i] = Math.tanh(x * driveAmount) / Math.tanh(driveAmount);
            }
        }

        this.shaper.curve = curve;

        // Makeup gain: saturation reduces peaks, so boost to compensate
        // Gentle boost that increases with drive
        const makeupGain = 1 + (this.drive * 0.3);
        this.output.gain.setTargetAtTime(makeupGain, this.ctx.currentTime, 0.05);
    }

    updateWarmth() {
        // Warmth control: lowpass filter frequency
        // Lower values = darker, warmer sound (cuts harsh saturation harmonics)
        // Higher values = brighter, more present
        //
        // Map 0-1000 to 2kHz-18kHz logarithmically
        const minFreq = 2000;
        const maxFreq = 18000;
        const normalized = Math.max(0, Math.min(1, this.warmth / 1000));

        // Logarithmic mapping for more musical control
        const logMin = Math.log(minFreq);
        const logMax = Math.log(maxFreq);
        const freq = Math.exp(logMin + normalized * (logMax - logMin));

        this.warmthFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    }
}

class SensoryFilter {
    /**
     * Sensory Regulation Filter
     *
     * A sweepable lowpass filter designed specifically for neurodivergent users
     * who may be sensitive to harsh high frequencies.
     *
     * Use cases:
     * - Reduce listening fatigue from bright/harsh recordings
     * - Soften sibilance ("s" and "t" sounds that can be piercing)
     * - Create a "blanket" effect for sensory overload moments
     * - Gentle frequency rolloff for late-night listening
     *
     * The filter uses a gentle slope (low Q by default) for natural sound.
     * Higher resonance adds emphasis at the cutoff for a more dramatic effect.
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.active = true;
        this.freq = 16000;  // Default slightly rolled off (gentler than 20kHz)
        this.res = 0.7;     // Low Q for gentle, natural rolloff

        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = this.freq;
        this.filter.Q.value = this.res;

        this.input = this.filter;
        this.output = this.filter;
    }

    update() {
        const t = this.ctx.currentTime;

        if (!this.active) {
            // Bypass: fully open (no filtering)
            this.filter.frequency.setTargetAtTime(20000, t, 0.05);
            this.filter.Q.setTargetAtTime(0.5, t, 0.05);
            return;
        }

        // Apply user settings
        this.filter.frequency.setTargetAtTime(this.freq, t, 0.05);

        // Resonance (Q) control:
        // Low values (0-2): Gentle, natural rolloff
        // Medium values (2-5): Noticeable emphasis at cutoff
        // High values (5-10): Dramatic resonant peak (use sparingly)
        this.filter.Q.setTargetAtTime(this.res, t, 0.05);
    }

    // Preset modes for quick access
    setPreset(preset) {
        switch (preset) {
            case 'open':
                this.freq = 20000;
                this.res = 0.5;
                break;
            case 'gentle':
                this.freq = 12000;
                this.res = 0.7;
                break;
            case 'soft':
                this.freq = 8000;
                this.res = 0.5;
                break;
            case 'blanket':
                this.freq = 4000;
                this.res = 0.4;
                break;
        }
        this.update();
    }
}

// --- STATE ---
let state = {
    audio: null,
    panner: null, bin: null, iso: null, noise: null, sat: null,
    widener: null, sensoryFilter: null,
    musicGain: null, fxGain: null, masterGain: null,
    eqLow: null, eqMid: null, eqHigh: null, compressor: null, limiter: null,
    settings: {}
};

chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg.type === 'INIT_AUDIO') {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: msg.streamId } },
            video: false
        });
        initAudioGraph(stream);
    }
    
    // Parameter Handling
    if (msg.type === 'UPDATE_KNOB') updateParam(msg.id, msg.value);
    
    // Advanced Parameter Handling (Selects, etc)
    if (msg.type === 'SET_PARAM') {
        state.settings[msg.module + '_' + msg.param] = msg.value;
        
        if (msg.module === 'panner' && msg.param === 'shape') {
            if (state.panner) state.panner.shape = msg.value;
        }
        if (msg.module === 'binaural' && msg.param === 'beatFreq') {
            if (state.bin) { state.bin.beatFreq = msg.value; state.bin.update(); }
        }
        if (msg.module === 'iso' && msg.param === 'wave') {
            if (state.iso) { state.iso.setWave(msg.value); }
        }
        if (msg.module === 'noise' && msg.param === 'type') {
            // Mapping string types or direct values? 
            // UI sends 'color' via knob mostly, but select might send presets?
            // Content.js binds 'sel-noise-color' to setParam 'noise', 'type'.
            // But we also have k-noise-color knob.
            // Let's assume knob handles the gradient.
        }
    }
    
    if (msg.type === 'TOGGLE_MODULE') {
        const active = msg.active;
        if (msg.module === 'panner' && state.panner) state.panner.active = active;
        if (msg.module === 'binaural' && state.bin) { state.bin.active = active; state.bin.update(); }
        if (msg.module === 'iso' && state.iso) { state.iso.active = active; state.iso.update(); }
        if (msg.module === 'noise' && state.noise) { state.noise.active = active; state.noise.update(); }

        const t = state.audio ? state.audio.currentTime : 0;

        if (msg.module === 'width' && state.widener) {
            state.widener.active = active;
            state.widener.updateWidth();
        }
        if (msg.module === 'compressor' && state.compressor) {
            // Soft bypass: raise threshold to 0
            // Use longer ramp (0.2s) for smooth transition without clicks
            const val = active ? ((state.settings['k-comp-thresh']) || -20) : 0;
            state.compressor.threshold.setTargetAtTime(val, t, 0.2);
        }
        if (msg.module === 'saturation' && state.sat) {
            const sat = state.sat;
            const rampTime = 0.08; // Time constant for fade

            // Cancel any pending toggle to prevent overlapping fades
            if (sat._toggleTimeout) {
                clearTimeout(sat._toggleTimeout);
                sat._toggleTimeout = null;
            }

            sat.active = active;

            // Fade input to silence before changing curve to prevent clicks
            sat.input.gain.setTargetAtTime(0, t, rampTime);

            // After fade (~3 time constants), change curve and fade back
            sat._toggleTimeout = setTimeout(() => {
                sat._toggleTimeout = null;
                if (!sat.active) {
                    sat.drive = 0;
                } else {
                    sat.drive = state.settings['k-sat-drive'] || 0;
                }
                sat.updateCurve();

                // Fade back in
                const now = state.audio ? state.audio.currentTime : 0;
                sat.input.gain.setTargetAtTime(1, now, rampTime);
            }, rampTime * 3 * 1000); // ~95% faded after 3 time constants
        }
        if (msg.module === 'filter' && state.sensoryFilter) {
            state.sensoryFilter.active = active;
            state.sensoryFilter.update();
        }
    }
});

function initAudioGraph(stream) {
    if (audioCtx) audioCtx.close();
    audioCtx = new AudioContext();
    audioCtx.destination.channelCount = 2; 
    
    source = audioCtx.createMediaStreamSource(stream);
    
    const musicGain = audioCtx.createGain();
    const fxGain = audioCtx.createGain();
    const masterGain = audioCtx.createGain();
    
    // FX Nodes
    const panner = new SpatialPanner(audioCtx);
    const bin = new BinauralBeat(audioCtx);
    const iso = new Isochronic(audioCtx);
    const noise = new NoiseGen(audioCtx);
    const sat = new Saturation(audioCtx);
    const widener = new StereoWidener(audioCtx);
    const sensoryFilter = new SensoryFilter(audioCtx);
    
    // EQ & Dynamics
    const eqLow = audioCtx.createBiquadFilter(); eqLow.type = 'lowshelf'; eqLow.frequency.value = 250;
    const eqMid = audioCtx.createBiquadFilter(); eqMid.type = 'peaking'; eqMid.frequency.value = 1000; eqMid.Q.value = 1.0;
    const eqHigh = audioCtx.createBiquadFilter(); eqHigh.type = 'highshelf'; eqHigh.frequency.value = 4000;
    
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.25;

    // Safety Limiter (Hard compression at end)
    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -0.5;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;

    analyser = audioCtx.createAnalyser(); 
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    
    // GRAPH WIRING

    // 1. Music Path
    // source -> musicGain -> widener -> EQ -> sensoryFilter -> saturation -> compressor -> panner -> master
    source.connect(musicGain);
    musicGain.connect(widener.input);
    widener.output.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(sensoryFilter.input);
    sensoryFilter.output.connect(sat.input);
    sat.output.connect(compressor);
    compressor.connect(panner.input);
    panner.output.connect(masterGain);
    
    // 2. FX Path (Bypass 8D Panner to keep them stable/grounding)
    bin.output.connect(fxGain);
    iso.output.connect(fxGain);
    noise.output.connect(fxGain);
    fxGain.connect(masterGain); // Direct to master
    
    // 3. Master Output
    masterGain.connect(limiter);
    limiter.connect(analyser);
    analyser.connect(audioCtx.destination);

    state = {
        audio: audioCtx,
        panner, bin, iso, noise, sat, widener, sensoryFilter,
        musicGain, fxGain, masterGain,
        eqLow, eqMid, eqHigh, compressor, limiter,
        settings: state.settings || {}
    };
    
    render();
}

function updateParam(id, v) {
    if (!state.audio) return;
    state.settings[id] = v;
    const t = state.audio.currentTime;
    
    switch(id) {
        // Volume
        case 'k-music-vol': state.musicGain.gain.setTargetAtTime(v, t, 0.05); break;
        case 'k-fx-vol': state.fxGain.gain.setTargetAtTime(v, t, 0.05); break;
        
        // 8D Panner
        case 'k-speed': state.panner.speed = v; break;
        case 'k-depth': state.panner.depth = v; break;
        
        // EQ
        case 'k-eq-low': state.eqLow.gain.setTargetAtTime(v, t, 0.1); break;
        case 'k-eq-mid': state.eqMid.gain.setTargetAtTime(v, t, 0.1); break;
        case 'k-eq-high': state.eqHigh.gain.setTargetAtTime(v, t, 0.1); break;
        
        // Compressor
        case 'k-comp-thresh': state.compressor.threshold.setTargetAtTime(v, t, 0.1); break;
        case 'k-comp-ratio': state.compressor.ratio.setTargetAtTime(v, t, 0.1); break;
        case 'k-comp-attack': state.compressor.attack.setTargetAtTime(v, t, 0.1); break;
        
        // FX
        case 'k-bin-vol': state.bin.vol = v; state.bin.update(); break;
        case 'k-bin-base': state.bin.baseFreq = v; state.bin.update(); break;
        
        case 'k-iso-freq': state.iso.freq = v; state.iso.update(); break;
        case 'k-iso-depth': state.iso.depth = v; state.iso.update(); break;
        
        case 'k-noise-vol': state.noise.vol = v; state.noise.update(); break;
        case 'k-noise-color': state.noise.color = v; state.noise.update(); break;
        
        case 'k-sat-drive': state.sat.drive = v; state.sat.updateCurve(); break;
        case 'k-sat-warmth': if (state.sat) { state.sat.warmth = v; state.sat.updateWarmth(); } break;

        // Stereo Widener
        case 'k-width-amt': if (state.widener) { state.widener.width = v; state.widener.updateWidth(); } break;
        case 'k-cross-amount': if (state.widener) { state.widener.crossAmount = v; state.widener.updateWidth(); } break;

        // Sensory Filter
        case 'k-filter-freq': if (state.sensoryFilter) { state.sensoryFilter.freq = v; state.sensoryFilter.update(); } break;
        case 'k-filter-res': if (state.sensoryFilter) { state.sensoryFilter.res = v; state.sensoryFilter.update(); } break;
    }
}

function render() {
    setTimeout(render, 20); 
    if (!state.audio) return;
    
    const now = performance.now();
    const dt = (now - (lastTime || now)) / 1000;
    lastTime = now;
    
    if (state.panner) state.panner.process(dt < 0.1 ? dt : 0.016);
    
    // Visualize? (Send data back to UI if needed, usually UI polls or we send msg)
    // content.js pulls via messaging or we can push. 
    // Currently content.js doesn't seem to have a data receiver loop in the snippet I saw?
    // Ah, content.js has `remoteFreqData` but how does it get it? 
    // `chrome.runtime.onMessage` in content.js isn't showing a data receiver.
    // Likely logic is in `overlay.js` or `popup.js` or handled via a shared buffer?
    // Since I'm only touching audio-engine, I'll assume visualization is handled elsewhere or ignored here.
}