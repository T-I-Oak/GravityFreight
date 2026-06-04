import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import Item from '../../../../src/systems/entities/Item.js';
import SessionState from '../../../../src/systems/entities/SessionState.js';
import BlackMarketService from '../../../../src/systems/logic/BlackMarketService.js';
import PricingService from '../../../../src/systems/logic/PricingService.js';

let repository;
let session;
let lotteryService;
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
    session.incrementSector();
    lotteryService = {
        drawLottery: vi.fn()
    };
    service = new BlackMarketService(lotteryService, new PricingService());
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('BlackMarketService', () => {
    it('draws normal items to the 100c line and applies one enhancement on a 50% roll', () => {
        const first = new Item('hull_light', repository);
        const second = new Item('mod_stabilizer', repository);
        lotteryService.drawLottery
            .mockReturnValueOnce([first])
            .mockReturnValueOnce([second]);
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.4)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.6);

        const transaction = service.drawGacha('normal', session, 0.2);

        expect(lotteryService.drawLottery).toHaveBeenNthCalledWith(1, session, 1, {
            bonusThreshold: 0,
            excludeCategories: ['cargo', 'coin']
        });
        expect(lotteryService.drawLottery).toHaveBeenNthCalledWith(2, session, 1, {
            bonusThreshold: 0,
            excludeCategories: ['cargo', 'coin']
        });
        expect(transaction).toEqual({
            spentCoins: 80,
            earnedCoins: 0,
            acquiredItems: [first, second]
        });
        expect(first.enhancementCount).toBe(1);
        expect(second.enhancementCount).toBe(0);
        expect(first.category).not.toBe('cargo');
        expect(first.category).not.toBe('coin');
    });

    it('draws premium items to the 500c line with premium threshold and enhancement distribution', () => {
        const items = [
            new Item('mod_star_breaker', repository),
            new Item('mod_cushion', repository),
            new Item('mod_emergency', repository),
            new Item('mod_stabilizer', repository),
            new Item('mod_stabilizer', repository)
        ];
        lotteryService.drawLottery
            .mockReturnValueOnce([items[0]])
            .mockReturnValueOnce([items[1]])
            .mockReturnValueOnce([items[2]])
            .mockReturnValueOnce([items[3]])
            .mockReturnValueOnce([items[4]]);
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.2)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.6)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.9)
            .mockReturnValueOnce(0.9)
            .mockReturnValueOnce(0.9);

        const transaction = service.drawGacha('premium', session, 0.5);

        expect(lotteryService.drawLottery).toHaveBeenCalledTimes(5);
        expect(lotteryService.drawLottery).toHaveBeenCalledWith(session, 1, {
            bonusThreshold: 5,
            excludeCategories: ['cargo', 'coin']
        });
        expect(transaction).toEqual({
            spentCoins: 250,
            earnedCoins: 0,
            acquiredItems: items
        });
        expect(items[0].enhancementCount).toBe(2);
        expect(items[1].enhancementCount).toBe(1);
        expect(items[2].enhancementCount).toBe(0);
        expect(items.reduce((total, item) => total + item.calculateAppraisalValue(), 0)).toBeGreaterThanOrEqual(500);
    });

    it('rejects unknown gacha types', () => {
        expect(() => service.drawGacha('special', session, 0)).toThrow('[BlackMarketService] Unknown gacha type: special');
    });
});
