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

describe('Spec: Exit Arcs & Cargo Delivery (Chapter 6)', () => {
    let game;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        setupStandardDOM();
        vi.clearAllMocks();
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        game = new Game(mockCanvas, mockUI);
    });

    describe('6.1 Exit Arc Rewards', () => {
        it('TRADING POST: should reward 2000 score and 20 coins', () => {
            const hitGoal = { id: 'SAFE', score: 2000, coins: 20, label: 'TRADING POST' };
            // Simulate collected item to trigger resolution
            game.pendingItems = [{ itemData: { category: 'COIN', score: 0 } }]; 
            
            game.missionSystem.resolveItems('success', hitGoal);
            
            // Spec 6.1 says "Rewards: 2000 Score / 20 Coins".
            // v0.11 correctly adds them in resolveItems even with no matching cargo.
            expect(game.pendingScore).toBe(2000); 
            expect(game.pendingCoins).toBe(20);
        });

        it('BLACK MARKET: should reward 5000 score and 50 coins', () => {
            const hitGoal = { id: 'DANGER', score: 5000, coins: 50, label: 'BLACK MARKET' };
            game.pendingItems = [{ itemData: { category: 'COIN', score: 0 } }];
            
            game.missionSystem.resolveItems('success', hitGoal);
            expect(game.pendingScore).toBe(5000);
            expect(game.pendingCoins).toBe(50);
        });
    });

    describe('6.2 Cargo Delivery Rules', () => {
        it('MATCH: should reward +1500 score and +100 coins', () => {
            const hitGoal = { id: 'SAFE', score: 2000, coins: 20, label: 'TRADING POST' };
            const cargo = { category: 'CARGO', deliveryGoalId: 'SAFE' };
            game.pendingItems = [{ itemData: cargo }];
            
            game.missionSystem.resolveItems('success', hitGoal);
            
            // Result: 1x (Base 2000 + Bonus 1500) = 3500
            expect(game.pendingScore).toBe(3500);
            // Result: 1x (Base 20 + Bonus 100) = 120
            expect(game.pendingCoins).toBe(120);
        });

        it('UNMATCHED: should reward base and +10 coins', () => {
            const hitGoal = { id: 'SAFE', score: 2000, coins: 20, label: 'TRADING POST' };
            const unmatchedCargo = { id: 'cargo_normal', category: 'CARGO', deliveryGoalId: 'NORMAL' }; 
            game.pendingItems = [{ itemData: unmatchedCargo }];
            
            game.missionSystem.resolveItems('success', hitGoal);
            
            // Should have base score but NO match bonus score
            expect(game.pendingScore).toBe(2000);
            // Should have base coins + 10 extra coins
            expect(game.pendingCoins).toBe(20 + 10);
        });

        it('6.2.C Lucky Cargo: should provide -10% discount per item (up to 50%)', () => {
            const hitGoal = { id: 'SAFE' };
            const luckyCargo1 = { id: 'cargo_lucky', category: 'CARGO', coinDiscount: 0.1 };
            const luckyCargo2 = { id: 'cargo_lucky', category: 'CARGO', coinDiscount: 0.1 };
            game.pendingItems = [{ itemData: luckyCargo1 }, { itemData: luckyCargo2 }];
            
            game.resolveItems('success', hitGoal);
            
            expect(game.currentCoinDiscount).toBe(0.2);
        });
    });

    describe('6.3 N-times Delivery (v0.11)', () => {
        it('should grant Constant Base + N-times Bonus when delivering 2 matching cargo', () => {
            const goal = { id: 'SAFE', score: 2000, coins: 20, bonusItems: 1, label: 'TRADING POST' };
            
            // 一致する貨物を2つ用意
            game.pendingItems = [
                { itemData: { category: 'CARGO', deliveryGoalId: 'SAFE', id: 'cargo_1' } },
                { itemData: { category: 'CARGO', deliveryGoalId: 'SAFE', id: 'cargo_2' } }
            ];

            game.missionSystem.resolveItems('success', goal);

            // Calculation: (Base 2000) + (1500 * 2) = 5000
            expect(game.pendingScore).toBe(5000);
            // Calculation: (Base 20) + (100 * 2) = 220
            expect(game.pendingCoins).toBe(220);

            // Item calculation: 1 (base items) * 2 (matches) = 2 Gacha items delivered
            const matchItems = game.flightResults.items.filter(i => i.isDelivery && i.isMatch);
            expect(matchItems.length).toBe(2);
            expect(matchItems[0].bonusItems.length).toBe(1);
            expect(matchItems[1].bonusItems.length).toBe(1);
        });
    });
});
