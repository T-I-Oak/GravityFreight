import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import Item from '../../../../src/systems/entities/Item.js';
import SessionState from '../../../../src/systems/entities/SessionState.js';
import TradingPostService from '../../../../src/systems/logic/TradingPostService.js';

let repository;
let session;
let lotteryService;

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
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('TradingPostService', () => {
    it('generates stock from non cargo and non coin lottery items', () => {
        const service = new TradingPostService(lotteryService);
        const lotteryItems = [
            new Item('hull_light', repository),
            new Item('sensor_short', repository),
            new Item('pad_standard_d2', repository),
            new Item('mod_analyzer', repository),
            new Item('opt_fuel', repository),
            new Item('boost_power', repository)
        ];
        lotteryService.drawLottery.mockReturnValue(lotteryItems);
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        const stock = service.generateStock(session);

        expect(lotteryService.drawLottery).toHaveBeenCalledWith(session, 6, {
            excludeCategories: ['cargo', 'coin']
        });
        expect(stock).toHaveLength(6);
        expect(stock.map(entry => entry.item)).toEqual(lotteryItems);
        expect(stock.every(entry => entry.originalPrice === entry.item.calculateAppraisalValue() * 2)).toBe(true);
        expect(stock.filter(entry => entry.itemDiscount === 0.3)).toHaveLength(1);
        expect(stock.filter(entry => entry.itemDiscount === 0)).toHaveLength(5);
    });
});
