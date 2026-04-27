import { describe, it, expect } from 'vitest';
import Item from '../../../../src/systems/entities/Item';
import DataManager from '../../../../src/core/DataManager';

describe('Item Class - Basic Initialization', () => {
    it('should initialize with properties from DataManager and set defaults', () => {
        // DataManagerテストコードにあった 'hull_light' を利用
        const item = new Item('hull_light');
        
        expect(item.id).toBe('hull_light');
        expect(item.uid).toBeDefined();
        expect(typeof item.uid).toBe('string');
        
        // charges は初期状態で maxCharges と等しい
        expect(item.charges).toBe(item.maxCharges);
        
        // デフォルト値の確認 (仕様に基づく)
        expect(item.powerMultiplier).toBe(1.0);
        expect(item.precisionMultiplier).toBe(1.0);
        expect(item.slots).toBeGreaterThanOrEqual(0); // null/undefinedではない
        expect(item.onLostBonus).toBe(false);
        
        // 強化回数は初期0
        expect(item.enhancementCount).toBe(0);
        expect(item.enhancement).toBeDefined();
    });

    it('should generate unique UIDs for different instances', () => {
        const item1 = new Item('hull_light');
        const item2 = new Item('hull_light');
        expect(item1.uid).not.toBe(item2.uid);
    });
});

describe('Item Class - Basic Methods', () => {
    it('should accurately compare items using equals()', () => {
        const item1 = new Item('pad_standard_d2');
        const item2 = new Item('pad_standard_d2');
        const item3 = new Item('pad_precision_d2'); // 別のアイテム

        // uid が違っても性能が同じなら true
        expect(item1.equals(item2)).toBe(true);
        expect(item1.equals(item3)).toBe(false);

        // 耐久度が異なれば false
        item2.consumeCharge(1);
        expect(item1.equals(item2)).toBe(false);

        // 耐久度を戻せば再度 true になる
        item2.repair(1);
        expect(item1.equals(item2)).toBe(true);
    });

    it('should consume charges correctly', () => {
        const item = new Item('pad_standard_d2');
        const initial = item.charges;
        expect(initial).toBeGreaterThan(0);

        // 1消費
        const remaining = item.consumeCharge(1);
        expect(remaining).toBe(initial - 1);
        expect(item.charges).toBe(initial - 1);

        // 0未満にはならない
        const zeroRemaining = item.consumeCharge(initial + 10);
        expect(zeroRemaining).toBe(0);
        expect(item.charges).toBe(0);
    });

    it('should repair charges correctly', () => {
        const item = new Item('pad_standard_d2');
        const max = item.maxCharges;
        
        // 消費してから回復
        item.consumeCharge(2);
        expect(item.charges).toBe(max - 2);

        const afterRepair = item.repair(1);
        expect(afterRepair).toBe(max - 1);
        expect(item.charges).toBe(max - 1);

        // 最大値を超えない
        const fullRepair = item.repair(10);
        expect(fullRepair).toBe(max);
        expect(item.charges).toBe(max);
    });
});
