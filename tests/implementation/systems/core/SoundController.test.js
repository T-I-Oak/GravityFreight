import { describe, expect, it, vi } from 'vitest';
import SoundController from '../../../../src/systems/core/SoundController.js';

function createGain() {
    return {
        connect: vi.fn(),
        gain: {
            value: 0,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            setTargetAtTime: vi.fn()
        }
    };
}

function createAudioContext() {
    const buffer = {
        getChannelData: vi.fn(() => new Float32Array(16))
    };
    return {
        state: 'suspended',
        currentTime: 1,
        sampleRate: 16,
        destination: {},
        resume: vi.fn(),
        createGain: vi.fn(() => createGain()),
        createBuffer: vi.fn(() => buffer),
        createBufferSource: vi.fn(() => ({
            buffer: null,
            loop: false,
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn()
        })),
        createBiquadFilter: vi.fn(() => ({
            type: '',
            connect: vi.fn(),
            frequency: {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn()
            }
        })),
        createOscillator: vi.fn(() => ({
            type: '',
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            frequency: {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn()
            }
        }))
    };
}

function createRepository(saved = { seVolume: 0.25 }) {
    return {
        getSavedSEVolume: vi.fn(migrationMap => saved ?? migrationMap.init()),
        setSavedSEVolume: vi.fn()
    };
}

describe('SoundController', () => {
    it('initializes SE volume from GameDataRepository', () => {
        const repository = createRepository({ seVolume: 0.25 });
        const controller = new SoundController(repository, { audioContextFactory: createAudioContext });

        controller.initialize();

        expect(repository.getSavedSEVolume).toHaveBeenCalledWith(expect.objectContaining({
            init: expect.any(Function)
        }));
        expect(controller.getSEVolume()).toBe(0.25);
    });

    it('persists clamped SE volume through GameDataRepository', () => {
        const repository = createRepository({ seVolume: 0.5 });
        const controller = new SoundController(repository, { audioContextFactory: createAudioContext });

        controller.initialize();
        controller.setSEVolume(1.5);

        expect(controller.getSEVolume()).toBe(1);
        expect(repository.setSavedSEVolume).toHaveBeenCalledWith({ seVolume: 1 });
    });

    it('plays click, select, cashier, and flight end SE with generated Web Audio tones', () => {
        const audioContext = createAudioContext();
        const repository = createRepository({ seVolume: 0.5 });
        const controller = new SoundController(repository, { audioContextFactory: () => audioContext });

        controller.initialize();
        controller.playSE('click');
        controller.playSE('select', 0.2);
        controller.playSE('cashier');
        controller.playSE('flight-return');
        controller.playSE('flight-crash');
        controller.playSE('flight-lost');
        controller.playSE('flight-exit');
        controller.playSE('stamp');

        expect(audioContext.resume).toHaveBeenCalled();
        expect(audioContext.createOscillator).toHaveBeenCalledTimes(16);
        expect(audioContext.createGain).toHaveBeenCalledTimes(17);
        expect(audioContext.createBufferSource).toHaveBeenCalledTimes(1);
        expect(audioContext.createBiquadFilter).toHaveBeenCalledTimes(1);
    });

    it('uses two low clacks and metallic filtered noise for cashier SE', () => {
        const audioContext = createAudioContext();
        const repository = createRepository({ seVolume: 0.5 });
        const controller = new SoundController(repository, { audioContextFactory: () => audioContext });

        controller.initialize();
        controller.playSE('cashier');

        const oscillators = audioContext.createOscillator.mock.results.map(result => result.value);
        expect(oscillators).toHaveLength(2);
        expect(oscillators.map(oscillator => oscillator.type)).toEqual(['triangle', 'triangle']);
        expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(150, 1);
        expect(oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(215, 1.075);
        const toneGains = audioContext.createGain.mock.results.slice(0, 2).map(result => result.value);
        expect(toneGains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.1, 1.005);
        expect(toneGains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.09, 1.0799999999999998);

        const noiseSource = audioContext.createBufferSource.mock.results[0].value;
        const noiseFilter = audioContext.createBiquadFilter.mock.results[0].value;
        const noiseGain = audioContext.createGain.mock.results[2].value;
        expect(noiseSource.start).toHaveBeenCalledWith(1.135);
        expect(noiseSource.stop.mock.calls[0][0]).toBeCloseTo(1.315);
        expect(noiseGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.04, 1.143);
        expect(noiseFilter.type).toBe('highpass');
        expect(noiseFilter.frequency.setValueAtTime).toHaveBeenCalledWith(2100, 1.135);
    });

    it('keeps stamp SE on low impact tones without a high square hit', () => {
        const audioContext = createAudioContext();
        const repository = createRepository({ seVolume: 0.5 });
        const controller = new SoundController(repository, { audioContextFactory: () => audioContext });

        controller.initialize();
        controller.playSE('stamp');

        const oscillators = audioContext.createOscillator.mock.results.map(result => result.value);
        expect(oscillators).toHaveLength(3);
        expect(oscillators.map(oscillator => oscillator.type)).toEqual(['triangle', 'sine', 'triangle']);
        expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(150, 1);
        expect(oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(60, 1.01);
        expect(oscillators[2].frequency.setValueAtTime).toHaveBeenCalledWith(90, 1.03);
    });

    it('does not play when effective volume is zero', () => {
        const audioContext = createAudioContext();
        const repository = createRepository({ seVolume: 0 });
        const controller = new SoundController(repository, { audioContextFactory: () => audioContext });

        controller.initialize();
        controller.playSE('click');

        expect(audioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('starts and stops generated warp ambience', () => {
        const audioContext = createAudioContext();
        const repository = createRepository({ seVolume: 0.5 });
        const controller = new SoundController(repository, { audioContextFactory: () => audioContext });

        controller.initialize();
        controller.startWarpEffect(0.2);
        controller.stopWarpEffect(0.4);

        expect(audioContext.createBufferSource).toHaveBeenCalledTimes(1);
        expect(audioContext.createBuffer).toHaveBeenCalledWith(1, 32, 16);
        expect(audioContext.createBiquadFilter).toHaveBeenCalledTimes(1);
        expect(audioContext.createOscillator).not.toHaveBeenCalled();
        expect(audioContext.createGain).toHaveBeenCalledTimes(1);
        const source = audioContext.createBufferSource.mock.results[0].value;
        const filter = audioContext.createBiquadFilter.mock.results[0].value;
        expect(source.loop).toBe(true);
        expect(source.start).toHaveBeenCalledWith(1);
        expect(source.stop).toHaveBeenCalledWith(6.05);
        expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(100, 1);
        expect(filter.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(5000, 1.14);
        expect(filter.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(100, 6);
    });

    it('fades generated warp ambience out with a minimum tail to avoid abrupt stops', () => {
        const audioContext = createAudioContext();
        const repository = createRepository({ seVolume: 0.5 });
        const controller = new SoundController(repository, { audioContextFactory: () => audioContext });

        controller.initialize();
        controller.startWarpEffect(1.4);
        controller.stopWarpEffect(1.4);

        const source = audioContext.createBufferSource.mock.results[0].value;
        const filter = audioContext.createBiquadFilter.mock.results[0].value;
        const noiseGain = audioContext.createGain.mock.results[0].value;
        expect(noiseGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 6);
        expect(filter.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(100, 6);
        expect(source.stop).toHaveBeenCalledWith(6.05);
    });

    it('schedules reverse warp ambience to fade out slowly even when stop is delayed', () => {
        const audioContext = createAudioContext();
        const repository = createRepository({ seVolume: 0.5 });
        const controller = new SoundController(repository, { audioContextFactory: () => audioContext });

        controller.initialize();
        controller.startWarpEffect(3.2, { direction: 'reverse' });

        const source = audioContext.createBufferSource.mock.results[0].value;
        const noiseGain = audioContext.createGain.mock.results[0].value;
        expect(noiseGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.02, 1.8);
        expect(noiseGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 8.3);
        expect(source.stop).toHaveBeenCalledWith(8.350000000000001);
        expect(audioContext.createOscillator).not.toHaveBeenCalled();
    });
});
