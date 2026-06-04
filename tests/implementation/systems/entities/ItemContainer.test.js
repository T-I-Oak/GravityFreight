import { describe, it, expect, beforeAll, vi } from 'vitest';
import Item from '../../../../src/systems/entities/Item.js';
import ItemContainer from '../../../../src/systems/entities/ItemContainer.js';
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

describe('ItemContainer', () => {
    it('stacks items with identical id and performance', () => {
        const container = new ItemContainer();

        container.addItem(new Item('hull_light', repository));
        container.addItem(new Item('hull_light', repository));

        expect(container.stacks).toHaveLength(1);
        expect(container.stacks[0].count).toBe(2);
    });

    it('separates items with same id but different performance', () => {
        const container = new ItemContainer();
        const damaged = new Item('pad_standard_d2', repository);
        damaged.consumeCharge(1);

        container.addItem(new Item('pad_standard_d2', repository));
        container.addItem(damaged);

        expect(container.stacks).toHaveLength(2);
    });

    it('filters stacks by representative category', () => {
        const container = new ItemContainer();
        container.addItem(new Item('hull_light', repository));
        container.addItem(new Item('sensor_normal', repository));

        expect(container.getItemsByCategory('chassis')).toHaveLength(1);
        expect(container.getItemsByCategory('logic')).toHaveLength(1);
        expect(container.getItemsByCategory('booster')).toEqual([]);
    });

    it('pops one item by stack uid and removes empty stacks', () => {
        const container = new ItemContainer();
        const item = new Item('hull_light', repository);
        container.addItem(item);
        const stackUid = container.stacks[0].uid;

        expect(container.popItemByUid(stackUid)).toBe(item);
        expect(container.stacks).toEqual([]);
        expect(container.popItemByUid(stackUid)).toBeNull();
    });

    it('checks and removes a specific item instance', () => {
        const container = new ItemContainer();
        const first = new Item('hull_light', repository);
        const second = new Item('hull_light', repository);
        container.addItem(first);
        container.addItem(second);

        expect(container.hasItem(first)).toBe(true);
        expect(container.removeItem(first)).toBe(first);
        expect(container.hasItem(first)).toBe(false);
        expect(container.hasItem(second)).toBe(true);
        expect(container.stacks[0].count).toBe(1);
        expect(container.removeItem(first)).toBeNull();
    });
});
