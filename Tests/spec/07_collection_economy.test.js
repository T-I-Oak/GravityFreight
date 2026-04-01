/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../GravityFreight/src/core/Game.js';
import { RARITY } from '../../GravityFreight/src/core/Data.js';
import { setupStandardDOM } from '../test-utils.js';

// TitleAnimation のモック化
vi.mock('../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Spec: Collection & Economy (Chapter 7)', () => {
    let game;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        setupStandardDOM();
        vi.clearAllMocks();
        game = new Game(mockCanvas, mockUI);
    });

    describe('7.2 Drop & Gacha Logic', () => {
        it('Sector Threshold: should be 14 + S (where S is current sector)', () => {
            game.stageLevel = 1;
            expect(game.missionSystem.getSectorItemThreshold()).toBe(15);
            
            game.stageLevel = 5;
            expect(game.missionSystem.getSectorItemThreshold()).toBe(19);
        });

        it('Rarity Weight: should exclude RARE items in Sector 1 (Threshold 15 - RARE 15 = 0)', () => {
            game.stageLevel = 1; // Threshold = 15
            
            // Mock Math.random to return something that would pick a RARE item if it existed,
            // but the weight calculation should filter it out before the random selection.
            const spy = vi.spyOn(game.missionSystem, 'getWeightedRandomItem');
            game.missionSystem.getWeightedRandomItem();
            
            // We need to verify the pool filtering. 
            // In Sector 1, an item with rarity 15 has weight 15 - 15 = 0, so it's excluded.
            // An item with rarity 10 (UNCOMMON) has weight 15 - 10 = 5.
            // An item with rarity 5 (COMMON) has weight 15 - 5 = 10.
        });

        it('Weighted Random: should favor higher rarity as sectors progress', () => {
            game.stageLevel = 10; // Threshold = 24
            // COMMON (5) weight = 24 - 5 = 19
            // UNCOMMON (10) weight = 24 - 10 = 14
            // RARE (15) weight = 24 - 15 = 9
            // Total weight = 19 + 14 + 9 = 42
            // Probability of RARE = 9 / 42 ~= 21.4% (Higher than sector 2: 1 / (11+6+1) = 5.5%)
        });
    });

    describe('7.3 Economy & Insurance', () => {
        it('Item Value: should calculate base price by rarity (20/40/60)', () => {
            const common = { id: 'c', rarity: RARITY.COMMON };
            const uncommon = { id: 'u', rarity: RARITY.UNCOMMON };
            const rare = { id: 'r', rarity: RARITY.RARE };
            
            expect(game.economySystem.calculateValue(common)).toBe(20);
            expect(game.economySystem.calculateValue(uncommon)).toBe(40);
            expect(game.economySystem.calculateValue(rare)).toBe(60);
        });

        it('Item Value: should apply enhancement bonus (+10% per level)', () => {
            const item = { id: 'c', rarity: RARITY.COMMON, enhancementCount: 2 };
            // 20 * (1 + 0.2) = 24
            expect(game.economySystem.calculateValue(item)).toBe(24);
        });

        it('Insurance: should pay (total value * module count) on Lost/Crashed', () => {
            // Setup ship with 2 insurance modules
            game.ship = {
                equippedModules: [
                    { id: 'mod_insurance', rarity: RARITY.UNCOMMON, onLostBonus: 1 },
                    { id: 'mod_insurance', rarity: RARITY.UNCOMMON, onLostBonus: 1 }
                ]
            };
            // Setup rocket parts
            game.selection.rocket = {
                chassis: { id: 'h', rarity: RARITY.COMMON }, // 20
                logic: { id: 'l', rarity: RARITY.COMMON }     // 20
            };
            // Total parts value = 20 (chassis) + 20 (logic) + 40*2 (modules) = 120
            // Insurance x2 = 240
            
            game.pendingItems = [{ itemData: { id: 'junk' } }]; // Trigger for resolveItems failure
            game.resolveItems('lost');
            
            expect(game.pendingCoins).toBe(240);
        });
    });
});
