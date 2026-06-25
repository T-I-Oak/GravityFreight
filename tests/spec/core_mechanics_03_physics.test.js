import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../src/core/GameDataRepository.js';
import PhysicsEngine from '../../src/systems/logic/PhysicsEngine.js';
import CelestialBody from '../../src/systems/world/CelestialBody.js';

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

function createRocket(overrides = {}) {
    const rocket = {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        radius: 0,
        ticks: 0,
        rocketItem: {
            getMass: vi.fn(() => 20)
        },
        updateState: vi.fn((pos, vel) => {
            rocket.position = { ...pos };
            rocket.velocity = { ...vel };
            rocket.ticks += 1;
            return rocket.ticks;
        }),
        getCollectionRange: vi.fn(() => 10),
        getArcMultiplier: vi.fn(() => 1),
        getGravityMultiplier: vi.fn(() => 1),
        advanceGravityEffectTick: vi.fn(),
        addHeldItem: vi.fn(),
        useAvoidanceModule: vi.fn(() => null),
        ...overrides
    };

    return rocket;
}

function createBody(overrides = {}) {
    return {
        position: { x: 100, y: 0 },
        getGravityFieldVector: vi.fn(() => ({ x: 0.01, y: 0 })),
        checkCollision: vi.fn(() => false),
        checkPickup: vi.fn(() => []),
        ...overrides
    };
}

function createSector(overrides = {}) {
    return {
        sectorNumber: 2,
        bodies: [],
        exits: [],
        ...overrides
    };
}

describe('core_mechanics.md chapter 3: navigation physics', () => {
    it('exposes the physics constants used by deterministic navigation', () => {
        const config = repository.getMasterConfig();
        const balance = repository.getGameBalance();

        expect(config.simulationTickSeconds).toBe(0.002);
        expect(balance.DEFAULT_SHIP_MASS).toBe(10);
        expect(balance.GRAVITY_SCALING_FACTOR).toBe(0.02);
        expect(balance.SAFE_DISTANCE_FROM_HOME).toBe(30);
    });

    it('applies semi-implicit Euler with rocket mass, sector gravity scaling, and flight gravity multiplier', () => {
        const engine = new PhysicsEngine(repository);
        const body = createBody();
        const rocket = createRocket({
            getGravityMultiplier: vi.fn(() => 0.5)
        });
        const sector = createSector({ bodies: [body] });

        engine.step(rocket, sector);

        expect(body.getGravityFieldVector).toHaveBeenCalledWith({ x: 0, y: 0 });
        expect(rocket.velocity.x).toBeCloseTo(0.0204);
        expect(rocket.velocity.y).toBe(0);
        expect(rocket.position.x).toBeCloseTo(0.0000408);
        expect(rocket.advanceGravityEffectTick).toHaveBeenCalledTimes(1);
    });

    it('skips gravity calculation for bodies inside the singularity avoidance distance', () => {
        const engine = new PhysicsEngine(repository);
        const body = createBody({ position: { x: 5, y: 0 } });
        const rocket = createRocket();
        const sector = createSector({ bodies: [body] });

        engine.step(rocket, sector);

        expect(body.getGravityFieldVector).not.toHaveBeenCalled();
        expect(rocket.velocity).toEqual({ x: 0, y: 0 });
        expect(rocket.position).toEqual({ x: 0, y: 0 });
    });

    it('keeps rocket-specific acceleration scaling out of CelestialBody gravity field vectors', () => {
        const attractiveBody = new CelestialBody({
            position: { x: 90, y: 0 },
            radius: 20
        }, repository);
        const repulsiveBody = new CelestialBody({
            position: { x: 90, y: 0 },
            radius: 20,
            isRepulsion: true
        }, repository);

        expect(attractiveBody.getGravityFieldVector({ x: 0, y: 0 })).toEqual({ x: 1, y: 0 });
        expect(repulsiveBody.getGravityFieldVector({ x: 0, y: 0 })).toEqual({ x: -1, y: -0 });
    });

    it('ignores home-star collision until the rocket leaves the home safe range', () => {
        const engine = new PhysicsEngine(repository);
        const home = createBody({
            position: { x: 0, y: 0 },
            radius: 25,
            isHome: true,
            checkCollision: vi.fn(() => true)
        });
        const rocket = createRocket({
            position: { x: 25, y: 0 },
            velocity: { x: 100, y: 0 },
            rocketItem: { getMass: vi.fn(() => 10) },
            isSafeToReturn: false
        });
        const sector = createSector({
            sectorNumber: 1,
            bodies: [home]
        });

        const result = engine.step(rocket, sector);

        expect(home.checkCollision).not.toHaveBeenCalled();
        expect(result.collision).toBeNull();
        expect(rocket.isSafeToReturn).toBe(false);
    });
});
