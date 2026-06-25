import { beforeAll, describe, expect, it, vi } from 'vitest';
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

describe('core_mechanics.md chapter 1: game overview and terms', () => {
    it('defines item master categories for rocket components, launch gears, and resources', () => {
        const componentCategories = ['chassis', 'logic', 'module'];
        const launchGearCategories = ['launcher', 'booster'];
        const resourceCategories = ['coin', 'cargo'];

        [...componentCategories, ...launchGearCategories, ...resourceCategories].forEach(category => {
            expect(repository.getItemDefinitionsByCategory(category).length, category).toBeGreaterThan(0);
        });
    });

    it('keeps cargo as delivery resources with explicit destination data when they are deliverable', () => {
        const cargoDefinitions = repository.getItemDefinitionsByCategory('cargo');
        const deliverableCargo = cargoDefinitions.filter(cargo => cargo.deliveryGoalId);

        expect(cargoDefinitions.length).toBeGreaterThan(0);
        expect(deliverableCargo.length).toBeGreaterThan(0);
        deliverableCargo.forEach(cargo => {
            expect(['TRADING_POST', 'REPAIR_DOCK', 'BLACK_MARKET']).toContain(cargo.deliveryGoalId);
        });
    });
});
