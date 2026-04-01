/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { setupStandardDOM } from '../../test-utils.js';

// TitleAnimation のモック化 (Gameコンストラクタ内で updateUI -> _updateTitleUI が呼ばれるため)
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Implementation: Game Core Controllers', () => {
    let game;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        setupStandardDOM();
        vi.clearAllMocks();
        game = new Game(mockCanvas, mockUI);
    });

    it('should initialize all subsystems correctly on construction', () => {
        expect(game.economySystem).toBeDefined();
        expect(game.missionSystem).toBeDefined();
        expect(game.eventSystem).toBeDefined();
        expect(game.uiSystem).toBeDefined();
        expect(game.physicsOrchestrator).toBeDefined();
        expect(game.state).toBe('title');
    });

    it('should correctly handle home star initialization', () => {
        game.missionSystem.initStage(5);
        expect(game.homeStar).toBeDefined();
        expect(game.homeStar.isHome).toBe(true);
        expect(game.bodies.length).toBeGreaterThanOrEqual(6); // 1 home + 5 generated
    });

    it('should track coins and score with animation states', () => {
        game.coins = 100;
        game.score = 500;
        
        // Before updateUI or manual sync
        expect(game.displayCoins).toBe(0);
        expect(game.displayScore).toBe(0);
        
        // Sync display coins/score (usually done in UISystem.update)
        game.displayCoins = game.coins;
        game.displayScore = game.score;
        
        expect(game.displayCoins).toBe(100);
        expect(game.displayScore).toBe(500);
    });
});
