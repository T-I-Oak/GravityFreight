import { describe, it, expect, beforeEach } from 'vitest';
import Item from '../../../../src/systems/entities/Item';
import StackedItem from '../../../../src/systems/entities/StackedItem';

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
        const item = new Item('hull_light');
        const success = stack.push(item);

        expect(success).toBe(true);
        expect(stack.quantity).toBe(1);
        expect(stack.id).toBe('hull_light');
        expect(stack.uid).toBeDefined();
        expect(stack.representative).toBe(item);
    });

    it('should accept items with same characteristics', () => {
        const stack = new StackedItem();
        const item1 = new Item('hull_light');
        const item2 = new Item('hull_light'); // different uid but equals() is true
        
        stack.push(item1);
        const success = stack.push(item2);

        expect(success).toBe(true);
        expect(stack.quantity).toBe(2);
        expect(stack.items[0]).toBe(item1);
        expect(stack.items[1]).toBe(item2);
    });

    it('should reject items with different characteristics', () => {
        const stack = new StackedItem();
        const item1 = new Item('pad_standard_d2'); // Has 2 charges
        const item2 = new Item('hull_medium'); // Different ID
        const item3 = new Item('pad_standard_d2');
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
        const item1 = new Item('hull_light');
        const item2 = new Item('hull_light');
        
        stack.push(item1);
        stack.push(item2);

        expect(stack.pop()).toBe(item2);
        expect(stack.quantity).toBe(1);
        expect(stack.pop()).toBe(item1);
        expect(stack.quantity).toBe(0);
    });

    it('should reset properties when emptied via pop', () => {
        const stack = new StackedItem();
        const item = new Item('hull_light');
        
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

describe('StackedItem Class - Property Proxy and Performance', () => {
    it('should proxy basic information from the representative item', () => {
        const stack = new StackedItem();
        const item = new Item('hull_light');
        stack.push(item);

        expect(stack.name).toBe(item.name);
        expect(stack.category).toBe(item.category);
        expect(stack.rarity).toBe(item.rarity);
        expect(stack.description).toBe(item.description);
    });

    it('should provide performance values from the representative item', () => {
        const stack = new StackedItem();
        const item = new Item('hull_light');
        stack.push(item);

        // Item has mass, slots, etc.
        expect(stack.performance.mass).toBe(item.mass);
        expect(stack.performance.slots).toBe(item.slots);
    });

    it('should return undefined for proxies when empty', () => {
        const stack = new StackedItem();
        // Natural Failure: accessing representative when null
        expect(stack.name).toBeUndefined();
        expect(stack.performance).toBeUndefined();
    });
});

describe('StackedItem Class - Snapshots', () => {
    it('should generate a valid snapshot including item snapshots', () => {
        const stack = new StackedItem();
        const item1 = new Item('hull_light');
        const item2 = new Item('hull_light');
        stack.push(item1);
        stack.push(item2);

        const snap = stack.getSnapshot();

        expect(snap.uid).toBe(stack.uid);
        expect(snap.itemSnapshots).toHaveLength(2);
        expect(snap.itemSnapshots[0].uid).toBe(item1.uid);
        expect(snap.itemSnapshots[1].uid).toBe(item2.uid);
    });

    it('should restore from snapshot correctly', () => {
        const stack = new StackedItem();
        const item1 = new Item('hull_light');
        const item2 = new Item('hull_light');
        stack.push(item1);
        stack.push(item2);

        const snap = stack.getSnapshot();
        const restored = StackedItem.fromSnapshot(snap);

        expect(restored.uid).toBe(stack.uid);
        expect(restored.quantity).toBe(2);
        expect(restored.id).toBe('hull_light');
        expect(restored.items[0].uid).toBe(item1.uid);
        expect(restored.items[1].uid).toBe(item2.uid);
        
        // Ensure restored items are indeed Item instances
        expect(restored.items[0]).toBeInstanceOf(Item);
    });
});
