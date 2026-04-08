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
const createMockGain = () => ({
    connect: vi.fn(),
    gain: { 
        value: 0.5,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn()
    }
});

const createMockAudioContext = () => ({
    state: 'suspended',
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(),
    createGain: vi.fn(() => createMockGain()),
    createOscillator: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { 
            setValueAtTime: vi.fn(), 
            exponentialRampToValueAtTime: vi.fn() 
        },
        onended: null
    })),
    createBiquadFilter: vi.fn(() => ({
        connect: vi.fn(),
        type: 'lowpass',
        frequency: { setValueAtTime: vi.fn() },
        Q: { setValueAtTime: vi.fn() }
    })),
    destination: {}
});

global.window.AudioContext = vi.fn().mockImplementation(function() {
    return createMockAudioContext();
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
        expect(game.audioSystem.ctx.createGain).toHaveBeenCalled();
    });

    it('resume should call ctx.resume if suspended', async () => {
        game.audioSystem.init();
        const resumeSpy = game.audioSystem.ctx.resume;
        await game.audioSystem.resume();
        expect(resumeSpy).toHaveBeenCalled();
    });

    it('should have methods for required SE types', () => {
        expect(typeof game.audioSystem.playLaunch).toBe('function');
        expect(typeof game.audioSystem.playSonar).toBe('function');
        expect(typeof game.audioSystem.playPickup).toBe('function');
        expect(typeof game.audioSystem.playCrash).toBe('function');
        expect(typeof game.audioSystem.playGoal).toBe('function');
    });

    describe('Volume Management', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('setVolume should update gain and save to localStorage', () => {
            // init() はコンストラクタで呼ばれているので再呼出し不要
            const targetGain = game.audioSystem.masterGain.gain;
            
            game.audioSystem.setVolume(0.8);
            
            // setTargetAtTime の呼び出し検証
            expect(targetGain.setTargetAtTime).toHaveBeenCalledWith(
                0.4, 
                expect.any(Number), 
                0.05
            );
            // localStorage の検証
            expect(localStorage.getItem('gf_se_volume')).toBe('0.8');
        });

        it('init should load volume from localStorage', () => {
            localStorage.clear();
            localStorage.setItem('gf_se_volume', '0.2');
            
            const mockCanvas = { 
                width: 800, 
                height: 600, 
                addEventListener: vi.fn(), 
                getContext: vi.fn(() => ({})) 
            };
            const localGame = new Game(mockCanvas, {});
            
            expect(localGame.audioSystem.masterGain.gain.value).toBeCloseTo(0.1);
        });
    });
});




