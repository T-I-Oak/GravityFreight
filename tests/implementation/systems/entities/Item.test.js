import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('Item Class - applyMaintenance', () => {
    let mathRandomSpy;

    beforeEach(() => {
        mathRandomSpy = vi.spyOn(Math, 'random');
    });

    afterEach(() => {
        mathRandomSpy.mockRestore();
    });

    it('should enhance normal properties and increase enhancementCount', () => {
        const item = new Item('pad_standard_d2');
        // slots, precisionMultiplier, pickupMultiplier, maxCharges は常に候補 (このアイテムはマスタに maxCharges がある)
        // 候補配列がどう組まれるかによるが、先頭の 'slots' が選ばれるように 0 を返す
        mathRandomSpy.mockReturnValue(0.0);

        const initialSlots = item.slots;
        const result = item.applyMaintenance();

        expect(result).toBe('slots');
        expect(item.enhancement['slots']).toBe(1);
        expect(item.slots).toBe(initialSlots + 1);
        expect(item.enhancementCount).toBe(1);
    });

    it('should repair instead of enhancing maxCharges if damaged', () => {
        const item = new Item('pad_standard_d2');
        item.consumeCharge(1); // ダメージを与える

        // maxCharges が選ばれるように調整 (最後尾と仮定して 0.99)
        mathRandomSpy.mockReturnValue(0.99);

        const result = item.applyMaintenance();

        expect(result).toBe('repair');
        expect(item.charges).toBe(item.maxCharges); // 回復した
        expect(item.enhancementCount).toBe(0); // 強化回数は増えない
    });

    it('should enhance maxCharges if fully repaired', () => {
        const item = new Item('pad_standard_d2');
        // ダメージなし
        const initialMax = item.maxCharges;

        // maxCharges が選ばれるように調整
        mathRandomSpy.mockReturnValue(0.99);

        const result = item.applyMaintenance();

        expect(result).toBe('maxCharges');
        expect(item.maxCharges).toBe(initialMax + 1);
        expect(item.charges).toBe(initialMax + 1);
        expect(item.enhancementCount).toBe(1);
    });

    it('should properly filter candidates based on master existence', () => {
        const item = new Item('hull_light'); // maxCharges, gravityMultiplier がマスタに無い
        
        // 何が選ばれても、maxCharges や gravityMultiplier にはならないことを確認
        // (実装内部でこれらが候補配列に含まれていないことを間接的にテストする)
        const candidates = [];
        for (let i = 0; i < 100; i++) {
            mathRandomSpy.mockReturnValue(i / 100);
            const result = item.applyMaintenance();
            if (!candidates.includes(result)) {
                candidates.push(result);
            }
        }

        expect(candidates).not.toContain('maxCharges');
        expect(candidates).not.toContain('gravityMultiplier');
        expect(candidates).toContain('slots');
        expect(candidates).toContain('precisionMultiplier');
        expect(candidates).toContain('pickupMultiplier');
    });
});

describe('Item Class - Snapshot', () => {
    let mathRandomSpy;

    beforeEach(() => {
        mathRandomSpy = vi.spyOn(Math, 'random');
    });

    afterEach(() => {
        mathRandomSpy.mockRestore();
    });

    it('should generate a snapshot with all public properties', () => {
        const item = new Item('pad_standard_d2');
        const snap = item.getSnapshot();

        expect(snap.uid).toBe(item.uid);
        expect(snap.id).toBe('pad_standard_d2');
        expect(snap.charges).toBe(item.charges);
        expect(snap.maxCharges).toBe(item.maxCharges);
        expect(snap.enhancement).toEqual(item.enhancement);
        expect(snap.name).toBe(item.name);
        expect(snap.power).toBe(item.power);
    });

    it('should hydrate from snapshot and restore enhancements correctly', () => {
        const originalItem = new Item('pad_standard_d2');
        
        // 強化をシミュレート
        // slots を選ばせる
        mathRandomSpy.mockReturnValue(0.0);
        originalItem.applyMaintenance(); // slots + 1
        originalItem.applyMaintenance(); // slots + 1

        const snap = originalItem.getSnapshot();
        
        const restoredItem = Item.fromSnapshot(snap);

        expect(restoredItem.uid).toBe(originalItem.uid);
        expect(restoredItem.id).toBe(originalItem.id);
        expect(restoredItem.charges).toBe(originalItem.charges);
        expect(restoredItem.maxCharges).toBe(originalItem.maxCharges);
        expect(restoredItem.slots).toBe(originalItem.slots);
        expect(restoredItem.enhancementCount).toBe(2);
        expect(restoredItem.enhancement).toEqual({ slots: 2 });
        
        // equals で完全一致することを確認
        expect(restoredItem.equals(originalItem)).toBe(true);
    });

    it('should restore maxCharges enhancement correctly', () => {
        const originalItem = new Item('pad_standard_d2');
        
        // maxCharges を選ばせる (リストの最後と仮定)
        mathRandomSpy.mockReturnValue(0.99);
        originalItem.applyMaintenance(); // maxCharges + 1

        const snap = originalItem.getSnapshot();
        const restoredItem = Item.fromSnapshot(snap);

        expect(restoredItem.maxCharges).toBe(originalItem.maxCharges);
        expect(restoredItem.charges).toBe(originalItem.charges);
        expect(restoredItem.enhancementCount).toBe(1);
        expect(restoredItem.equals(originalItem)).toBe(true);
    });
});
