import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import Item from '../../../../src/systems/entities/Item.js';
import RocketItem from '../../../../src/systems/entities/RocketItem.js';
import SessionState from '../../../../src/systems/entities/SessionState.js';
import PricingService from '../../../../src/systems/logic/PricingService.js';
import RepairDockService from '../../../../src/systems/logic/RepairDockService.js';

let repository;
let session;
let service;

beforeAll(async () => {
    repository = new GameDataRepository({
        getSavedData: vi.fn(),
        setSavedData: vi.fn()
    }, {
        expandLanguageResource: value => value
    });
    await repository.loadAllData();
});

beforeEach(() => {
    session = new SessionState(repository);
    session.initialize();
    service = new RepairDockService(new PricingService());
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('RepairDockService', () => {
    it('creates a repair transaction that repairs a launcher after payment succeeds', () => {
        session.coins = 100;
        const launcher = new Item('pad_standard_d4', repository);
        launcher.consumeCharge(2);
        session.inventory.addItem(launcher);

        const transaction = service.createRepairTransaction(launcher, 0.2);
        const delta = session.applyTransaction(transaction);

        expect(transaction.spentCoins).toBe(8);
        expect(transaction.requiredItems).toEqual([launcher]);
        expect(launcher.charges).toBe(3);
        expect(delta).toEqual({
            spentCoins: 8,
            earnedCoins: 0,
            acquiredItemCount: 0,
            removedItemCount: 0
        });
    });

    it('rejects repair transactions for non launcher or fully repaired items', () => {
        expect(() => service.createRepairTransaction(new Item('hull_light', repository), 0))
            .toThrow('[RepairDockService] Repair target must be a damaged launcher.');

        expect(() => service.createRepairTransaction(new Item('pad_standard_d2', repository), 0))
            .toThrow('[RepairDockService] Repair target must be a damaged launcher.');
    });

    it('creates a dismantle transaction that removes the rocket and returns enhanced parts after payment succeeds', () => {
        session.coins = 100;
        const rocketItem = new RocketItem(
            new Item('hull_medium', repository),
            new Item('sensor_normal', repository),
            [
                new Item('mod_capacity', repository),
                new Item('mod_stabilizer', repository)
            ]
        );
        session.inventory.addItem(rocketItem);
        vi.spyOn(Math, 'random').mockReturnValue(0);

        const transaction = service.createDismantleTransaction(rocketItem, 1, 0.2);
        const delta = session.applyTransaction(transaction);
        const parts = rocketItem.getCompositionParts();

        expect(transaction.spentCoins).toBe(80);
        expect(transaction.removedItems).toEqual([rocketItem]);
        expect(session.inventory.hasItem(rocketItem)).toBe(false);
        expect(parts.every(part => session.inventory.hasItem(part))).toBe(true);
        expect(parts.every(part => part.enhancementCount === 1)).toBe(true);
        expect(delta).toEqual({
            spentCoins: 80,
            earnedCoins: 0,
            acquiredItemCount: 4,
            removedItemCount: 1
        });
    });

    it('rejects dismantle transactions for non rocket items', () => {
        expect(() => service.createDismantleTransaction(new Item('hull_light', repository), 0, 0))
            .toThrow('[RepairDockService] Dismantle target must be a RocketItem.');
    });
});
