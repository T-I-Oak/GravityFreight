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

function createRocketPartsWithModules(moduleIds) {
    const rocketItem = new RocketItem(
        new Item('hull_medium', repository),
        new Item('sensor_normal', repository),
        moduleIds.map(id => new Item(id, repository))
    );
    const launcher = new Item('pad_standard_d2', repository);

    return { rocketItem, launcher };
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
        expect(rocket.isSafeToReturn).toBe(false);
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

    it('keeps the full real flight trail for share images and result data', () => {
        const { rocketItem, launcher } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, null, 0);

        for (let index = 0; index < 90; index += 1) {
            rocket.updateState({ x: index, y: 0 }, { x: 1, y: 0 });
        }

        expect(rocket.actualTrail).toHaveLength(90);
        expect(rocket.actualTrail[0]).toEqual({ x: 0, y: 0 });
        expect(rocket.actualTrail.at(-1)).toEqual({ x: 89, y: 0 });
    });

    it('keeps ghost prediction trails in the same full-history structure', () => {
        const { rocketItem, launcher } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, null, 0);
        rocket.setGhost();

        for (let index = 0; index < 90; index += 1) {
            rocket.updateState({ x: index, y: 0 }, { x: 1, y: 0 });
        }

        expect(rocket.actualTrail).toHaveLength(90);
    });

    it('calculates initial velocity from launch power and multipliers', () => {
        const { rocketItem, launcher, booster } = createRocketParts();
        const rocket = new Rocket(rocketItem, launcher, booster, Math.PI / 2);

        const velocity = rocket.getInitialVelocity(0.5);
        const expectedSpeed = (rocketItem.getPower() + launcher.power + (booster.power ?? 0))
            * rocketItem.getPowerMultiplier()
            * launcher.powerMultiplier
            * booster.powerMultiplier
            * 1.5
            * Math.sqrt(repository.getGameBalance().DEFAULT_SHIP_MASS / rocketItem.getMass());

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

    it('normalizes derived flight values to four decimal places for replay stability', () => {
        const rocketItem = new RocketItem(
            new Item('hull_light_plus', repository),
            new Item('sensor_normal', repository),
            [
                new Item('mod_analyzer', repository),
                new Item('mod_analyzer', repository),
                new Item('mod_analyzer', repository)
            ]
        );
        const launcher = new Item('pad_precision_d2', repository);
        const rocket = new Rocket(rocketItem, launcher, null, 0);

        expect(rocket.getPrecision()).toBe(298.6);
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

    it('calculates gravity multiplier from launch configuration', () => {
        const rocketItem = new RocketItem(
            new Item('hull_medium', repository),
            new Item('sensor_gravity', repository),
            [new Item('mod_stabilizer', repository)]
        );
        const launcher = new Item('pad_standard_d2', repository);
        const rocket = new Rocket(rocketItem, launcher, null, 0);

        expect(rocket.getGravityMultiplier()).toBeCloseTo(0.72);
    });

    it('applies timed booster gravity multiplier only while its duration remains', () => {
        const rocketItem = new RocketItem(
            new Item('hull_medium', repository),
            new Item('sensor_normal', repository),
            []
        );
        const launcher = new Item('pad_standard_d2', repository);
        const booster = new Item('boost_flash', repository);
        booster.duration = 2;
        const rocket = new Rocket(rocketItem, launcher, booster, 0);

        expect(rocket.getGravityMultiplier()).toBeCloseTo(0.1);
        rocket.advanceGravityEffectTick();
        expect(rocket.getGravityMultiplier()).toBeCloseTo(0.1);
        rocket.advanceGravityEffectTick();
        expect(rocket.getGravityMultiplier()).toBeCloseTo(1);
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
            heldCargo: [cargo],
            rocketItem
        });
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
        rocket.isSafeToReturn = true;

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
            isGhost: true,
            isSafeToReturn: true,
            gravityEffectTicksRemaining: 0
        });
        expect(restored.uid).toBe(rocket.uid);
        expect(restored.rocketItem.getMass()).toBe(rocketItem.getMass());
        expect(restored.launcher.uid).toBe(launcher.uid);
        expect(restored.booster.uid).toBe(booster.uid);
        expect(restored.heldCargo[0]).toBeInstanceOf(Item);
        expect(restored.heldCargo[0].uid).toBe(cargo.uid);
        expect(restored.actualTrail).toEqual([{ x: 7, y: 8 }]);
        expect(restored.isGhost).toBe(true);
        expect(restored.isSafeToReturn).toBe(true);
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

    it('uses star breaker first on body collision and consumes one real charge', () => {
        const { rocketItem, launcher } = createRocketPartsWithModules(['mod_star_breaker', 'mod_cushion']);
        const rocket = new Rocket(rocketItem, launcher, null, 0);
        const target = { position: { x: 10, y: 0 } };

        const result = rocket.useAvoidanceModule('body', target);

        expect(result).toEqual({
            method: 'star_breaker',
            destroyedTarget: target
        });
        expect(rocketItem.modules.find(module => module.id === 'mod_star_breaker').charges).toBe(2);
        expect(rocketItem.modules.find(module => module.id === 'mod_cushion').charges).toBe(3);
    });

    it('uses cushion on body collision when breaker is unavailable and reflects velocity', () => {
        const { rocketItem, launcher } = createRocketPartsWithModules(['mod_cushion']);
        const rocket = new Rocket(rocketItem, launcher, null, 0, { x: 10, y: 0 });
        rocket.velocity = { x: -4, y: 3 };
        const target = {
            position: { x: 0, y: 0 }
        };

        const result = rocket.useAvoidanceModule('body', target);

        expect(result).toEqual({
            method: 'cushion',
            destroyedTarget: null
        });
        expect(rocket.velocity).toEqual({ x: 4, y: 3 });
        expect(rocketItem.modules.find(module => module.id === 'mod_cushion').charges).toBe(2);
    });

    it('uses emergency thruster on boundary collision and reflects velocity across the boundary normal', () => {
        const { rocketItem, launcher } = createRocketPartsWithModules(['mod_emergency']);
        const rocket = new Rocket(rocketItem, launcher, null, 0, { x: 900, y: 0 });
        rocket.velocity = { x: 5, y: 2 };

        const result = rocket.useAvoidanceModule('boundary', null);

        expect(result).toEqual({
            method: 'emergency',
            destroyedTarget: null
        });
        expect(rocket.velocity).toEqual({ x: -5, y: 2 });
        expect(rocketItem.modules.find(module => module.id === 'mod_emergency').charges).toBe(2);
    });

    it('uses ghost modules as one-shot trial avoidance modules during real flight', () => {
        const { rocketItem, launcher } = createRocketPartsWithModules(['mod_gst_breaker']);
        const rocket = new Rocket(rocketItem, launcher, null, 0);
        const target = { position: { x: 10, y: 0 } };

        const result = rocket.useAvoidanceModule('body', target);

        expect(result).toEqual({
            method: 'star_breaker',
            destroyedTarget: target
        });
        expect(rocketItem.modules.find(module => module.id === 'mod_gst_breaker').charges).toBe(0);
        expect(rocket.useAvoidanceModule('body', target)).toBeNull();
    });

    it('ignores real modules and does not consume ghost module charges when predicting', () => {
        const { rocketItem, launcher } = createRocketPartsWithModules(['mod_star_breaker', 'mod_gst_breaker']);
        const rocket = new Rocket(rocketItem, launcher, null, 0);
        const target = { position: { x: 10, y: 0 } };
        rocket.setGhost();

        const result = rocket.useAvoidanceModule('body', target);

        expect(result).toEqual({
            method: 'star_breaker',
            destroyedTarget: target
        });
        expect(rocketItem.modules.find(module => module.id === 'mod_star_breaker').charges).toBe(3);
        expect(rocketItem.modules.find(module => module.id === 'mod_gst_breaker').charges).toBe(1);
    });

    it('keeps ghost module prediction effects after their real-flight trial charge is depleted', () => {
        const { rocketItem, launcher } = createRocketPartsWithModules(['mod_gst_breaker']);
        const breaker = rocketItem.modules.find(module => module.id === 'mod_gst_breaker');
        breaker.consumeCharge();
        const rocket = new Rocket(rocketItem, launcher, null, 0);
        const target = { position: { x: 10, y: 0 } };
        rocket.setGhost();

        expect(rocket.useAvoidanceModule('body', target)).toEqual({
            method: 'star_breaker',
            destroyedTarget: target
        });
        expect(breaker.charges).toBe(0);
    });

    it('uses ghost breaker before ghost cushion when both are available', () => {
        const { rocketItem, launcher } = createRocketPartsWithModules(['mod_gst_breaker', 'mod_gst_cushion']);
        const rocket = new Rocket(rocketItem, launcher, null, 0, { x: 10, y: 0 });
        rocket.velocity = { x: -4, y: 0 };
        rocket.setGhost();

        const result = rocket.useAvoidanceModule('body', { position: { x: 0, y: 0 } });

        expect(result.method).toBe('star_breaker');
        expect(rocket.velocity).toEqual({ x: -4, y: 0 });
        expect(rocketItem.modules.find(module => module.id === 'mod_gst_breaker').charges).toBe(1);
        expect(rocketItem.modules.find(module => module.id === 'mod_gst_cushion').charges).toBe(1);
    });

    it('returns null for real-flight ghost avoidance modules after their trial charge is depleted', () => {
        const { rocketItem, launcher } = createRocketPartsWithModules(['mod_gst_breaker']);
        const rocket = new Rocket(rocketItem, launcher, null, 0);
        const target = { position: { x: 10, y: 0 } };

        expect(rocket.useAvoidanceModule('body', target)).toEqual({
            method: 'star_breaker',
            destroyedTarget: target
        });
        expect(rocket.useAvoidanceModule('body', target)).toBeNull();
    });

    it('returns null when matching avoidance modules are missing or depleted', () => {
        const { rocketItem, launcher } = createRocketPartsWithModules(['mod_star_breaker']);
        const breaker = rocketItem.modules.find(module => module.id === 'mod_star_breaker');
        breaker.consumeCharge();
        breaker.consumeCharge();
        breaker.consumeCharge();
        const rocket = new Rocket(rocketItem, launcher, null, 0);

        expect(rocket.useAvoidanceModule('body', { position: { x: 0, y: 0 } })).toBeNull();
        expect(rocket.useAvoidanceModule('boundary', null)).toBeNull();
    });
});
