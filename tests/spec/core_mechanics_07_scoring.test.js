import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import GameDataRepository from '../../src/core/GameDataRepository.js';
import Item from '../../src/systems/entities/Item.js';
import RocketItem from '../../src/systems/entities/RocketItem.js';
import SessionState from '../../src/systems/entities/SessionState.js';
import SettlementCalculator from '../../src/systems/logic/SettlementCalculator.js';

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
        drawLottery: vi.fn(() => [])
    };
});

function item(id) {
    return new Item(id, repository);
}

function rocketItem() {
    return new RocketItem(
        item('hull_medium'),
        item('sensor_normal'),
        []
    );
}

function calculate(collision, heldCargo, ticks = 12) {
    return new SettlementCalculator(repository, lotteryService).calculate(collision, {
        ticks,
        heldCargo,
        rocketItem: rocketItem()
    }, session);
}

describe('core_mechanics.md chapter 7: scoring system', () => {
    it('adds one duration score per flight tick and keeps it as a separate entry', () => {
        const settlement = calculate({
            type: 'boundary',
            target: null
        }, [], 37);

        expect(settlement.flightTicks).toBe(37);
        expect(settlement.totalScore).toBe(37);
        expect(settlement.entries).toEqual([
            { label: 'Flight Duration Score', score: 37 }
        ]);
    });

    it('adds facility goal score and coin rewards as a separate goal bonus entry', () => {
        const settlement = calculate({
            type: 'arc',
            target: { getFacilityType: () => 'REPAIR_DOCK' }
        }, [], 12);

        expect(settlement.totalScore).toBe(3012);
        expect(settlement.totalCoins).toBe(30);
        expect(settlement.entries).toContainEqual({
            label: 'Goal Bonus',
            score: 3000,
            coin: 30
        });
    });

    it('adds matched delivery rewards to the bonus score without losing the duration and goal entries', () => {
        const settlement = calculate({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        }, [item('cargo_safe')], 12);

        expect(settlement.totalScore).toBe(3512);
        expect(settlement.totalCoins).toBe(120);
        expect(settlement.entries).toEqual([
            { label: 'Flight Duration Score', score: 12 },
            { label: 'Goal Bonus', score: 2000, coin: 20 },
            { label: 'Delivery Bonus', score: 1500, coin: 100 }
        ]);
    });

    it('keeps scoring data available in the settlement until result display can consume it', () => {
        const settlement = calculate({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        }, [item('cargo_safe'), item('coin_100')], 12);

        expect(settlement).toMatchObject({
            totalScore: 3512,
            totalCoins: 220,
            flightTicks: 12,
            entries: expect.any(Array),
            itemReport: expect.any(Array),
            acquiredItems: expect.any(Array)
        });
        expect(settlement.entries).toContainEqual({
            label: 'Collected Coins',
            coin: 100
        });
    });
});
