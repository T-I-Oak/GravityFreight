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
