import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../src/core/GameDataRepository.js';

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

describe('core_mechanics.md chapter 2: world, coordinates, and time', () => {
    it('exposes the world boundary and home star origin as world-coordinate constants', () => {
        const config = repository.getMasterConfig();

        expect(config.boundaryRadius).toBe(900);
        expect(config.homeStarPosition).toEqual({ x: 0, y: 0 });
        expect(config.homeStarRadius).toBeGreaterThan(0);
        expect(config.homeStarMass).toBeGreaterThan(0);
    });

    it('exposes sector placement constants from the chapter 2 generation rules', () => {
        const config = repository.getMasterConfig();

        expect(config.baseCelestialCount).toBe(5);
        expect(config.minBodyDistance).toBe(180);
        expect(config.placementAttemptLimit).toBe(100);
        expect(config.placementLimitRadius).toBeLessThan(config.boundaryRadius);
    });

    it('exposes the simulation tick duration used by deterministic physics', () => {
        const config = repository.getMasterConfig();

        expect(config.simulationTickSeconds).toBe(0.002);
    });
});
