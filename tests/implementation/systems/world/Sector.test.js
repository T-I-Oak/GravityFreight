import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import Item from '../../../../src/systems/entities/Item.js';
import SessionState from '../../../../src/systems/entities/SessionState.js';
import CelestialBody from '../../../../src/systems/world/CelestialBody.js';
import ExitArc from '../../../../src/systems/world/ExitArc.js';
import Sector from '../../../../src/systems/world/Sector.js';

let repository;
let session;
let economySystem;

function createRandomStub(values = []) {
    const placementRadius650 = (650 / 700) ** 2;
    const placementRadius350 = (350 / 700) ** 2;
    const defaults = [
        0 / 360, placementRadius650, 0.50, 0.50,
        60 / 360, placementRadius650, 0.50, 0.50,
        120 / 360, placementRadius650, 0.50, 0.50,
        180 / 360, placementRadius650, 0.50, 0.50,
        240 / 360, placementRadius650, 0.50, 0.50,
        300 / 360, placementRadius650, 0.50, 0.50,
        30 / 360, placementRadius350, 0.50, 0.50,
        90 / 360, placementRadius350, 0.50, 0.50,
        210 / 360, placementRadius350, 0.50, 0.50,
        330 / 360, placementRadius350, 0.50, 0.50
    ];
    const sequence = values.length > 0 ? values : defaults;
    let index = 0;
    return vi.spyOn(Math, 'random').mockImplementation(() => {
        const value = sequence[index % sequence.length];
        index += 1;
        return value;
    });
}

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
    economySystem = {
        drawLottery: vi.fn((currentSession, count) => (
            Array.from({ length: count }, () => new Item('coin_100', repository))
        ))
    };
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Sector', () => {
    it('generates a home body first and places configured normal bodies within placement constraints', () => {
        createRandomStub();

        const sector = new Sector(session, false, repository, economySystem);

        expect(sector.sectorNumber).toBe(1);
        expect(sector.isAnomaly).toBe(false);
        expect(sector.luckyDiscountRate).toBe(0);
        expect(sector.bodies).toHaveLength(6);
        expect(sector.bodies[0]).toBeInstanceOf(CelestialBody);
        expect(sector.bodies[0].isHome).toBe(true);
        expect(sector.bodies[0].position).toEqual({ x: 0, y: 0 });

        const config = repository.getMasterConfig();
        for (const body of sector.bodies.slice(1)) {
            expect(Math.hypot(body.position.x, body.position.y)).toBeLessThanOrEqual(config.placementLimitRadius);
        }
        expect(economySystem.drawLottery).toHaveBeenCalledTimes(5);
    });

    it('adds black market visits to the generated normal body count', () => {
        createRandomStub();
        session.recordBlackMarketVisit();
        session.recordBlackMarketVisit();

        const sector = new Sector(session, false, repository, economySystem);

        expect(sector.bodies).toHaveLength(8);
        expect(economySystem.drawLottery).toHaveBeenCalledTimes(7);
    });

    it('uses anomaly XOR item rarity to determine repulsion bodies', () => {
        createRandomStub();
        economySystem.drawLottery
            .mockReturnValueOnce([new Item('mod_star_breaker', repository)])
            .mockReturnValue([new Item('coin_100', repository)]);

        const normalSector = new Sector(session, false, repository, economySystem);
        const anomalySector = new Sector(session, true, repository, economySystem);

        expect(normalSector.bodies[1].isRepulsion).toBe(true);
        expect(normalSector.bodies[2].isRepulsion).toBe(false);
        expect(anomalySector.bodies[1].isRepulsion).toBe(true);
    });

    it('generates one exit for each facility type', () => {
        createRandomStub();

        const sector = new Sector(session, false, repository, economySystem);

        expect(sector.exits).toHaveLength(3);
        expect(sector.exits.every(exit => exit instanceof ExitArc)).toBe(true);
        expect(sector.exits.map(exit => exit.getFacilityType()).sort()).toEqual([
            'BLACK_MARKET',
            'REPAIR_DOCK',
            'TRADING_POST'
        ]);
    });

    it('creates and restores snapshots without storing derived master values', () => {
        createRandomStub();
        const sector = new Sector(session, true, repository, economySystem);
        sector.luckyDiscountRate = 0.2;

        const snapshot = sector.createSnapshot();
        const restored = Sector.fromSnapshot(snapshot, repository);

        expect(snapshot).toEqual({
            sectorNumber: 1,
            isAnomaly: true,
            luckyDiscountRate: 0.2,
            bodies: sector.bodies.map(body => body.createSnapshot()),
            exits: sector.exits.map(exit => exit.createSnapshot())
        });
        expect(restored.sectorNumber).toBe(sector.sectorNumber);
        expect(restored.isAnomaly).toBe(true);
        expect(restored.luckyDiscountRate).toBe(0.2);
        expect(restored.bodies).toHaveLength(sector.bodies.length);
        expect(restored.exits).toHaveLength(3);
        expect(restored.bodies[0].mass).toBe(4000);
        expect(restored.exits[0].radius).toBe(900);
    });

    it('clones through snapshot restoration as an independent sector instance', () => {
        createRandomStub();
        const sector = new Sector(session, false, repository, economySystem);

        const clone = sector.clone();
        expect(clone).not.toBe(sector);
        expect(clone.createSnapshot()).toEqual(sector.createSnapshot());

        const picked = clone.bodies[1].checkPickup(clone.bodies[1].position, 1);

        expect(picked.length).toBeGreaterThan(0);
        expect(clone.bodies[1].items).toEqual([]);
        expect(sector.bodies[1].items.length).toBeGreaterThan(0);
    });

    it('keeps a basic world snapshot below the early warning size target', () => {
        createRandomStub();
        const sector = new Sector(session, false, repository, economySystem);

        const utf16Bytes = JSON.stringify(sector.createSnapshot()).length * 2;
        expect(utf16Bytes).toBeLessThanOrEqual(25 * 1024);
    });

    it('rejects invalid snapshot restoration', () => {
        expect(() => Sector.fromSnapshot(null, repository)).toThrow('[Sector] snapshot and gameDataRepository are required.');
        expect(() => Sector.fromSnapshot({ bodies: [], exits: [] }, repository)).toThrow('[Sector] Invalid snapshot.');
    });
});
