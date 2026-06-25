import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import GameDataRepository from '../../src/core/GameDataRepository.js';
import Item from '../../src/systems/entities/Item.js';
import RocketItem from '../../src/systems/entities/RocketItem.js';
import SessionState from '../../src/systems/entities/SessionState.js';
import EconomySystem from '../../src/systems/logic/EconomySystem.js';
import CelestialBody from '../../src/systems/world/CelestialBody.js';

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

describe('world_config.md chapter 3: collection and economy', () => {
    it('defines rarity appearance rates and base appraisal prices', () => {
        expect(repository.getRaritySettings()).toEqual({
            COMMON: 5,
            UNCOMMON: 10,
            RARE: 15,
            ANOMALY: 20
        });
        expect(repository.getRarityPrices()).toEqual({
            5: 20,
            10: 40,
            15: 60,
            20: 100
        });
    });

    it('draws lottery items from threshold weights and category exclusions', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.99);

        const sector1Items = economySystem.drawLottery(session, 8);

        expect(sector1Items.every(current => current.rarity !== 'rare' && current.rarity !== 'anomaly')).toBe(true);

        const bonusItems = economySystem.drawLottery(session, 8, {
            bonusThreshold: 5,
            excludeCategories: ['cargo', 'coin']
        });

        expect(bonusItems.every(current => current.category !== 'cargo' && current.category !== 'coin')).toBe(true);
        expect(bonusItems.some(current => current.rarity === 'rare')).toBe(true);
    });

    it('collects items when the rocket center is within pickup range from the star surface', () => {
        const cargo = item('cargo_safe');
        const body = new CelestialBody({
            position: { x: 0, y: 0 },
            radius: 20,
            items: [cargo]
        }, repository);

        expect(body.checkPickup({ x: 30, y: 0 }, 10)).toEqual([cargo]);
        expect(body.checkPickup({ x: 30, y: 0 }, 10)).toEqual([]);
    });

    it('calculates appraisal value from rarity, durability condition, and enhancement count', () => {
        const launcher = item('pad_standard_d4');
        launcher.consumeCharge(2);
        launcher.enhancementCount = 2;

        expect(economySystem.calculateAppraisalValue(launcher)).toBe(43);
    });

    it('pays lost insurance from the launched rocket composition when the flight is lost', () => {
        const rocketItem = new RocketItem(
            item('hull_medium'),
            item('sensor_normal'),
            [item('mod_insurance')]
        );

        const settlement = economySystem.calculateSettlement({
            type: 'boundary',
            target: null
        }, {
            ticks: 0,
            heldCargo: [],
            rocketItem
        }, session);

        expect(settlement.status).toBe('lost');
        expect(settlement.totalCoins).toBe(60);
        expect(settlement.entries.some(entry => entry.coin === 60)).toBe(true);
    });
});
