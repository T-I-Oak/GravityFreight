import { describe, it, expect, beforeAll, vi } from 'vitest';
import Item from '../../../../src/systems/entities/Item.js';
import ItemContainer from '../../../../src/systems/entities/ItemContainer.js';
import ModuleStack from '../../../../src/systems/entities/ModuleStack.js';
import RocketItem from '../../../../src/systems/entities/RocketItem.js';
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

function createRocketItem() {
    return new RocketItem(
        new Item('hull_medium', repository),
        new Item('sensor_normal', repository),
        [
            new Item('mod_capacity', repository),
            new Item('mod_capacity', repository),
            new Item('mod_stabilizer', repository)
        ]
    );
}

describe('RocketItem', () => {
    it('builds a rocket item from chassis, logic, and grouped modules', () => {
        const rocketItem = createRocketItem();

        expect(rocketItem.uid).toMatch(/^rocketitem_/);
        expect(rocketItem.id).toBe('rocket');
        expect(rocketItem.category).toBe('rocket');
        expect(rocketItem.name).toBe(`${rocketItem.chassis.name} ＋ ${rocketItem.logic.name}`);
        expect(rocketItem.chassis.id).toBe('hull_medium');
        expect(rocketItem.logic.id).toBe('sensor_normal');
        expect(rocketItem.modules).toHaveLength(2);
        expect(rocketItem.modules[0]).toBeInstanceOf(ModuleStack);
        expect(rocketItem.modules.find(module => module.id === 'mod_capacity').count).toBe(2);
    });

    it('aggregates additive and multiplier stats across all components', () => {
        const rocketItem = createRocketItem();

        const parts = [
            rocketItem.chassis,
            rocketItem.logic,
            ...rocketItem.modules.flatMap(module => module.items)
        ];

        expect(rocketItem.getMass()).toBe(parts.reduce((total, item) => total + item.mass, 0));
        expect(rocketItem.getSlots()).toBe(parts.reduce((total, item) => total + item.slots, 0));
        expect(rocketItem.getPrecision()).toBe(parts.reduce((total, item) => total + item.precision, 0));
        expect(rocketItem.getPickupRange()).toBe(parts.reduce((total, item) => total + item.pickupRange, 0));
        expect(rocketItem.getPrecisionMultiplier()).toBe(parts.reduce((total, item) => total * item.precisionMultiplier, 1));
        expect(rocketItem.getPickupMultiplier()).toBe(parts.reduce((total, item) => total * item.pickupMultiplier, 1));
        expect(rocketItem.getGravityMultiplier()).toBe(parts.reduce((total, item) => total * item.gravityMultiplier, 1));
    });

    it('normalizes aggregated multiplier stats to four decimal places for replay stability', () => {
        const rocketItem = new RocketItem(
            new Item('hull_light_plus', repository),
            new Item('sensor_normal', repository),
            [
                new Item('mod_analyzer', repository),
                new Item('mod_analyzer', repository),
                new Item('mod_analyzer', repository)
            ]
        );

        expect(rocketItem.getPrecisionMultiplier()).toBe(2.4883);
    });

    it('exposes composition parts and calculates appraisal as the sum of those parts', () => {
        const rocketItem = createRocketItem();
        const parts = [
            rocketItem.chassis,
            rocketItem.logic,
            ...rocketItem.modules.flatMap(module => module.items)
        ];

        expect(rocketItem.getCompositionParts()).toEqual(parts);
        expect(rocketItem.calculateAppraisalValue()).toBe(
            parts.reduce((total, item) => total + item.calculateAppraisalValue(), 0)
        );
    });

    it('compares equality by composition snapshots, not only aggregate stats', () => {
        const first = new RocketItem(
            new Item('hull_light', repository),
            new Item('sensor_short', repository),
            []
        );
        const sameComposition = RocketItem.fromSnapshot(first.createSnapshot(), repository);
        const differentComposition = new RocketItem(
            new Item('hull_light', repository),
            new Item('sensor_normal', repository),
            []
        );

        expect(first.equals(sameComposition)).toBe(true);
        expect(first.equals(differentComposition)).toBe(false);
    });

    it('does not stack rockets assembled from different materials', () => {
        const container = new ItemContainer();
        const first = new RocketItem(
            new Item('hull_light', repository),
            new Item('sensor_short', repository),
            []
        );
        const second = new RocketItem(
            new Item('hull_light', repository),
            new Item('sensor_normal', repository),
            []
        );

        container.addItem(first);
        container.addItem(second);

        expect(container.stacks).toHaveLength(2);
    });

    it('does not expose aggregate stats as direct properties', () => {
        const rocketItem = createRocketItem();

        expect(rocketItem.mass).toBeUndefined();
        expect(rocketItem.slots).toBeUndefined();
        expect(rocketItem.precisionMultiplier).toBeUndefined();
    });

    it('generates ItemViewData with module stack view data for card details', () => {
        const rocketItem = createRocketItem();
        const viewData = rocketItem.getViewData();

        expect(viewData).toMatchObject({
            uid: rocketItem.uid,
            id: 'rocket',
            name: rocketItem.name,
            category: 'rocket'
        });
        expect(viewData.stats.mass.value).toBe(rocketItem.getMass());
        expect(viewData.stats.slots.value).toBe(rocketItem.getSlots());
        expect(viewData.stats.precisionMultiplier.value).toBe(rocketItem.getPrecisionMultiplier());
        expect(viewData.modules).toHaveLength(2);
        expect(viewData.modules.map(module => module.uid)).toEqual(rocketItem.modules.map(module => module.uid));
        expect(viewData.modules.some(module => module.uid === rocketItem.chassis.uid)).toBe(false);
        expect(viewData.modules.some(module => module.uid === rocketItem.logic.uid)).toBe(false);
        expect(viewData.modules.some(module => module.count === 2)).toBe(true);
    });

    it('creates and restores snapshots without storing derived stats', () => {
        const rocketItem = createRocketItem();
        const snapshot = rocketItem.createSnapshot();
        const restored = RocketItem.fromSnapshot(snapshot, repository);

        expect(snapshot).toEqual({
            uid: rocketItem.uid,
            chassis: rocketItem.chassis.createSnapshot(),
            logic: rocketItem.logic.createSnapshot(),
            modules: rocketItem.modules.map(module => module.createSnapshot())
        });
        expect(restored.uid).toBe(rocketItem.uid);
        expect(restored.name).toBe(rocketItem.name);
        expect(restored.modules.map(module => module.uid)).toEqual(rocketItem.modules.map(module => module.uid));
        expect(restored.getMass()).toBe(rocketItem.getMass());
        expect(restored.getPrecisionMultiplier()).toBe(rocketItem.getPrecisionMultiplier());
    });
});
