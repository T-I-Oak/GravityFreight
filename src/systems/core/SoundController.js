const DEFAULT_SE_VOLUME = 0.5;

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
        const patch = SE_PATCHES[id] || SE_PATCHES.click;
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

        const startTime = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = patch.type;
        oscillator.frequency.setValueAtTime(patch.frequency, startTime);
        oscillator.frequency.exponentialRampToValueAtTime?.(patch.endFrequency, startTime + patch.duration);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(patch.gain * effectiveVolume, startTime + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + patch.duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + patch.duration);
    }

    getSEVolume() {
        return this.seVolume;
    }

    setSEVolume(volume) {
        this.seVolume = this.#clampVolume(volume);
        this.gameDataRepository.setSavedSEVolume({ seVolume: this.seVolume });
    }

    startWarpEffect(fadeInDuration = 0) {
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
        const gainNode = audioContext.createGain();

        source.buffer = buffer;
        source.loop = true;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, startTime);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(this.seVolume * 0.08, startTime + fadeInDuration);

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(startTime);

        this.warpNodes = { source, gainNode };
    }

    stopWarpEffect(fadeOutDuration = 0) {
        if (!this.warpNodes || !this.audioContext) {
            return;
        }

        const stopTime = this.audioContext.currentTime + Math.max(0, fadeOutDuration);
        this.warpNodes.gainNode.gain.linearRampToValueAtTime(0, stopTime);
        this.warpNodes.source.stop(stopTime);
        this.warpNodes = null;
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
