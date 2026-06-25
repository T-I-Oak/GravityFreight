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
                setValueAtTime: vi.fn()
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

    it('plays click and select SE with generated Web Audio tones', () => {
        const audioContext = createAudioContext();
        const repository = createRepository({ seVolume: 0.5 });
        const controller = new SoundController(repository, { audioContextFactory: () => audioContext });

        controller.initialize();
        controller.playSE('click');
        controller.playSE('select', 0.2);

        expect(audioContext.resume).toHaveBeenCalled();
        expect(audioContext.createOscillator).toHaveBeenCalledTimes(2);
        expect(audioContext.createGain).toHaveBeenCalledTimes(2);
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
        expect(audioContext.createGain).toHaveBeenCalledTimes(1);
        const source = audioContext.createBufferSource.mock.results[0].value;
        expect(source.loop).toBe(true);
        expect(source.start).toHaveBeenCalledWith(1);
        expect(source.stop).toHaveBeenCalledWith(1.4);
    });
});
