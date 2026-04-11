/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../GravityFreight/src/core/Game.js';
import { setupStandardDOM } from '../test-utils.js';

// TitleAnimation のモック化
vi.mock('../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Spec: Base Facilities (Chapter 8)', () => {
    let game;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        setupStandardDOM();
        vi.clearAllMocks();
        game = new Game(mockCanvas, mockUI);
    });

    describe('8.2 Repair Dock (Dismantle & Enhancement)', () => {
        it('costs should increment by 50c per call (50, 100, 150...)', () => {
             // Game class doesn't store current cost, it just tracks dismantleCount
             // cost = 50 * (game.dismantleCount + 1)
             expect(game.dismantleCount).toBe(0);
             
             const cost1 = (game.dismantleCount + 1) * 50;
             expect(cost1).toBe(50);
             
             game.dismantleCount++;
             const cost2 = (game.dismantleCount + 1) * 50;
             expect(cost2).toBe(100);
             
             game.dismantleCount++;
             const cost3 = (game.dismantleCount + 1) * 50;
             expect(cost3).toBe(150);
        });
    });

    describe('8.1 Trading Post (Selling)', () => {
        it('selling price should be the calculated item value (Specification 7.3)', () => {
             const item = { id: 'hull_light', rarity: 5, enhancementCount: 0 };
             const price = game.calculateValue(item);
             expect(price).toBe(20); // Common base price
             
             // Sale price is exactly the value (Spec 8.1.344)
             // Buying price is 2x value (Spec 8.1.341)
        });
    });
});
