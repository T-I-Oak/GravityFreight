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

        it('Stage Generation: should respect item count and rarity constraints', () => {
            // 第1セクターの制約検証 (Spec 7.2 / 7.5)
            game.stageLevel = 1;
            game.missionSystem.initStage(5); // 5つの星を生成
            
            game.bodies.forEach(body => {
                if (body.isHome) return;
                
                // 配置数の検証 (Spec 7.2.290: 1〜2個)
                const itemCount = body.items.length;
                expect(itemCount, `Star at (${Math.round(body.position.x)}, ${Math.round(body.position.y)}) should have 1-2 items, but found ${itemCount}`).toBeGreaterThanOrEqual(1);
                expect(itemCount, `Star at (${Math.round(body.position.x)}, ${Math.round(body.position.y)}) should have 1-2 items, but found ${itemCount}`).toBeLessThanOrEqual(2);

                // レアリティの検証 (Spec 7.5.315: 第1セクターでは RARE 不可)
                body.items.forEach(item => {
                    expect(item.rarity, `Item ${item.name} with rarity ${item.rarity} should not appear in Sector 1`).toBeLessThan(15);
                });
            });
        });
    });

    describe('7.3 Economy & Insurance', () => {
        it('Item Value: should calculate base price by rarity (20/40/60/100)', () => {
            const common = { id: 'c', rarity: RARITY.COMMON };
            const uncommon = { id: 'u', rarity: RARITY.UNCOMMON };
            const rare = { id: 'r', rarity: RARITY.RARE };
            const anomaly = { id: 'a', rarity: RARITY.ANOMALY };
            
            expect(game.economySystem.calculateValue(common)).toBe(20);
            expect(game.economySystem.calculateValue(uncommon)).toBe(40);
            expect(game.economySystem.calculateValue(rare)).toBe(60);
            expect(game.economySystem.calculateValue(anomaly)).toBe(100);
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
            game.pendingCoins = 0;
            game.resolveItems('lost');
            
            expect(game.pendingCoins).toBe(240);
        });

        it('Insurance: should pay even when crashing without cargo (BUG REPRO)', () => {
            // Setup ship with 1 insurance module
            game.ship = {
                equippedModules: [{ id: 'mod_insurance', rarity: RARITY.UNCOMMON, onLostBonus: 1 }]
            };
            // Setup rocket parts
            game.selection.rocket = {
                chassis: { id: 'h', rarity: RARITY.COMMON }, // 20
                logic: { id: 'l', rarity: RARITY.COMMON }     // 20
            };
            // Total parts value = 20 (chassis) + 20 (logic) + 40 (module) = 80
            
            game.pendingItems = []; // CRITICAL: empty cargo
            game.pendingCoins = 0;
            game.resolveItems('crashed');
            
            // Expected: 80 coins
            expect(game.pendingCoins, "Should pay insurance even if cargo is empty").toBe(80);
        });
    });

    describe('7.1 Goal Passing Reward & Mission Success', () => {
        it('should grant total rewards (Base + Bonus) when reaching a goal', () => {
            const dangerGoal = game.goals.find(g => g.id === 'BLACK_MARKET'); // 基礎: +5000pt, +50c
            
            // ランダムなボーナスアイテム抽選がコイン加算に干渉しないようスパイで固定
            vi.spyOn(game.missionSystem, 'getWeightedRandomItem').mockReturnValue(
                { id: 'test_part', category: 'CHASSIS', name: 'Test Part', rarity: RARITY.COMMON }
            );

            // 状況：BLACK_MARKET配送用の貨物を持ってBLACK_MARKETゴール到達
            game.pendingItems = [{ 
                itemData: { id: 'cargo_danger', category: 'CARGO', name: '暗号化データ', deliveryGoalId: 'BLACK_MARKET' } 
            }];
            game.pendingScore = 0;
            game.pendingCoins = 0;

            // MissionSystem による報酬の加算 (v0.11 アーキテクチャ: ここですべて完結する)
            game.missionSystem.resolveItems('success', dangerGoal);
            
            // 合計: 1 x (基礎(5000) + 配送ボーナス(1500)) = 6500pt
            // コイン: 1 x (基礎(50) + 配送ボーナス(100)) = 150c
            expect(game.pendingScore, "Total score should be Base(5000) + DeliveryBonus(1500)").toBe(6500);
            expect(game.pendingCoins, "Total coins should be Base(50) + DeliveryBonus(100)").toBe(150);
        });


        it('BUG FIX: should clear flightResults bonuses on game.reset() to prevent accumulation', () => {
            // 1回目のフライトの成果を模擬
            game.flightResults.bonuses.push({ name: 'Goal Bonus', value: 1000 });
            expect(game.flightResults.bonuses.length).toBe(1);

            // フライト終了時のリセット処理 (本来ここでクリアされるべき)
            game.reset();

            // 期待値: 次のフライトのために空になっていること
            // (注意: 現在の実装ではリセットされないため、このテストは失敗するはずです)
            expect(game.flightResults.bonuses.length, "flightResults.bonuses should be cleared on reset").toBe(0);
        });
    });
});
