import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import Item from '../../../../src/systems/entities/Item.js';
import RocketItem from '../../../../src/systems/entities/RocketItem.js';
import SessionState from '../../../../src/systems/entities/SessionState.js';
import SettlementCalculator from '../../../../src/systems/logic/SettlementCalculator.js';

let repository;
let session;
let lotteryService;

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
    lotteryService = {
        drawLottery: vi.fn()
    };
});

afterEach(() => {
    vi.restoreAllMocks();
});

function createRocketItem(moduleIds = []) {
    return new RocketItem(
        new Item('hull_medium', repository),
        new Item('sensor_normal', repository),
        moduleIds.map(id => new Item(id, repository))
    );
}

describe('SettlementCalculator', () => {
    it('settles a cleared delivery using the provided lottery service', () => {
        const calculator = new SettlementCalculator(repository, lotteryService);
        const bonusCoin = new Item('coin_200', repository);
        lotteryService.drawLottery.mockReturnValue([bonusCoin]);

        const settlement = calculator.calculate({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        }, {
            ticks: 12,
            heldCargo: [
                new Item('cargo_safe', repository),
                new Item('coin_100', repository)
            ],
            rocketItem: createRocketItem()
        }, session);

        expect(lotteryService.drawLottery).toHaveBeenCalledWith(session, 1, {
            bonusThreshold: 5,
            excludeCategories: ['cargo']
        });
        expect(settlement.status).toBe('cleared');
        expect(settlement.totalScore).toBe(3512);
        expect(settlement.totalCoins).toBe(420);
    });

    it('combines matched and unmatched delivery rewards into one delivery bonus entry', () => {
        const calculator = new SettlementCalculator(repository, lotteryService);
        const bonusCoin = new Item('coin_200', repository);
        lotteryService.drawLottery.mockReturnValue([bonusCoin]);

        const settlement = calculator.calculate({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        }, {
            ticks: 12,
            heldCargo: [
                new Item('cargo_safe', repository),
                new Item('cargo_normal', repository)
            ],
            rocketItem: createRocketItem()
        }, session);

        expect(settlement.entries).toEqual([
            { label: 'Flight Duration Score', score: 12 },
            { label: 'Goal Bonus', score: 2000, coin: 20 },
            { label: 'Delivery Bonus', score: 1500, coin: 310 }
        ]);
    });

    it('uses repository UI text resources for settlement entry labels', () => {
        const calculator = new SettlementCalculator({
            getFacilityDefinition: () => ({
                id: 'T',
                rewardScore: 2000,
                rewardCoins: 20,
                bonusItemCount: 1
            }),
            getGameBalance: () => ({
                DELIVERY_REWARD: { SCORE: 1500, COINS: 100 },
                UNMATCHED_DELIVERY_REWARD: { SCORE: 0, COINS: 10 },
                MAX_COIN_DISCOUNT: 0.5
            }),
            getUiText: key => `ui:${key}`
        }, lotteryService);
        lotteryService.drawLottery.mockReturnValue([]);

        const settlement = calculator.calculate({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        }, {
            ticks: 12,
            heldCargo: [new Item('cargo_safe', repository)],
            rocketItem: createRocketItem()
        }, session);

        expect(settlement.entries).toEqual([
            { label: 'ui:flightResult.entries.flightDuration', score: 12 },
            { label: 'ui:flightResult.entries.goalBonus', score: 2000, coin: 20 },
            { label: 'ui:flightResult.entries.deliveryBonus', score: 1500, coin: 100 }
        ]);
    });

    it('settles crash insurance from RocketItem composition only', () => {
        const calculator = new SettlementCalculator(repository, lotteryService);
        const rocketItem = createRocketItem(['mod_insurance']);
        vi.spyOn(Math, 'random').mockReturnValue(1);

        const settlement = calculator.calculate({
            type: 'body',
            target: {}
        }, {
            ticks: 20,
            heldCargo: [],
            rocketItem
        }, session);

        expect(settlement.totalCoins).toBe(60);
        expect(settlement.entries).toEqual([
            { label: 'Flight Duration Score', score: 20 },
            { label: 'Insurance Payout', coin: 60 }
        ]);
    });
});
