import { describe, it, expect, beforeAll, vi } from 'vitest';
import Item from '../../../../src/systems/entities/Item.js';
import ModuleStack from '../../../../src/systems/entities/ModuleStack.js';
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

describe('ModuleStack', () => {
    it('groups same-id modules even when charges differ', () => {
        const item1 = new Item('mod_star_breaker', repository);
        const item2 = new Item('mod_star_breaker', repository);
        item2.consumeCharge(1);

        const stack = new ModuleStack(item1);
        stack.add(item2);

        expect(stack.id).toBe('mod_star_breaker');
        expect(stack.count).toBe(2);
        expect(stack.items).toEqual([item1, item2]);
        expect(stack.charges).toBe(item1.charges + item2.charges);
        expect(stack.maxCharges).toBe(item1.maxCharges + item2.maxCharges);
    });

    it('rejects modules with different ids', () => {
        const stack = new ModuleStack(new Item('mod_star_breaker', repository));

        expect(() => stack.add(new Item('mod_cushion', repository))).toThrow('[ModuleStack] Cannot add different item id: mod_cushion');
    });

    it('consumes the lowest non-zero charge first and never removes items', () => {
        const item1 = new Item('mod_star_breaker', repository);
        const item2 = new Item('mod_star_breaker', repository);
        item1.consumeCharge(1);

        const stack = new ModuleStack(item1);
        stack.add(item2);
        const beforeCount = stack.count;
        const beforeCharges = stack.charges;

        expect(stack.consumeCharge()).toBe(true);
        expect(item1.charges).toBe(1);
        expect(stack.count).toBe(beforeCount);
        expect(stack.charges).toBe(beforeCharges - 1);
    });

    it('returns false when no module charge remains', () => {
        const item = new Item('mod_star_breaker', repository);
        const stack = new ModuleStack(item);

        stack.consumeCharge();
        stack.consumeCharge();
        stack.consumeCharge();

        expect(stack.consumeCharge()).toBe(false);
    });

    it('creates and restores snapshots without storing derived totals', () => {
        const stack = new ModuleStack(new Item('mod_star_breaker', repository));
        stack.add(new Item('mod_star_breaker', repository));

        const snapshot = stack.createSnapshot();
        const restored = ModuleStack.fromSnapshot(snapshot, repository);

        expect(snapshot).toEqual({
            uid: stack.uid,
            items: stack.items.map(item => item.createSnapshot())
        });
        expect(restored.uid).toBe(stack.uid);
        expect(restored.id).toBe(stack.id);
        expect(restored.count).toBe(2);
        expect(restored.charges).toBe(stack.charges);
        expect(restored.maxCharges).toBe(stack.maxCharges);
    });

    it('normalizes aggregated multiplier stats to four decimal places for replay stability', () => {
        const stack = new ModuleStack(new Item('mod_analyzer', repository));
        stack.add(new Item('mod_analyzer', repository));
        stack.add(new Item('mod_analyzer', repository));
        stack.add(new Item('mod_analyzer', repository));
        stack.add(new Item('mod_analyzer', repository));

        expect(stack.getViewData().stats.precisionMultiplier.value).toBe(2.4883);
    });
});
