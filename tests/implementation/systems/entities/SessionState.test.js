import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import Item from '../../../../src/systems/entities/Item.js';
import ItemContainer from '../../../../src/systems/entities/ItemContainer.js';
import SessionState from '../../../../src/systems/entities/SessionState.js';

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

describe('SessionState', () => {
    it('initializes gameplay state and inventory from initial setup', () => {
        const session = new SessionState(repository);

        session.initialize();

        expect(session.sectorNumber).toBe(0);
        expect(session.totalScore).toBe(0);
        expect(session.totalEarnedCoins).toBe(0);
        expect(session.totalFlightTicks).toBe(0);
        expect(session.collectedItemCount).toBe(0);
        expect(session.blackMarketVisits).toBe(0);
        expect(session.coins).toBe(200);
        expect(session.inventory).toBeInstanceOf(ItemContainer);
        expect(session.inventory.getItemsByCategory('chassis')).toHaveLength(1);
        expect(session.inventory.getItemsByCategory('logic')).toHaveLength(1);
        expect(session.inventory.getItemsByCategory('launcher')).toHaveLength(1);
    });

    it('increments reached sector and black market visit count', () => {
        const session = new SessionState(repository);
        session.initialize();

        session.incrementSector();
        session.incrementSector();
        session.recordBlackMarketVisit();

        expect(session.sectorNumber).toBe(2);
        expect(session.blackMarketVisits).toBe(1);
    });

    it('applies settlement rewards, acquired items, and lost item transfer', () => {
        const session = new SessionState(repository);
        const acquiredItems = [
            new Item('coin_100', repository),
            new Item('cargo_safe', repository)
        ];
        const lostItems = [
            new Item('hull_light', repository)
        ];
        const target = {
            addItems: vi.fn()
        };
        session.initialize();

        session.applySettlement({
            totalCoins: 150,
            totalScore: 2400,
            flightTicks: 720,
            acquiredItems,
            lostToTarget: {
                target,
                items: lostItems
            }
        });

        expect(session.coins).toBe(350);
        expect(session.totalEarnedCoins).toBe(150);
        expect(session.totalScore).toBe(2400);
        expect(session.totalFlightTicks).toBe(720);
        expect(session.collectedItemCount).toBe(2);
        expect(session.inventory.getItemsByCategory('coin')).toHaveLength(1);
        expect(session.inventory.getItemsByCategory('cargo')).toHaveLength(1);
        expect(target.addItems).toHaveBeenCalledWith(lostItems);
    });

    it('applies transaction asset changes in one place and returns record deltas', () => {
        const session = new SessionState(repository);
        const acquiredItems = [
            new Item('mod_capacity', repository),
            new Item('coin_100', repository)
        ];
        session.initialize();

        const delta = session.applyTransaction({
            spentCoins: 120,
            earnedCoins: 50,
            acquiredItems
        });

        expect(session.coins).toBe(130);
        expect(session.totalEarnedCoins).toBe(50);
        expect(session.collectedItemCount).toBe(2);
        expect(session.inventory.getItemsByCategory('module')).toHaveLength(1);
        expect(session.inventory.getItemsByCategory('coin')).toHaveLength(1);
        expect(delta).toEqual({
            spentCoins: 120,
            earnedCoins: 50,
            acquiredItemCount: 2,
            removedItemCount: 0
        });
    });

    it('rejects transactions that spend more coins than the session has without changing assets', () => {
        const session = new SessionState(repository);
        session.initialize();

        expect(() => session.applyTransaction({
            spentCoins: 201,
            earnedCoins: 0,
            acquiredItems: [new Item('mod_capacity', repository)]
        })).toThrow('[SessionState] Not enough coins for transaction.');

        expect(session.coins).toBe(200);
        expect(session.totalEarnedCoins).toBe(0);
        expect(session.collectedItemCount).toBe(0);
        expect(session.inventory.getItemsByCategory('module')).toHaveLength(0);
    });

    it('removes transaction items and runs commit callback after validation', () => {
        const session = new SessionState(repository);
        const removedItem = new Item('mod_capacity', repository);
        const acquiredItem = new Item('hull_light', repository);
        const onCommit = vi.fn().mockReturnValue({
            acquiredItems: [acquiredItem],
            earnedCoins: 20
        });
        session.initialize();
        session.inventory.addItem(removedItem);

        const delta = session.applyTransaction({
            spentCoins: 50,
            removedItems: [removedItem],
            onCommit
        });

        expect(onCommit).toHaveBeenCalledWith({
            removedItems: [removedItem]
        });
        expect(session.coins).toBe(170);
        expect(session.totalEarnedCoins).toBe(20);
        expect(session.collectedItemCount).toBe(1);
        expect(session.inventory.hasItem(removedItem)).toBe(false);
        expect(session.inventory.hasItem(acquiredItem)).toBe(true);
        expect(delta).toEqual({
            spentCoins: 50,
            earnedCoins: 20,
            acquiredItemCount: 1,
            removedItemCount: 1
        });
    });

    it('rejects transactions when required items are missing before running callbacks', () => {
        const session = new SessionState(repository);
        const missingItem = new Item('mod_capacity', repository);
        const onCommit = vi.fn();
        session.initialize();

        expect(() => session.applyTransaction({
            spentCoins: 50,
            requiredItems: [missingItem],
            onCommit
        })).toThrow('[SessionState] Transaction item is not in inventory.');

        expect(onCommit).not.toHaveBeenCalled();
        expect(session.coins).toBe(200);
    });

    it('creates game result summary with explicit completed sector context', () => {
        const session = new SessionState(repository);
        session.initialize();
        session.incrementSector();
        session.incrementSector();
        session.applySettlement({
            totalCoins: 80,
            totalScore: 1200,
            flightTicks: 500,
            acquiredItems: [new Item('coin_100', repository)]
        });

        expect(session.getGameResultSummary({ completedSectors: 1 })).toEqual({
            totalScore: 1200,
            totalCoins: 80,
            completedSectors: 1,
            reachedSector: 2,
            totalFlightTicks: 500,
            collectedItemCount: 1
        });
    });

    it('rejects ambiguous game result summary calls without completed sector context', () => {
        const session = new SessionState(repository);
        session.initialize();

        expect(() => session.getGameResultSummary()).toThrow('[SessionState] completedSectors is required.');
    });
});
