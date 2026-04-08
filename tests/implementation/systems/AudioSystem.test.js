/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { setupStandardDOM } from '../../test-utils.js';

// TitleAnimation のモック化 (起動時のエラー回避)
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

// Web Audio API のモック
const mockOscillator = {
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { 
        setValueAtTime: vi.fn(), 
        exponentialRampToValueAtTime: vi.fn() 
    },
    onended: null
};

const mockGain = {
    connect: vi.fn(),
    gain: { 
        value: 0.5,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn()
    }
};

const mockAudioContext = {
    state: 'suspended',
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(),
    createGain: vi.fn(() => mockGain),
    createOscillator: vi.fn(() => mockOscillator),
    createBiquadFilter: vi.fn(() => ({
        connect: vi.fn(),
        type: 'lowpass',
        frequency: { setValueAtTime: vi.fn() },
        Q: { setValueAtTime: vi.fn() }
    })),
    destination: {}
};

global.window.AudioContext = vi.fn().mockImplementation(function() {
    return mockAudioContext;
});

describe('Implementation: AudioSystem', () => {
    let game;

    beforeEach(() => {
        setupStandardDOM();
        vi.clearAllMocks();
        // 最小限のモックでGameを初期化
        const mockCanvas = { 
            width: 800, 
            height: 600, 
            addEventListener: vi.fn(), 
            getContext: vi.fn(() => ({})) 
        };
        const mockUI = { status: {}, message: {}, updateInventory: vi.fn() };
        game = new Game(mockCanvas, mockUI);
    });

    it('init should initialize AudioContext and MasterGain', () => {
        game.audioSystem.init();
        expect(global.window.AudioContext).toHaveBeenCalled();
        expect(game.audioSystem.active).toBe(true);
        expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('resume should call ctx.resume if suspended', async () => {
        game.audioSystem.init();
        await game.audioSystem.resume();
        expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should have methods for required SE types', () => {
        expect(typeof game.audioSystem.playLaunch).toBe('function');
        expect(typeof game.audioSystem.playSonar).toBe('function');
        expect(typeof game.audioSystem.playPickup).toBe('function');
        expect(typeof game.audioSystem.playCrash).toBe('function');
        expect(typeof game.audioSystem.playGoal).toBe('function');
    });
});
