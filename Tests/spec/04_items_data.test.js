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
            it('essential support modules should be RARE', () => {
                checkItem('mod_cushion', { rarity: RARITY.RARE });
                checkItem('mod_emergency', { rarity: RARITY.RARE });
            });
        });

        describe('Cargo Metadata and Descriptions', () => {
            it('validation of cargo names and descriptions', () => {
                checkItem('cargo_safe', { 
                    name: '通商物資', 
                    description: '交易所への配送用物資。',
                    rarity: RARITY.UNCOMMON 
                });
                checkItem('cargo_normal', { 
                    name: '整備用パーツ', 
                    description: '整備ドックへの配送用パーツ。',
                    rarity: RARITY.UNCOMMON 
                });
                checkItem('cargo_danger', { 
                    name: '暗号化データ', 
                    description: '闇市場への配送用データ。',
                    rarity: RARITY.UNCOMMON 
                });
            });
        });

        describe('Launcher Names (New Model Numbers)', () => {
            it('should have correct LN1200 and PR1000 model names', () => {
                checkItem('pad_standard_d2', { name: '標準発射台 [LN1200-2]' });
                checkItem('pad_precision_d2', { name: '精密発射台 [PR1000-2]' });
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
    });
});
