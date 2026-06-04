import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import Item from '../../../../src/systems/entities/Item.js';
import ItemContainer from '../../../../src/systems/entities/ItemContainer.js';
import RocketItem from '../../../../src/systems/entities/RocketItem.js';
import SessionState from '../../../../src/systems/entities/SessionState.js';
import EconomySystem from '../../../../src/systems/logic/EconomySystem.js';

let repository;
let session;
let economySystem;

beforeAll(async () => {
    repository = new GameDataRepository({
        getSavedData: vi.fn(),
        setSavedData: vi.fn()
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

describe('EconomySystem', () => {
    it('draws only weighted lottery candidates available at the current sector threshold', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);

        const items = economySystem.drawLottery(session, 3);

        expect(items).toHaveLength(3);
        expect(items.every(item => item instanceof Item)).toBe(true);
        expect(items.every(item => item.rarity === 'common' || item.rarity === 'uncommon')).toBe(true);
    });

    it('applies bonus threshold and category exclusions to lottery candidates', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.99);

        const items = economySystem.drawLottery(session, 8, {
            bonusThreshold: 5,
            excludeCategories: ['cargo', 'coin']
        });

        expect(items).toHaveLength(8);
        expect(items.every(item => item.category !== 'cargo' && item.category !== 'coin')).toBe(true);
        expect(items.some(item => item.rarity === 'rare')).toBe(true);
    });

    it('calculates appraisal values from rarity, durability, and enhancement count', () => {
        const launcher = new Item('pad_standard_d4', repository);
        launcher.consumeCharge(2);
        launcher.enhancementCount = 2;

        expect(economySystem.calculateAppraisalValue(launcher)).toBe(43);
    });

    it('caps combined discounts when calculating final prices', () => {
        expect(economySystem.calculateFinalPrice(100, 0.2, 0.3)).toBe(50);
        expect(economySystem.calculateFinalPrice(100, 0.4, 0.3)).toBe(50);
        expect(economySystem.calculateFinalPrice(99, 0.1, 0)).toBe(89);
    });

    it('calculates repair and dismantle costs through the shared discount rule', () => {
        const launcher = new Item('pad_standard_d4', repository);
        launcher.consumeCharge(3);

        expect(economySystem.calculateRepairCost(launcher, 0.2)).toBe(24);
        expect(economySystem.calculateDismantleCost(0, 0.2)).toBe(40);
        expect(economySystem.calculateDismantleCost(2, 0.2)).toBe(120);
    });

    it('generates Trading Post stock from non cargo and non coin lottery items', () => {
        const lotteryItems = [
            new Item('hull_light', repository),
            new Item('sensor_short', repository),
            new Item('pad_standard_d2', repository),
            new Item('mod_analyzer', repository),
            new Item('opt_fuel', repository),
            new Item('boost_power', repository)
        ];
        vi.spyOn(economySystem, 'drawLottery').mockReturnValue(lotteryItems);
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        const stock = economySystem.generateTradingPostStock(session);

        expect(economySystem.drawLottery).toHaveBeenCalledWith(session, 6, {
            excludeCategories: ['cargo', 'coin']
        });
        expect(stock).toHaveLength(6);
        expect(stock.map(entry => entry.item)).toEqual(lotteryItems);
        expect(stock.every(entry => entry.originalPrice === economySystem.calculateAppraisalValue(entry.item) * 2)).toBe(true);
        expect(stock.filter(entry => entry.itemDiscount === 0.3)).toHaveLength(1);
        expect(stock.filter(entry => entry.itemDiscount === 0)).toHaveLength(5);
    });

    it('delegates Black Market gacha and returns a transaction result', () => {
        const transaction = {
            spentCoins: 100,
            earnedCoins: 0,
            acquiredItems: [new Item('mod_stabilizer', repository)]
        };
        vi.spyOn(economySystem.blackMarketService, 'drawGacha').mockReturnValue(transaction);

        expect(economySystem.drawBlackMarketGacha('normal', session, 0)).toBe(transaction);
        expect(economySystem.blackMarketService.drawGacha).toHaveBeenCalledWith('normal', session, 0);
    });

    it('delegates Repair Dock repair and dismantle transactions', () => {
        const launcher = new Item('pad_standard_d4', repository);
        const rocketItem = new RocketItem(
            new Item('hull_medium', repository),
            new Item('sensor_normal', repository),
            []
        );
        const repairTransaction = { spentCoins: 10 };
        const dismantleTransaction = { spentCoins: 50 };
        vi.spyOn(economySystem.repairDockService, 'createRepairTransaction').mockReturnValue(repairTransaction);
        vi.spyOn(economySystem.repairDockService, 'createDismantleTransaction').mockReturnValue(dismantleTransaction);

        expect(economySystem.createRepairTransaction(launcher, 0.1)).toBe(repairTransaction);
        expect(economySystem.createDismantleTransaction(rocketItem, 2, 0.1)).toBe(dismantleTransaction);
        expect(economySystem.repairDockService.createRepairTransaction).toHaveBeenCalledWith(launcher, 0.1);
        expect(economySystem.repairDockService.createDismantleTransaction).toHaveBeenCalledWith(rocketItem, 2, 0.1);
    });

    it('returns null when the session still has chassis, logic, and a usable launcher', () => {
        expect(economySystem.checkGameOver(session)).toBeNull();
    });

    it('reports missing required categories and ignores depleted launchers', () => {
        const launcher = new Item('pad_standard_d2', repository);
        launcher.consumeCharge(2);
        session.inventory = new ItemContainer();
        session.inventory.addItem(launcher);

        expect(economySystem.checkGameOver(session)).toEqual({
            reason: 'NO_PARTS_REMAINING',
            details: ['CHASSIS', 'LOGIC', 'LAUNCHER']
        });
    });

    it('settles a cleared delivery with delivery bonus, collected coins, coin bonus, and lucky discount', () => {
        const cargo = new Item('cargo_safe', repository);
        const lucky = new Item('cargo_lucky', repository);
        const collectedCoin = new Item('coin_100', repository);
        const bonusCoin = new Item('coin_200', repository);
        vi.spyOn(economySystem, 'drawLottery').mockReturnValue([bonusCoin]);

        const settlement = economySystem.calculateSettlement({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        }, {
            ticks: 12,
            heldCargo: [cargo, lucky, collectedCoin],
            rocketItem: new RocketItem(
                new Item('hull_medium', repository),
                new Item('sensor_normal', repository),
                []
            )
        }, session);

        expect(settlement.status).toBe('cleared');
        expect(settlement.destination).toBe('TRADING_POST');
        expect(settlement.unlockedBranchId).toBe('T');
        expect(settlement.totalScore).toBe(3512);
        expect(settlement.totalCoins).toBe(420);
        expect(settlement.luckyDiscountRate).toBe(0.1);
        expect(settlement.flightTicks).toBe(12);
        expect(settlement.acquiredItems).toEqual([]);
        expect(settlement.lostToTarget).toBeNull();
        expect(settlement.entries).toEqual([
            { label: 'Flight Duration Score', score: 12 },
            { label: 'Goal Bonus', score: 2000, coin: 20 },
            { label: 'Delivery Bonus', score: 1500, coin: 300 },
            { label: 'Collected Coins', coin: 100 }
        ]);
        expect(settlement.itemReport).toHaveLength(3);
        expect(settlement.itemReport[0].type).toBe('delivery');
        expect(settlement.itemReport[0].status).toBe('match');
        expect(settlement.itemReport[0].bonusItems[0].id).toBe('coin_200');
        expect(settlement.itemReport[1].status).toBe('unmatched');
        expect(settlement.itemReport[2].type).toBe('other');
    });

    it('settles crash by placing held items and surviving rocket parts on the target and paying insurance', () => {
        const target = { addItems: vi.fn() };
        const rocketItem = new RocketItem(
            new Item('hull_medium', repository),
            new Item('sensor_normal', repository),
            [new Item('mod_insurance', repository)]
        );
        const heldCoin = new Item('coin_100', repository);
        const heldCargo = new Item('cargo_safe', repository);
        vi.spyOn(Math, 'random').mockReturnValue(0.4);

        const settlement = economySystem.calculateSettlement({
            type: 'body',
            target
        }, {
            ticks: 20,
            heldCargo: [heldCoin, heldCargo],
            rocketItem
        }, session);

        expect(settlement.status).toBe('crashed');
        expect(settlement.destination).toBeNull();
        expect(settlement.totalScore).toBe(20);
        expect(settlement.totalCoins).toBe(60);
        expect(settlement.entries).toEqual([
            { label: 'Flight Duration Score', score: 20 },
            { label: 'Insurance Payout', coin: 60 }
        ]);
        expect(settlement.lostToTarget.target).toBe(target);
        expect(settlement.lostToTarget.items.map(item => item.uid)).toEqual([
            heldCoin.uid,
            heldCargo.uid,
            rocketItem.chassis.uid,
            rocketItem.logic.uid,
            rocketItem.modules[0].items[0].uid
        ]);
        expect(settlement.acquiredItems).toEqual([]);
    });

    it('groups same delivery cargo and draws bonus items for every delivered cargo', () => {
        const cargoA = new Item('cargo_safe', repository);
        const cargoB = new Item('cargo_safe', repository);
        const bonusParts = [
            new Item('mod_capacity', repository),
            new Item('coin_100', repository)
        ];
        vi.spyOn(economySystem, 'drawLottery').mockReturnValue(bonusParts);

        const settlement = economySystem.calculateSettlement({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        }, {
            ticks: 5,
            heldCargo: [cargoA, cargoB],
            rocketItem: new RocketItem(
                new Item('hull_medium', repository),
                new Item('sensor_normal', repository),
                []
            )
        }, session);

        expect(economySystem.drawLottery).toHaveBeenCalledWith(session, 2, {
            bonusThreshold: 5,
            excludeCategories: ['cargo']
        });
        expect(settlement.itemReport).toHaveLength(1);
        expect(settlement.itemReport[0].item.count).toBe(2);
        expect(settlement.entries).toContainEqual({
            label: 'Delivery Bonus',
            score: 3000,
            coin: 300
        });
        expect(settlement.acquiredItems).toEqual([bonusParts[0]]);
    });
});
