import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import Item from '../../../../src/systems/entities/Item.js';
import Rocket from '../../../../src/systems/entities/Rocket.js';
import RocketItem from '../../../../src/systems/entities/RocketItem.js';
import PhysicsEngine from '../../../../src/systems/logic/PhysicsEngine.js';
import TrajectoryPredictor from '../../../../src/systems/logic/TrajectoryPredictor.js';

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

function createRocketClone(precision = 3) {
    return {
        actualTrail: [],
        isGhost: false,
        setGhost: vi.fn(function setGhost() {
            this.isGhost = true;
        }),
        getPrecision: vi.fn(() => precision)
    };
}

function createRocket(rocketClone) {
    return {
        clone: vi.fn(() => rocketClone)
    };
}

function createSector(sectorClone) {
    return {
        clone: vi.fn(() => sectorClone)
    };
}

describe('TrajectoryPredictor', () => {
    it('requires a PhysicsEngine dependency', () => {
        expect(() => new TrajectoryPredictor()).toThrow('[TrajectoryPredictor] physicsEngine is required.');
    });

    it('simulates cloned rocket and sector up to rocket precision', () => {
        const rocketClone = createRocketClone(3);
        const sectorClone = { id: 'sector-clone' };
        const rocket = createRocket(rocketClone);
        const sector = createSector(sectorClone);
        const physicsEngine = {
            step: vi.fn(predictionRocket => {
                predictionRocket.actualTrail.push({ x: predictionRocket.actualTrail.length, y: 0 });
                return { collision: null };
            })
        };
        const predictor = new TrajectoryPredictor(physicsEngine);

        const result = predictor.predictPath(rocket, sector);

        expect(result).toBe(rocketClone);
        expect(rocket.clone).toHaveBeenCalledTimes(1);
        expect(sector.clone).toHaveBeenCalledTimes(1);
        expect(rocketClone.setGhost).toHaveBeenCalledTimes(1);
        expect(rocketClone.isGhost).toBe(true);
        expect(rocketClone.getPrecision).toHaveBeenCalledTimes(1);
        expect(physicsEngine.step).toHaveBeenCalledTimes(3);
        expect(physicsEngine.step).toHaveBeenNthCalledWith(1, rocketClone, sectorClone);
        expect(rocketClone.actualTrail).toEqual([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 }
        ]);
    });

    it('stops prediction on first collision result', () => {
        const rocketClone = createRocketClone(10);
        const sectorClone = { id: 'sector-clone' };
        const rocket = createRocket(rocketClone);
        const sector = createSector(sectorClone);
        const physicsEngine = {
            step: vi.fn()
                .mockReturnValueOnce({ collision: null })
                .mockReturnValueOnce({ collision: { type: 'boundary' } })
                .mockReturnValue({ collision: null })
        };
        const predictor = new TrajectoryPredictor(physicsEngine);

        predictor.predictPath(rocket, sector);

        expect(physicsEngine.step).toHaveBeenCalledTimes(2);
    });

    it('does not mutate the original rocket or sector during prediction', () => {
        const rocketClone = createRocketClone(1);
        const sectorClone = { bodies: [] };
        const rocket = createRocket(rocketClone);
        const sector = createSector(sectorClone);
        const physicsEngine = {
            step: vi.fn(predictionRocket => {
                predictionRocket.actualTrail.push({ x: 5, y: 5 });
                return { collision: null };
            })
        };
        const predictor = new TrajectoryPredictor(physicsEngine);

        predictor.predictPath(rocket, sector);

        expect(rocket.actualTrail).toBeUndefined();
        expect(sector.bodies).toBeUndefined();
        expect(rocketClone.actualTrail).toEqual([{ x: 5, y: 5 }]);
    });

    it('floors non-integer precision and skips simulation when precision is zero or lower', () => {
        const rocketClone = createRocketClone(2.8);
        const sectorClone = {};
        const rocket = createRocket(rocketClone);
        const sector = createSector(sectorClone);
        const physicsEngine = {
            step: vi.fn(() => ({ collision: null }))
        };
        const predictor = new TrajectoryPredictor(physicsEngine);

        predictor.predictPath(rocket, sector);
        expect(physicsEngine.step).toHaveBeenCalledTimes(2);

        const zeroRocketClone = createRocketClone(0);
        predictor.predictPath(createRocket(zeroRocketClone), sector);
        expect(physicsEngine.step).toHaveBeenCalledTimes(2);
    });

    it('uses real cloned Rocket and Sector objects for ghost prediction without mutating originals', () => {
        const rocketItem = new RocketItem(
            new Item('hull_medium', repository),
            new Item('sensor_normal', repository),
            [new Item('mod_gst_emergency', repository)]
        );
        const launcher = new Item('pad_standard_d2', repository);
        const rocket = new Rocket(rocketItem, launcher, null, 0, { x: 899, y: 0 });
        rocket.velocity = { x: 1000, y: 0 };
        const sector = {
            clone: vi.fn(() => ({
                sectorNumber: 1,
                bodies: [],
                exits: []
            }))
        };
        const predictor = new TrajectoryPredictor(new PhysicsEngine(repository));

        const predicted = predictor.predictPath(rocket, sector);

        expect(predicted).not.toBe(rocket);
        expect(predicted.isGhost).toBe(true);
        expect(predicted.actualTrail.length).toBeGreaterThan(0);
        expect(predicted.velocity.x).toBeLessThan(0);
        expect(rocket.isGhost).toBe(false);
        expect(rocket.actualTrail).toEqual([]);
        expect(rocket.rocketItem.modules[0].charges).toBe(1);
    });
});
