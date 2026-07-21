const DEFAULT_SE_VOLUME = 0.5;
const WARP_AUDIO_FADE_IN_MAX_SECONDS = 0.8;
const WARP_FADE_OUT_MIN_SECONDS = 5.0;
const REVERSE_WARP_FADE_OUT_SECONDS = 6.5;
const WARP_SOURCE_STOP_PADDING_SECONDS = 0.05;
const WARP_FILTER_START_HZ = 100;
const WARP_FILTER_TARGET_HZ = 5000;
const WARP_NOISE_GAIN = 0.04;

const SE_PATCHES = {
    click: {
        frequency: 800,
        endFrequency: 640,
        duration: 0.05,
        gain: 0.18,
        type: 'sine'
    },
    select: {
        frequency: 980,
        endFrequency: 740,
        duration: 0.08,
        gain: 0.16,
        type: 'triangle'
    },
    cashier: {
        frequency: 360,
        endFrequency: 260,
        duration: 0.08,
        gain: 0.08,
        type: 'triangle'
    }
};

class SoundController {
    constructor(gameDataRepository, options = {}) {
        if (!gameDataRepository) {
            throw new Error('[SoundController] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.audioContextFactory = options.audioContextFactory || (() => {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            return AudioContextClass ? new AudioContextClass() : null;
        });
        this.random = options.random || Math.random;
        this.audioContext = null;
        this.warpNodes = null;
        this.seVolume = DEFAULT_SE_VOLUME;
    }

    initialize() {
        const saved = this.gameDataRepository.getSavedSEVolume({
            init: () => ({ seVolume: DEFAULT_SE_VOLUME })
        });
        this.seVolume = this.#clampVolume(saved?.seVolume ?? DEFAULT_SE_VOLUME);
    }

    playSE(id, volume) {
        const effectiveVolume = this.#clampVolume(volume ?? this.seVolume);
        if (effectiveVolume <= 0) {
            return;
        }

        const audioContext = this.#getAudioContext();
        if (!audioContext) {
            return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume?.();
        }

        this.#playById(audioContext, id, effectiveVolume);
    }

    getSEVolume() {
        return this.seVolume;
    }

    setSEVolume(volume) {
        this.seVolume = this.#clampVolume(volume);
        this.gameDataRepository.setSavedSEVolume({ seVolume: this.seVolume });
    }

    startWarpEffect(fadeInDuration = 0, options = {}) {
        const audioContext = this.#getAudioContext();
        if (!audioContext || this.seVolume <= 0 || this.warpNodes) {
            return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume?.();
        }

        const startTime = audioContext.currentTime;
        const durationSeconds = 2;
        const bufferSize = Math.max(1, Math.floor(audioContext.sampleRate * durationSeconds));
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < bufferSize; index += 1) {
            data[index] = this.random() * 2 - 1;
        }

        const source = audioContext.createBufferSource();
        const filter = audioContext.createBiquadFilter();
        const noiseGain = audioContext.createGain();

        source.buffer = buffer;
        source.loop = true;
        const isReverse = options.direction === 'reverse';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(WARP_FILTER_START_HZ, startTime);
        const audioFadeInDuration = Math.min(Math.max(0.2, fadeInDuration), WARP_AUDIO_FADE_IN_MAX_SECONDS);
        const fadeInEndTime = startTime + audioFadeInDuration;
        const sweepEndTime = startTime + Math.max(0.01, audioFadeInDuration * 0.7);
        filter.frequency.exponentialRampToValueAtTime?.(WARP_FILTER_TARGET_HZ, sweepEndTime);
        noiseGain.gain.setValueAtTime(0, startTime);
        noiseGain.gain.linearRampToValueAtTime(this.seVolume * WARP_NOISE_GAIN, fadeInEndTime);

        source.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        source.start(startTime);

        this.warpNodes = { source, filter, gainNodes: [noiseGain], direction: options.direction || 'forward' };
        if (isReverse && fadeInDuration > 0) {
            this.#scheduleWarpStop(fadeInEndTime + REVERSE_WARP_FADE_OUT_SECONDS);
        }
    }

    stopWarpEffect(fadeOutDuration = 0) {
        if (!this.warpNodes || !this.audioContext) {
            return;
        }

        const minimumFadeOut = this.warpNodes.direction === 'reverse'
            ? REVERSE_WARP_FADE_OUT_SECONDS
            : WARP_FADE_OUT_MIN_SECONDS;
        const stopTime = this.audioContext.currentTime + Math.max(minimumFadeOut, fadeOutDuration);
        if (this.warpNodes.scheduledStopTime && this.warpNodes.scheduledStopTime <= stopTime) {
            this.warpNodes = null;
            return;
        }
        this.#scheduleWarpStop(stopTime);
        this.warpNodes = null;
    }

    #scheduleWarpStop(stopTime) {
        if (!this.warpNodes) {
            return;
        }
        this.warpNodes.gainNodes.forEach(gainNode => {
            gainNode.gain.linearRampToValueAtTime(0, stopTime);
        });
        this.warpNodes.filter?.frequency?.exponentialRampToValueAtTime?.(WARP_FILTER_START_HZ, stopTime);
        this.warpNodes.source.stop(stopTime + WARP_SOURCE_STOP_PADDING_SECONDS);
        this.warpNodes.scheduledStopTime = stopTime;
    }

    #playById(audioContext, id, volume) {
        const startTime = audioContext.currentTime;
        if (id === 'flight-return') {
            this.#playTone(audioContext, { frequency: 784, endFrequency: 1046, duration: 0.38, gain: 0.12, type: 'sine' }, volume, startTime);
            this.#playTone(audioContext, { frequency: 1046, endFrequency: 1568, duration: 0.42, gain: 0.1, type: 'sine' }, volume, startTime + 0.08);
            return;
        }
        if (id === 'flight-crash') {
            this.#playTone(audioContext, { frequency: 110, endFrequency: 32, duration: 0.56, gain: 0.22, type: 'triangle' }, volume, startTime);
            this.#playTone(audioContext, { frequency: 58, endFrequency: 28, duration: 0.7, gain: 0.12, type: 'sine' }, volume, startTime + 0.03);
            return;
        }
        if (id === 'flight-lost') {
            this.#playTone(audioContext, { frequency: 180, endFrequency: 55, duration: 0.9, gain: 0.15, type: 'triangle' }, volume, startTime);
            return;
        }
        if (id === 'flight-exit') {
            [130.81, 164.81, 196.00, 261.63].forEach(frequency => {
                this.#playTone(audioContext, { frequency, endFrequency: frequency, duration: 1.0, gain: 0.3, type: 'triangle' }, volume, startTime);
            });
            return;
        }
        if (id === 'stamp') {
            this.#playTone(audioContext, { frequency: 150, endFrequency: 40, duration: 0.45, gain: 0.34, type: 'triangle' }, volume, startTime);
            this.#playTone(audioContext, { frequency: 60, endFrequency: 20, duration: 0.8, gain: 0.26, type: 'sine' }, volume, startTime + 0.01);
            this.#playTone(audioContext, { frequency: 90, endFrequency: 30, duration: 0.42, gain: 0.14, type: 'triangle' }, volume, startTime + 0.03);
            return;
        }

        if (id === 'cashier') {
            this.#playTone(audioContext, { frequency: 150, endFrequency: 68, duration: 0.11, gain: 0.2, type: 'triangle' }, volume, startTime);
            this.#playTone(audioContext, { frequency: 215, endFrequency: 90, duration: 0.1, gain: 0.18, type: 'triangle' }, volume, startTime + 0.075);
            this.#playFilteredNoise(audioContext, {
                duration: 0.18,
                gain: 0.08,
                filterType: 'highpass',
                frequency: 2100
            }, volume, startTime + 0.135);
            return;
        }

        this.#playTone(audioContext, SE_PATCHES[id] || SE_PATCHES.click, volume, startTime);
    }

    #playTone(audioContext, patch, volume, startTime) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = patch.type;
        oscillator.frequency.setValueAtTime(patch.frequency, startTime);
        oscillator.frequency.exponentialRampToValueAtTime?.(patch.endFrequency, startTime + patch.duration);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(patch.gain * volume, startTime + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + patch.duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + patch.duration);
    }

    #playFilteredNoise(audioContext, patch, volume, startTime) {
        const bufferSize = Math.max(1, Math.floor(audioContext.sampleRate * patch.duration));
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < bufferSize; index += 1) {
            data[index] = this.random() * 2 - 1;
        }

        const source = audioContext.createBufferSource();
        const filter = audioContext.createBiquadFilter();
        const gainNode = audioContext.createGain();

        source.buffer = buffer;
        filter.type = patch.filterType;
        filter.frequency.setValueAtTime(patch.frequency, startTime);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(patch.gain * volume, startTime + 0.008);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + patch.duration);

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(startTime);
        source.stop(startTime + patch.duration);
    }

    #getAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = this.audioContextFactory();
            } catch {
                this.audioContext = null;
            }
        }
        return this.audioContext;
    }

    #clampVolume(volume) {
        const value = Number(volume);
        if (!Number.isFinite(value)) {
            return DEFAULT_SE_VOLUME;
        }
        return Math.max(0, Math.min(1, value));
    }
}

export default SoundController;
