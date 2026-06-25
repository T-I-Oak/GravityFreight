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

describe('world_config.md chapter 1: initial setup data', () => {
    it('grants the specified initial inventory and no starting coins', () => {
        const setup = repository.getInitialSetup();

        expect(setup.initialCoins).toBe(0);
        expect(setup.initialInventory).toEqual([
            'hull_light',
            'hull_medium',
            'sensor_short',
            'sensor_normal',
            'pad_standard_d2',
            'pad_precision_d2',
            'mod_analyzer',
            'opt_fuel',
            'boost_power'
        ]);
    });

    it('keeps every initial inventory id resolvable in the item master data', () => {
        const setup = repository.getInitialSetup();

        setup.initialInventory.forEach(itemId => {
            expect(repository.getItemDefinition(itemId).id).toBe(itemId);
        });
    });
});
