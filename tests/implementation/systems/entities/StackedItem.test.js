import { describe, it, expect, beforeAll, vi } from 'vitest';
import Item from '../../../../src/systems/entities/Item';
import StackedItem from '../../../../src/systems/entities/StackedItem';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';

let repository;

beforeAll(async () => {
    repository = new GameDataRepository({
        getSavedData: vi.fn(),
        setSavedData: vi.fn()
    }, {
        expandLanguageResource: value => value
    });
    await repository.loadAllData();
});

describe('StackedItem Class - Basic Operations', () => {
    it('should initialize as an empty stack', () => {
        const stack = new StackedItem();
        expect(stack.quantity).toBe(0);
        expect(stack.uid).toBeNull();
        expect(stack.id).toBeNull();
        expect(stack.representative).toBeNull();
        expect(stack.items).toEqual([]);
    });

    it('should initialize with properties on first push', () => {
        const stack = new StackedItem();
        const item = new Item('hull_light', repository);
        const success = stack.push(item);

        expect(success).toBe(true);
        expect(stack.quantity).toBe(1);
        expect(stack.id).toBe('hull_light');
        expect(stack.uid).toBeDefined();
        expect(stack.representative).toBe(item);
    });

    it('should accept items with same characteristics', () => {
        const stack = new StackedItem();
        const item1 = new Item('hull_light', repository);
        const item2 = new Item('hull_light', repository); // different uid but equals() is true
        
        stack.push(item1);
        const success = stack.push(item2);

        expect(success).toBe(true);
        expect(stack.quantity).toBe(2);
        expect(stack.items[0]).toBe(item1);
        expect(stack.items[1]).toBe(item2);
    });

    it('should reject items with different characteristics', () => {
        const stack = new StackedItem();
        const item1 = new Item('pad_standard_d2', repository); // Has 2 charges
        const item2 = new Item('hull_medium', repository); // Different ID
        const item3 = new Item('pad_standard_d2', repository);
        item3.consumeCharge(1); // different characteristics due to damage (1 charge left)

        stack.push(item1);
        
        // Different ID
        expect(stack.push(item2)).toBe(false);
        expect(stack.quantity).toBe(1);

        // Same ID but different state
        expect(stack.push(item3)).toBe(false);
        expect(stack.quantity).toBe(1);
    });

    it('should return items in LIFO order on pop', () => {
        const stack = new StackedItem();
        const item1 = new Item('hull_light', repository);
        const item2 = new Item('hull_light', repository);
        
        stack.push(item1);
        stack.push(item2);

        expect(stack.pop()).toBe(item2);
        expect(stack.quantity).toBe(1);
        expect(stack.pop()).toBe(item1);
        expect(stack.quantity).toBe(0);
    });

    it('should reset properties when emptied via pop', () => {
        const stack = new StackedItem();
        const item = new Item('hull_light', repository);
        
        stack.push(item);
        stack.pop();

        expect(stack.quantity).toBe(0);
        expect(stack.uid).toBeNull();
        expect(stack.id).toBeNull();
        expect(stack.representative).toBeNull();
    });

    it('should return null when popping an empty stack', () => {
        const stack = new StackedItem();
        expect(stack.pop()).toBeNull();
    });
});

describe('StackedItem Class - Property Access via Representative', () => {
    it('should allow accessing basic information via the representative item', () => {
        const stack = new StackedItem();
        const item = new Item('hull_light', repository);
        stack.push(item);

        expect(stack.representative.name).toBe(item.name);
        expect(stack.representative.category).toBe(item.category);
        expect(stack.representative.rarity).toBe(item.rarity);
        expect(stack.representative.description).toBe(item.description);
    });

    it('should provide performance values via the representative item', () => {
        const stack = new StackedItem();
        const item = new Item('hull_light', repository);
        stack.push(item);

        expect(stack.representative.mass).toBe(item.mass);
        expect(stack.representative.slots).toBe(item.slots);
    });

    it('should have null representative when empty', () => {
        const stack = new StackedItem();
        expect(stack.representative).toBeNull();
    });
});

describe('StackedItem Class - View Data', () => {
    it('should return representative view data with stack uid and count', () => {
        const stack = new StackedItem();
        const item1 = new Item('hull_light', repository);
        const item2 = new Item('hull_light', repository);

        stack.push(item1);
        stack.push(item2);

        const viewData = stack.getViewData();
        const representativeViewData = item1.getViewData();

        expect(viewData).toMatchObject({
            ...representativeViewData,
            uid: stack.uid,
            count: 2
        });
        expect(viewData.uid).not.toBe(item1.uid);
        expect(viewData.stats.slots.value).toBe(item1.slots);
    });

    it('should throw when view data is requested from an empty stack', () => {
        const stack = new StackedItem();

        expect(() => stack.getViewData()).toThrow('[StackedItem] Cannot create view data from an empty stack.');
    });
});

describe('StackedItem Class - Snapshots', () => {
    it('should generate a valid snapshot including item snapshots', () => {
        const stack = new StackedItem();
        const item1 = new Item('hull_light', repository);
        const item2 = new Item('hull_light', repository);
        stack.push(item1);
        stack.push(item2);

        const snap = stack.createSnapshot();

        expect(snap.uid).toBe(stack.uid);
        expect(snap.items).toHaveLength(2);
        expect(snap.items[0].uid).toBe(item1.uid);
        expect(snap.items[1].uid).toBe(item2.uid);
        expect(stack.count).toBe(2);
    });

    it('should restore from snapshot correctly', () => {
        const stack = new StackedItem();
        const item1 = new Item('hull_light', repository);
        const item2 = new Item('hull_light', repository);
        stack.push(item1);
        stack.push(item2);

        const snap = stack.createSnapshot();
        const restored = StackedItem.fromSnapshot(snap, repository);

        expect(restored.uid).toBe(stack.uid);
        expect(restored.quantity).toBe(2);
        expect(restored.id).toBe('hull_light');
        expect(restored.items[0].uid).toBe(item1.uid);
        expect(restored.items[1].uid).toBe(item2.uid);
        
        // Ensure restored items are indeed Item instances
        expect(restored.items[0]).toBeInstanceOf(Item);
    });
});
