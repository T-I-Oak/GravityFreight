import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import PhysicsEngine from '../../../../src/systems/logic/PhysicsEngine.js';

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

describe('PhysicsEngine', () => {
    it('updates velocity and position with gravity, rocket mass, and sector scale', () => {
        const engine = new PhysicsEngine(repository);
        const body = createBody();
        const rocket = createRocket();
        const sector = createSector({ bodies: [body] });

        const result = engine.step(rocket, sector);

        expect(body.getGravityFieldVector).toHaveBeenCalledWith({ x: 0, y: 0 });
        expect(rocket.velocity.x).toBeCloseTo(0.0408);
        expect(rocket.velocity.y).toBe(0);
        expect(rocket.position.x).toBeCloseTo(0.0000816);
        expect(result).toEqual({
            ticks: 1,
            collision: null,
            avoidance: null
        });
    });

    it('applies rocket gravity multiplier to acceleration and advances timed gravity effects', () => {
        const engine = new PhysicsEngine(repository);
        const body = createBody();
        const rocket = createRocket({
            getGravityMultiplier: vi.fn(() => 0.5)
        });
        const sector = createSector({ bodies: [body] });

        engine.step(rocket, sector);

        expect(rocket.velocity.x).toBeCloseTo(0.0204);
        expect(rocket.advanceGravityEffectTick).toHaveBeenCalledTimes(1);
    });

    it('skips gravity vectors for singularity distances below 10px', () => {
        const engine = new PhysicsEngine(repository);
        const body = createBody({ position: { x: 5, y: 0 } });
        const rocket = createRocket();
        const sector = createSector({ bodies: [body] });

        engine.step(rocket, sector);

        expect(body.getGravityFieldVector).not.toHaveBeenCalled();
        expect(rocket.velocity).toEqual({ x: 0, y: 0 });
    });

    it('temporarily ignores the last evasion body for gravity and collision until the rocket leaves its safe range', () => {
        const engine = new PhysicsEngine(repository);
        const body = createBody({
            position: { x: 0, y: 0 },
            radius: 20,
            checkCollision: vi.fn(() => true)
        });
        const rocket = createRocket({
            position: { x: 40, y: 0 },
            lastEvasionBody: body
        });
        const sector = createSector({ bodies: [body] });

        const result = engine.step(rocket, sector);

        expect(body.getGravityFieldVector).not.toHaveBeenCalled();
        expect(body.checkCollision).not.toHaveBeenCalled();
        expect(result.collision).toBeNull();
        expect(rocket.lastEvasionBody).toBe(body);
    });

    it('applies home gravity but ignores home collision until the rocket escapes the home safe range', () => {
        const engine = new PhysicsEngine(repository);
        const home = createBody({
            position: { x: 0, y: 0 },
            radius: 25,
            isHome: true,
            getGravityFieldVector: vi.fn(() => ({ x: -10, y: 0 })),
            checkCollision: vi.fn(() => true)
        });
        const rocket = createRocket({
            position: { x: 25, y: 0 },
            velocity: { x: 100, y: 0 },
            rocketItem: { getMass: vi.fn(() => 10) },
            isSafeToReturn: false
        });
        const sector = createSector({ sectorNumber: 1, bodies: [home] });

        const result = engine.step(rocket, sector);

        expect(home.getGravityFieldVector).toHaveBeenCalledWith({ x: 25, y: 0 });
        expect(home.checkCollision).not.toHaveBeenCalled();
        expect(result.collision).toBeNull();
        expect(rocket.isSafeToReturn).toBe(false);
    });

    it('enables home return collision after the rocket leaves the home safe range', () => {
        const engine = new PhysicsEngine(repository);
        const home = createBody({
            position: { x: 0, y: 0 },
            radius: 25,
            isHome: true,
            checkCollision: vi.fn(() => true)
        });
        const rocket = createRocket({
            position: { x: 56, y: 0 },
            velocity: { x: 100, y: 0 },
            rocketItem: { getMass: vi.fn(() => 10) },
            isSafeToReturn: false
        });
        const sector = createSector({ sectorNumber: 1, bodies: [home] });

        const result = engine.step(rocket, sector);

        expect(rocket.isSafeToReturn).toBe(true);
        expect(home.checkCollision).toHaveBeenCalled();
        expect(result.collision).toEqual({
            type: 'body',
            target: home,
            pos: rocket.position
        });
    });

    it('detects body collision before exits and boundaries', () => {
        const engine = new PhysicsEngine(repository);
        const hitBody = createBody({
            position: { x: 100, y: 0 },
            checkCollision: vi.fn(() => true)
        });
        const exit = {
            checkEntrance: vi.fn(() => true)
        };
        const rocket = createRocket();
        const sector = createSector({
            bodies: [hitBody],
            exits: [exit]
        });

        const result = engine.step(rocket, sector);

        expect(hitBody.checkCollision).toHaveBeenCalledWith(rocket.position, { x: 0, y: 0 }, 3);
        expect(rocket.useAvoidanceModule).toHaveBeenCalledWith('body', hitBody);
        expect(exit.checkEntrance).not.toHaveBeenCalled();
        expect(result.collision).toEqual({
            type: 'body',
            target: hitBody,
            pos: rocket.position
        });
    });

    it('cancels body collision when avoidance succeeds and removes destroyed target', () => {
        const engine = new PhysicsEngine(repository);
        const hitBody = createBody({
            checkCollision: vi.fn(() => true)
        });
        const avoidance = {
            method: 'star_breaker',
            destroyedTarget: hitBody
        };
        const rocket = createRocket({
            useAvoidanceModule: vi.fn(() => avoidance)
        });
        const sector = createSector({
            bodies: [hitBody, createBody({ position: { x: -100, y: 0 } })]
        });

        const result = engine.step(rocket, sector);

        expect(sector.bodies).not.toContain(hitBody);
        expect(result.collision).toBeNull();
        expect(result.avoidance).toBe(avoidance);
    });

    it('detects exit arc entrance before plain boundary loss', () => {
        const engine = new PhysicsEngine(repository);
        const exit = {
            checkEntrance: vi.fn(() => true)
        };
        const rocket = createRocket({
            position: { x: 899, y: 0 },
            velocity: { x: 1000, y: 0 },
            rocketItem: { getMass: vi.fn(() => 10) }
        });
        const sector = createSector({
            sectorNumber: 1,
            exits: [exit]
        });

        const result = engine.step(rocket, sector);

        expect(result.collision.type).toBe('arc');
        expect(result.collision.target).toBe(exit);
        expect(exit.checkEntrance).toHaveBeenCalledWith(rocket.position, 1);
    });

    it('passes rocket arc multiplier to exit entrance checks', () => {
        const engine = new PhysicsEngine(repository);
        const exit = {
            checkEntrance: vi.fn(() => true)
        };
        const rocket = createRocket({
            position: { x: 899, y: 0 },
            velocity: { x: 1000, y: 0 },
            rocketItem: { getMass: vi.fn(() => 10) },
            getArcMultiplier: vi.fn(() => 2)
        });
        const sector = createSector({
            sectorNumber: 1,
            exits: [exit]
        });

        engine.step(rocket, sector);

        expect(exit.checkEntrance).toHaveBeenCalledWith(rocket.position, 2);
    });

    it('detects boundary and allows boundary avoidance to cancel it', () => {
        const engine = new PhysicsEngine(repository);
        const avoidance = {
            method: 'emergency',
            destroyedTarget: null
        };
        const rocket = createRocket({
            position: { x: 899, y: 0 },
            velocity: { x: 1000, y: 0 },
            rocketItem: { getMass: vi.fn(() => 10) },
            useAvoidanceModule: vi.fn(() => avoidance)
        });
        const sector = createSector({ sectorNumber: 1 });

        const result = engine.step(rocket, sector);

        expect(rocket.useAvoidanceModule).toHaveBeenCalledWith('boundary', null);
        expect(result.collision).toBeNull();
        expect(result.avoidance).toBe(avoidance);
    });

    it('keeps velocity changed by cushion or emergency avoidance after state update', () => {
        const engine = new PhysicsEngine(repository);
        const avoidance = {
            method: 'emergency',
            destroyedTarget: null
        };
        const rocket = createRocket({
            position: { x: 899, y: 0 },
            velocity: { x: 1000, y: 0 },
            rocketItem: { getMass: vi.fn(() => 10) },
            useAvoidanceModule: vi.fn(function useAvoidanceModule() {
                rocket.velocity = { x: -1000, y: 0 };
                return avoidance;
            })
        });
        const sector = createSector({ sectorNumber: 1 });

        engine.step(rocket, sector);

        expect(rocket.velocity).toEqual({ x: -1000, y: 0 });
    });

    it('moves picked up items from bodies to the rocket after movement', () => {
        const engine = new PhysicsEngine(repository);
        const item = { id: 'coin_100' };
        const body = createBody({
            checkPickup: vi.fn(() => [item])
        });
        const rocket = createRocket();
        const sector = createSector({ bodies: [body] });

        engine.step(rocket, sector);

        expect(body.checkPickup).toHaveBeenCalledWith(rocket.position, 10);
        expect(rocket.addHeldItem).toHaveBeenCalledWith(item);
    });

    it('requires GameDataRepository for master timing and boundary data', () => {
        expect(() => new PhysicsEngine()).toThrow('[PhysicsEngine] gameDataRepository is required.');
    });
});
