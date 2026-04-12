import { describe, it, expect } from 'vitest';
import { INITIAL_INVENTORY, INITIAL_COINS, CATEGORY_COLORS, ITEM_REGISTRY, RARITY } from '../../GravityFreight/src/core/Data.js';

describe('Spec: Items & Data (Chapter 4)', () => {
    describe('4.4 Initial Setup Data', () => {
        const verifyInventoryCount = (categoryItems, expectedIds) => {
            expect(categoryItems.length, `Length should be ${expectedIds.length}`).toBe(expectedIds.length);
            expectedIds.forEach(id => {
                const entry = categoryItems.find(i => i.id === id);
                expect(entry, `Inventory should contain ${id}`).toBeDefined();
                expect(entry.count, `Item ${id} should have count: 1`).toBe(1);
            });
        };

        it('should provide initial parts correctly according to spec', () => {
            verifyInventoryCount(INITIAL_INVENTORY.chassis, ['hull_light', 'hull_medium']);
            verifyInventoryCount(INITIAL_INVENTORY.logic, ['sensor_short', 'sensor_normal']);
            verifyInventoryCount(INITIAL_INVENTORY.launchers, ['pad_standard_d2', 'pad_precision_d2']);
            verifyInventoryCount(INITIAL_INVENTORY.modules, ['mod_analyzer']);
            verifyInventoryCount(INITIAL_INVENTORY.boosters, ['opt_fuel', 'boost_power']);
        });

        it('should start with 0 coins', () => {
            expect(INITIAL_COINS).toBe(0);
        });
    });

    describe('4.3 Item List Table Verification', () => {
        const checkItem = (id, expectedProps) => {
            const item = ITEM_REGISTRY[id];
            expect(item, `Item with ID ${id} should exist`).toBeDefined();
            Object.entries(expectedProps).forEach(([prop, expectedValue]) => {
                expect(item[prop], `${id}.${prop} mismatch (expected: ${expectedValue}, actual: ${item[prop]})`).toBe(expectedValue);
            });
        };

        describe('Module Rarity (Critical Balance)', () => {
            it('high-performance survival modules should be ANOMALY', () => {
                checkItem('mod_star_breaker', { rarity: RARITY.ANOMALY });
                checkItem('mod_cushion', { rarity: RARITY.ANOMALY });
                checkItem('mod_emergency', { rarity: RARITY.ANOMALY });
                checkItem('mod_stabilizer', { rarity: RARITY.ANOMALY });
            });
            it('insurance should be COMMON', () => {
                checkItem('mod_insurance', { rarity: RARITY.COMMON });
            });
        });

        describe('Core Equipment Specs', () => {
            it('sensor_gravity should be RARE with 0.9 gravity scale', () => {
                checkItem('sensor_gravity', { 
                    rarity: RARITY.RARE,
                    gravityMultiplier: 0.9 
                });
            });
        });

        describe('Cargo Metadata and Descriptions', () => {
            it('validation of cargo names and descriptions', () => {
                checkItem('cargo_safe', { 
                    name: '通商物資', 
                    description: 'Trading Post への配送を目的とした荷物。',
                    rarity: RARITY.RARE 
                });
                checkItem('cargo_normal', { 
                    name: '整備用パーツ', 
                    description: 'Repair Dock への配送を目的とした整備用パーツ。',
                    rarity: RARITY.RARE 
                });
                checkItem('cargo_danger', { 
                    name: '暗号化データ', 
                    description: 'Black Market への配送を目的とした暗号化データ。',
                    rarity: RARITY.RARE 
                });
            });
        });

        describe('Launcher Names (New Model Numbers)', () => {
            it('should have correct LN1200 and PR1000 model names', () => {
                checkItem('pad_standard_d2', { name: '標準発射台 [LN-1200/2]' });
                checkItem('pad_precision_d2', { name: '精密発射台 [PR-1000/2]' });
            });
        });

        describe('Booster Enhancement (Arc Expander)', () => {
            it('should have correct Arc Expander name and 2.0x multiplier', () => {
                checkItem('boost_expander', { 
                    name: 'アーク・エクスパンダー',
                    arcMultiplier: 2.0
                });
            });
        });

        describe('Chassis accuracy and rarity', () => {
             it('validation of hull rarity', () => {
                checkItem('hull_light', { rarity: RARITY.COMMON });
                checkItem('hull_medium', { rarity: RARITY.COMMON });
                checkItem('hull_heavy', { rarity: RARITY.COMMON });
             });
        });

        describe('Evasion and Ghost Modules', () => {
            it('should have correct names and descriptions for primary and ghost modules', () => {
                checkItem('mod_star_breaker', {
                    name: 'スター・ブレイカー',
                    description: '星に激突する直前、高出力パルスで対象を破壊する衝突回避装置。'
                });
                checkItem('mod_cushion', {
                    name: 'インパクト・クッション',
                    description: '星に激突した際、反発場を展開してバウンドする衝突緩衝モジュール。'
                });
                checkItem('mod_emergency', {
                    name: '緊急スラスター',
                    description: '境界線でのロストを回避するための、自動方向転換用スラスター。'
                });
                checkItem('mod_gst_breaker', {
                    name: 'ブレイカー・ゴースト',
                    description: 'スター・ブレイカー作動時の想定軌道を演算し、航法システムへ表示する補助機能。'
                });
                checkItem('mod_gst_cushion', {
                    name: 'クッション・ゴースト',
                    description: 'インパクト・クッション作動時の想定軌道を演算し、航法システムへ表示する補助機能。'
                });
                checkItem('mod_gst_emergency', {
                    name: 'スラスター・ゴースト',
                    description: '緊急スラスター作動時の想定軌道を演算し、航法システムへ表示する補助機能。'
                });
            });
        });
    });
});
