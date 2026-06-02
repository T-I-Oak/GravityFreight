import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import Item from '../../../../src/systems/entities/Item.js';
import ItemContainer from '../../../../src/systems/entities/ItemContainer.js';
import SessionState from '../../../../src/systems/entities/SessionState.js';
import EconomySystem from '../../../../src/systems/logic/EconomySystem.js';

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
});
