import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import GameDataRepository from '../../src/core/GameDataRepository.js';
import Item from '../../src/systems/entities/Item.js';
import RocketItem from '../../src/systems/entities/RocketItem.js';
import SessionState from '../../src/systems/entities/SessionState.js';
import EconomySystem from '../../src/systems/logic/EconomySystem.js';

let repository;
let session;
let economySystem;

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
    session.incrementSector();
    economySystem = new EconomySystem(repository);
});

afterEach(() => {
    vi.restoreAllMocks();
});

function item(id) {
    return new Item(id, repository);
}

function lotteryItem(value = 100) {
    return {
        applyMaintenance: vi.fn(),
        calculateAppraisalValue: vi.fn(() => value)
    };
}

describe('world_config.md chapter 4: post-mission facility events', () => {
    it('generates Trading Post stock from six non cargo and non coin items with one 30% sale item', () => {
        const stockItems = [
            item('hull_light'),
            item('sensor_short'),
            item('pad_standard_d2'),
            item('mod_analyzer'),
            item('opt_fuel'),
            item('boost_power')
        ];
        vi.spyOn(economySystem, 'drawLottery').mockReturnValue(stockItems);
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        const stock = economySystem.generateTradingPostStock(session);

        expect(economySystem.drawLottery).toHaveBeenCalledWith(session, 6, {
            excludeCategories: ['cargo', 'coin']
        });
        expect(stock).toHaveLength(6);
        expect(stock.map(entry => entry.item)).toEqual(stockItems);
        expect(stock.every(entry => entry.originalPrice === entry.item.calculateAppraisalValue() * 2)).toBe(true);
        expect(stock.filter(entry => entry.itemDiscount === 0.3)).toHaveLength(1);
    });

    it('creates Repair Dock launcher maintenance and dismantle transactions with shared discount pricing', () => {
        const launcher = item('pad_standard_d2');
        launcher.consumeCharge(1);
        const repairTransaction = economySystem.createRepairTransaction(launcher, 0.1);

        expect(repairTransaction.spentCoins).toBe(9);
        expect(repairTransaction.requiredItems).toEqual([launcher]);
        repairTransaction.onCommit();
        expect(launcher.charges).toBe(launcher.maxCharges);

        const rocketItem = new RocketItem(
            item('hull_medium'),
            item('sensor_normal'),
            [item('mod_analyzer')]
        );
        vi.spyOn(Math, 'random').mockReturnValue(0);

        const dismantleTransaction = economySystem.createDismantleTransaction(rocketItem, 2, 0.2);
        const committed = dismantleTransaction.onCommit();

        expect(dismantleTransaction.spentCoins).toBe(120);
        expect(dismantleTransaction.removedItems).toEqual([rocketItem]);
        expect(committed.acquiredItems).toEqual(rocketItem.getCompositionParts());
        expect(committed.acquiredItems.every(part => part.enhancementCount === 1)).toBe(true);
    });

    it('draws Black Market normal gacha to the 100c output line without cargo or coin candidates', () => {
        const selected = lotteryItem(100);
        vi.spyOn(economySystem, 'drawLottery').mockReturnValue([selected]);
        vi.spyOn(Math, 'random').mockReturnValue(0.4);

        const transaction = economySystem.drawBlackMarketGacha('normal', session, 0);

        expect(economySystem.drawLottery).toHaveBeenCalledTimes(1);
        expect(economySystem.drawLottery).toHaveBeenCalledWith(session, 1, {
            bonusThreshold: 0,
            excludeCategories: ['cargo', 'coin']
        });
        expect(selected.applyMaintenance).toHaveBeenCalledTimes(1);
        expect(transaction.spentCoins).toBe(100);
        expect(transaction.acquiredItems).toEqual([selected]);
    });

    it('draws Black Market premium gacha to the 500c output line with the premium threshold bonus', () => {
        vi.spyOn(economySystem, 'drawLottery').mockImplementation(() => [lotteryItem(100)]);
        vi.spyOn(Math, 'random').mockReturnValue(0.9);

        const transaction = economySystem.drawBlackMarketGacha('premium', session, 0);

        expect(economySystem.drawLottery).toHaveBeenCalledTimes(5);
        expect(economySystem.drawLottery).toHaveBeenCalledWith(session, 1, {
            bonusThreshold: 5,
            excludeCategories: ['cargo', 'coin']
        });
        expect(transaction.spentCoins).toBe(500);
        expect(transaction.acquiredItems).toHaveLength(5);
    });
});
