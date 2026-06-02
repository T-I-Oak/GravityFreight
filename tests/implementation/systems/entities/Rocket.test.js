import { describe, it, expect, beforeAll, vi } from 'vitest';
import Item from '../../../../src/systems/entities/Item.js';
import Rocket from '../../../../src/systems/entities/Rocket.js';
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

function createRocketParts() {
    const rocketItem = new RocketItem(
        new Item('hull_medium', repository),
        new Item('sensor_normal', repository),
        [new Item('mod_capacity', repository)]
    );
    const launcher = new Item('pad_standard_d2', repository);
    const booster = new Item('boost_power', repository);

    return { rocketItem, launcher, booster };
}

describe('Rocket', () => {
    it('initializes flight state from launch equipment', () => {
        const { rocketItem, launcher, booster } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, booster, Math.PI / 2);

        expect(rocket.uid).toMatch(/^rocket_/);
        expect(rocket.rocketItem).toBe(rocketItem);
        expect(rocket.launcher).toBe(launcher);
        expect(rocket.booster).toBe(booster);
        expect(rocket.angle).toBe(Math.PI / 2);
        expect(rocket.position).toEqual({ x: 0, y: 0 });
        expect(rocket.velocity).toEqual({ x: 0, y: 0 });
        expect(rocket.actualTrail).toEqual([]);
        expect(rocket.ticks).toBe(0);
        expect(rocket.heldCargo).toEqual([]);
        expect(rocket.isGhost).toBe(false);
    });

    it('updates physical state and records trail ticks', () => {
        const { rocketItem, launcher } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, null, 0);

        const ticks = rocket.updateState({ x: 10, y: 20 }, { x: 3, y: 4 });

        expect(ticks).toBe(1);
        expect(rocket.position).toEqual({ x: 10, y: 20 });
        expect(rocket.velocity).toEqual({ x: 3, y: 4 });
        expect(rocket.actualTrail).toEqual([{ x: 10, y: 20 }]);
    });

    it('calculates initial velocity from launch power and multipliers', () => {
        const { rocketItem, launcher, booster } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, booster, Math.PI / 2);

        const velocity = rocket.getInitialVelocity(0.5);
        const expectedSpeed = (rocketItem.getPower() + launcher.power + (booster.power ?? 0))
            * rocketItem.getPowerMultiplier()
            * launcher.powerMultiplier
            * booster.powerMultiplier
            * 1.5;

        expect(velocity.x).toBeCloseTo(0, 10);
        expect(velocity.y).toBeCloseTo(expectedSpeed, 10);
    });

    it('calculates collection range and prediction precision from launch configuration', () => {
        const { rocketItem, launcher, booster } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, booster, 0);

        expect(rocket.getCollectionRange()).toBe(
            (rocketItem.getPickupRange() + launcher.pickupRange + booster.pickupRange)
            * rocketItem.getPickupMultiplier()
            * launcher.pickupMultiplier
            * booster.pickupMultiplier
        );
        expect(rocket.getPrecision()).toBe(
            (rocketItem.getPrecision() + launcher.precision + booster.precision)
            * rocketItem.getPrecisionMultiplier()
            * launcher.precisionMultiplier
            * booster.precisionMultiplier
        );
    });

    it('calculates arc multiplier from launch configuration', () => {
        const rocketItem = new RocketItem(
            new Item('hull_medium', repository),
            new Item('sensor_normal', repository),
            []
        );
        const launcher = new Item('pad_standard_d2', repository);
        const booster = new Item('boost_expander', repository);
        const rocket = new Rocket(rocketItem, launcher, booster, 0);

        expect(rocket.getArcMultiplier()).toBe(
            rocketItem.getArcMultiplier()
            * launcher.arcMultiplier
            * booster.arcMultiplier
        );
    });

    it('stores held items and exposes flight result data', () => {
        const { rocketItem, launcher } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, null, 0);
        const cargo = new Item('cargo_safe', repository);

        rocket.updateState({ x: 1, y: 1 }, { x: 0, y: 0 });
        rocket.addHeldItem(cargo);

        expect(rocket.heldCargo).toEqual([cargo]);
        expect(rocket.getFlightResult()).toEqual({
            ticks: 1,
            heldCargo: [cargo]
        });
    });

    it('exposes the avoidance module interface without concrete behavior yet', () => {
        const { rocketItem, launcher } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, null, 0);

        expect(rocket.useAvoidanceModule('body', {})).toBeNull();
        expect(rocket.useAvoidanceModule('boundary', null)).toBeNull();
    });

    it('marks cloned prediction rockets as ghosts only through setGhost', () => {
        const { rocketItem, launcher } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, null, 0);

        rocket.setGhost();
        rocket.setGhost();

        expect(rocket.isGhost).toBe(true);
    });

    it('creates and restores snapshots including nested launch equipment', () => {
        const { rocketItem, launcher, booster } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, booster, 0.25, { x: 5, y: 6 });
        const cargo = new Item('cargo_safe', repository);

        rocket.updateState({ x: 7, y: 8 }, { x: 9, y: 10 });
        rocket.addHeldItem(cargo);
        rocket.setGhost();

        const snapshot = rocket.createSnapshot();
        const restored = Rocket.fromSnapshot(snapshot, repository);

        expect(snapshot).toEqual({
            uid: rocket.uid,
            rocketItem: rocketItem.createSnapshot(),
            launcher: launcher.createSnapshot(),
            booster: booster.createSnapshot(),
            angle: 0.25,
            position: { x: 7, y: 8 },
            velocity: { x: 9, y: 10 },
            actualTrail: [{ x: 7, y: 8 }],
            ticks: 1,
            heldCargo: [cargo.createSnapshot()],
            isGhost: true
        });
        expect(restored.uid).toBe(rocket.uid);
        expect(restored.rocketItem.getMass()).toBe(rocketItem.getMass());
        expect(restored.launcher.uid).toBe(launcher.uid);
        expect(restored.booster.uid).toBe(booster.uid);
        expect(restored.heldCargo[0]).toBeInstanceOf(Item);
        expect(restored.heldCargo[0].uid).toBe(cargo.uid);
        expect(restored.actualTrail).toEqual([{ x: 7, y: 8 }]);
        expect(restored.isGhost).toBe(true);
    });

    it('clones current state without sharing mutable arrays or child instances', () => {
        const { rocketItem, launcher, booster } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, booster, 0);
        rocket.updateState({ x: 1, y: 2 }, { x: 3, y: 4 });

        const clone = rocket.clone(repository);
        clone.updateState({ x: 10, y: 20 }, { x: 30, y: 40 });
        clone.launcher.consumeCharge(1);

        expect(clone).not.toBe(rocket);
        expect(clone.uid).toBe(rocket.uid);
        expect(clone.rocketItem).not.toBe(rocket.rocketItem);
        expect(clone.launcher).not.toBe(rocket.launcher);
        expect(clone.actualTrail).toHaveLength(2);
        expect(rocket.actualTrail).toHaveLength(1);
        expect(clone.launcher.charges).not.toBe(rocket.launcher.charges);
    });

    it('updates launch configuration through setters', () => {
        const { rocketItem, launcher, booster } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, null, 0);
        const nextRocketItem = new RocketItem(
            new Item('hull_light', repository),
            new Item('sensor_short', repository),
            []
        );
        const nextLauncher = new Item('pad_precision_d2', repository);

        rocket.setRocketItem(nextRocketItem);
        rocket.setLauncher(nextLauncher);
        rocket.setBooster(booster);
        rocket.setAngle(1.25);

        expect(rocket.rocketItem).toBe(nextRocketItem);
        expect(rocket.launcher).toBe(nextLauncher);
        expect(rocket.booster).toBe(booster);
        expect(rocket.angle).toBe(1.25);
    });
});
