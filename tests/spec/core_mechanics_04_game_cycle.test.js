import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import GameDataRepository from '../../src/core/GameDataRepository.js';
import Item from '../../src/systems/entities/Item.js';
import RocketItem from '../../src/systems/entities/RocketItem.js';
import SessionState from '../../src/systems/entities/SessionState.js';
import SettlementCalculator from '../../src/systems/logic/SettlementCalculator.js';
import EconomySystem from '../../src/systems/logic/EconomySystem.js';
import ItemContainer from '../../src/systems/entities/ItemContainer.js';

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

afterEach(() => {
    vi.restoreAllMocks();
});

function item(id) {
    return new Item(id, repository);
}

function rocketItem(moduleIds = []) {
    return new RocketItem(
        item('hull_medium'),
        item('sensor_normal'),
        moduleIds.map(id => item(id))
    );
}

function calculator() {
    return new SettlementCalculator(repository, lotteryService);
}

describe('core_mechanics.md chapter 4: game cycle and mission progression', () => {
    it('settles mission success by recovering the rocket, collected inventory items, coins, and facility rewards', () => {
        const launchedRocket = rocketItem();
        const collectedPart = item('mod_capacity');
        const collectedCoin = item('coin_100');

        const settlement = calculator().calculate({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        }, {
            ticks: 12,
            heldCargo: [collectedPart, collectedCoin],
            rocketItem: launchedRocket
        }, session);

        expect(settlement.status).toBe('cleared');
        expect(settlement.destination).toBe('TRADING_POST');
        expect(settlement.totalScore).toBe(2012);
        expect(settlement.totalCoins).toBe(120);
        expect(settlement.recoveredItems).toEqual([launchedRocket]);
        expect(settlement.acquiredItems).toEqual([collectedPart]);
    });

    it('settles home return by recovering non-cargo items and leaving cargo on the home star', () => {
        const home = { isHome: true };
        const launchedRocket = rocketItem();
        const cargo = item('cargo_safe');
        const collectedPart = item('mod_capacity');

        const settlement = calculator().calculate({
            type: 'body',
            target: home
        }, {
            ticks: 18,
            heldCargo: [cargo, collectedPart],
            rocketItem: launchedRocket
        }, session);

        expect(settlement.status).toBe('returned');
        expect(settlement.recoveredItems).toEqual([launchedRocket]);
        expect(settlement.acquiredItems).toEqual([collectedPart]);
        expect(settlement.lostToTarget).toEqual({
            target: home,
            items: [cargo]
        });
    });

    it('settles lost flights by losing held items and the launched rocket while paying insurance when equipped', () => {
        const launchedRocket = rocketItem(['mod_insurance']);

        const settlement = calculator().calculate({
            type: 'boundary',
            target: null
        }, {
            ticks: 20,
            heldCargo: [item('coin_100'), item('cargo_safe')],
            rocketItem: launchedRocket
        }, session);

        expect(settlement.status).toBe('lost');
        expect(settlement.recoveredItems).toEqual([]);
        expect(settlement.acquiredItems).toEqual([]);
        expect(settlement.lostToTarget).toBeNull();
        expect(settlement.totalCoins).toBe(60);
    });

    it('settles crashes by dropping held items and surviving rocket parts on the target star', () => {
        const target = {};
        const launchedRocket = rocketItem(['mod_insurance']);
        const heldCoin = item('coin_100');
        vi.spyOn(Math, 'random').mockReturnValue(0.4);

        const settlement = calculator().calculate({
            type: 'body',
            target
        }, {
            ticks: 20,
            heldCargo: [heldCoin],
            rocketItem: launchedRocket
        }, session);

        expect(settlement.status).toBe('crashed');
        expect(settlement.recoveredItems).toEqual([]);
        expect(settlement.acquiredItems).toEqual([]);
        expect(settlement.lostToTarget.target).toBe(target);
        expect(settlement.lostToTarget.items).toEqual([
            heldCoin,
            launchedRocket.chassis,
            launchedRocket.logic,
            launchedRocket.modules[0].items[0]
        ]);
    });

    it('detects game over when no buildable rocket base and no usable launcher remain', () => {
        const economySystem = new EconomySystem(repository);
        session.inventory = new ItemContainer();

        expect(economySystem.checkGameOver(session)).toEqual({
            reason: 'NO_PARTS_REMAINING',
            details: ['CHASSIS', 'LOGIC', 'LAUNCHER']
        });
    });
});
