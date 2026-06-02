import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../src/core/GameDataRepository.js';
import Item from '../../src/systems/entities/Item.js';
import Rocket from '../../src/systems/entities/Rocket.js';
import RocketItem from '../../src/systems/entities/RocketItem.js';

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

function item(id) {
    return new Item(id, repository);
}

function sum(items, key) {
    return items.reduce((total, current) => total + (current[key] ?? 0), 0);
}

function multiply(items, key) {
    return items.reduce((total, current) => total * (current[key] ?? 1), 1);
}

describe('item_catalog.md chapter 2: spec calculation rules', () => {
    it('treats missing additive stats as 0 and missing multipliers as 1.0', () => {
        const standardLauncher = item('pad_standard_d2');

        expect(standardLauncher.power).toBe(1200);
        expect(standardLauncher.precision).toBe(0);
        expect(standardLauncher.pickupRange).toBe(0);
        expect(standardLauncher.precisionMultiplier).toBe(1.0);
        expect(standardLauncher.pickupMultiplier).toBe(1.0);
        expect(standardLauncher.gravityMultiplier).toBe(1.0);
        expect(standardLauncher.powerMultiplier).toBe(1.0);
        expect(standardLauncher.arcMultiplier).toBe(1.0);
    });

    it('aggregates rocket component additive stats by summing each value', () => {
        const parts = [
            item('hull_medium_plus'),
            item('sensor_short'),
            item('mod_capacity'),
            item('mod_capacity'),
            item('mod_analyzer')
        ];
        const rocketItem = new RocketItem(parts[0], parts[1], parts.slice(2));

        expect(rocketItem.getMass()).toBe(sum(parts, 'mass'));
        expect(rocketItem.getSlots()).toBe(sum(parts, 'slots'));
        expect(rocketItem.getPrecision()).toBe(sum(parts, 'precision'));
        expect(rocketItem.getPickupRange()).toBe(sum(parts, 'pickupRange'));
    });

    it('aggregates rocket component multiplier stats by multiplying from 1.0', () => {
        const parts = [
            item('hull_medium_plus'),
            item('sensor_long'),
            item('mod_stabilizer'),
            item('mod_analyzer')
        ];
        const rocketItem = new RocketItem(parts[0], parts[1], parts.slice(2));

        expect(rocketItem.getPrecisionMultiplier()).toBeCloseTo(multiply(parts, 'precisionMultiplier'));
        expect(rocketItem.getPickupMultiplier()).toBeCloseTo(multiply(parts, 'pickupMultiplier'));
        expect(rocketItem.getGravityMultiplier()).toBeCloseTo(multiply(parts, 'gravityMultiplier'));
        expect(rocketItem.getPowerMultiplier()).toBeCloseTo(multiply(parts, 'powerMultiplier'));
        expect(rocketItem.getArcMultiplier()).toBeCloseTo(multiply(parts, 'arcMultiplier'));
    });

    it('applies additive and multiplicative rules to final launch specs', () => {
        const parts = [
            item('hull_light_plus'),
            item('sensor_long'),
            item('mod_analyzer')
        ];
        const rocketItem = new RocketItem(parts[0], parts[1], parts.slice(2));
        const launcher = item('pad_precision_d2');
        const booster = item('boost_power');
        const rocket = new Rocket(rocketItem, launcher, booster, Math.PI / 2);
        const launchItems = [rocketItem, launcher, booster];

        const expectedPower = (rocketItem.getPower() + launcher.power + (booster.power ?? 0))
            * rocketItem.getPowerMultiplier()
            * launcher.powerMultiplier
            * booster.powerMultiplier;
        const expectedPrecision = (rocketItem.getPrecision() + launcher.precision + (booster.precision ?? 0))
            * rocketItem.getPrecisionMultiplier()
            * launcher.precisionMultiplier
            * booster.precisionMultiplier;
        const expectedPickupRange = (rocketItem.getPickupRange() + launcher.pickupRange + (booster.pickupRange ?? 0))
            * rocketItem.getPickupMultiplier()
            * launcher.pickupMultiplier
            * booster.pickupMultiplier;

        expect(launchItems).toHaveLength(3);
        expect(rocket.getInitialVelocity().x).toBeCloseTo(0, 10);
        expect(rocket.getInitialVelocity().y).toBeCloseTo(expectedPower, 10);
        expect(rocket.getPrecision()).toBeCloseTo(expectedPrecision);
        expect(rocket.getCollectionRange()).toBeCloseTo(expectedPickupRange);
    });
});
