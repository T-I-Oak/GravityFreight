import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import FlightRecorder from '../../../../src/systems/logic/FlightRecorder.js';
import Item from '../../../../src/systems/entities/Item.js';
import Rocket from '../../../../src/systems/entities/Rocket.js';
import RocketItem from '../../../../src/systems/entities/RocketItem.js';
import SessionState from '../../../../src/systems/entities/SessionState.js';
import CelestialBody from '../../../../src/systems/world/CelestialBody.js';
import ExitArc from '../../../../src/systems/world/ExitArc.js';
import Sector from '../../../../src/systems/world/Sector.js';

function createRepository(savedIndex = { records: [] }) {
    return {
        getSavedFlightRecordIndex: vi.fn(migrationMap => savedIndex ?? migrationMap.init()),
        setSavedFlightRecordIndex: vi.fn()
    };
}

function createRecorder(savedIndex, options = {}) {
    const repository = createRepository(savedIndex);
    const recorder = new FlightRecorder(repository, {
        idFactory: options.idFactory || (() => options.id || 'flight_new'),
        now: options.now || (() => options.createdAt || '2026-06-04T00:00:00.000Z'),
        rocketClass: options.rocketClass,
        sectorClass: options.sectorClass
    });
    recorder.initialize();
    return { repository, recorder };
}

function createRecord({
    id,
    score,
    createdAt = '2026-06-01T00:00:00.000Z',
    favorite = false,
    reachedSector = 1,
    gameSessionId = null
}) {
    return {
        id,
        createdAt,
        score,
        reachedSector,
        gameSessionId,
        resultType: 'cleared',
        destinationType: 'TRADING_POST',
        favorite,
        snapshots: {
            rocket: { id: `rocket_${id}` },
            sector: { id: `sector_${id}` }
        }
    };
}

function capture(recorder) {
    const rocket = { createSnapshot: vi.fn(() => ({ rocket: 'snapshot' })) };
    const sector = { createSnapshot: vi.fn(() => ({ sector: 'snapshot' })) };
    recorder.captureLaunchSnapshot(rocket, sector);
    return { rocket, sector };
}

function createRepresentativeReplayFixture(gameDataRepository) {
    const session = new SessionState(gameDataRepository);
    session.initialize();
    session.incrementSector();

    const economySystem = {
        drawLottery: vi.fn(() => [])
    };
    const sector = new Sector(session, false, gameDataRepository, economySystem);
    const config = gameDataRepository.getMasterConfig();
    const starCount = config.baseCelestialCount + 2;
    const starItemIds = ['coin_100', 'coin_200', 'cargo_safe', 'cargo_normal', 'cargo_danger', 'cargo_lucky'];

    sector.bodies = [
        new CelestialBody({
            position: config.homeStarPosition,
            isHome: true
        }, gameDataRepository),
        ...Array.from({ length: starCount }, (_, index) => {
            const angle = (Math.PI * 2 * index) / starCount;
            const radius = 260 + (index % 3) * 95;
            return new CelestialBody({
                position: {
                    x: Math.round(Math.cos(angle) * radius),
                    y: Math.round(Math.sin(angle) * radius)
                },
                radius: 18 + (index % 4),
                isRepulsion: index % 2 === 1,
                items: [
                    new Item(starItemIds[index % starItemIds.length], gameDataRepository),
                    new Item(starItemIds[(index + 2) % starItemIds.length], gameDataRepository)
                ]
            }, gameDataRepository);
        })
    ];
    sector.exits = [
        new ExitArc({ angle: 20, type: 'TRADING_POST' }, gameDataRepository),
        new ExitArc({ angle: 160, type: 'REPAIR_DOCK' }, gameDataRepository),
        new ExitArc({ angle: 280, type: 'BLACK_MARKET' }, gameDataRepository)
    ];

    const rocketItem = new RocketItem(
        new Item('hull_heavy', gameDataRepository),
        new Item('sensor_normal', gameDataRepository),
        [
            new Item('mod_capacity', gameDataRepository),
            new Item('mod_analyzer', gameDataRepository),
            new Item('mod_star_breaker', gameDataRepository),
            new Item('mod_cushion', gameDataRepository),
            new Item('mod_emergency', gameDataRepository)
        ]
    );
    const rocket = new Rocket(
        rocketItem,
        new Item('pad_standard_d4', gameDataRepository),
        new Item('boost_power', gameDataRepository),
        0.5,
        { x: config.homeStarRadius, y: 0 }
    );
    rocket.velocity = rocket.getInitialVelocity(0.1);

    return { rocket, sector };
}

describe('FlightRecorder', () => {
    let repository;
    let recorder;

    beforeEach(() => {
        ({ repository, recorder } = createRecorder({ records: [] }));
    });

    it('loads saved flight record index through GameDataRepository', () => {
        expect(repository.getSavedFlightRecordIndex).toHaveBeenCalledWith({
            init: expect.any(Function)
        });
        expect(recorder.getRecords()).toEqual([]);
    });

    it('captures launch snapshots and auto-saves records while storage has room', () => {
        const { rocket, sector } = capture(recorder);

        const record = recorder.recordFlightResult({
            resultType: 'cleared',
            score: 1200,
            reachedSector: 3,
            destinationType: 'REPAIR_DOCK',
            gameSessionId: 'session_1'
        });

        expect(rocket.createSnapshot).toHaveBeenCalled();
        expect(sector.createSnapshot).toHaveBeenCalled();
        expect(record).toEqual({
            id: 'flight_new',
            createdAt: '2026-06-04T00:00:00.000Z',
            score: 1200,
            reachedSector: 3,
            gameSessionId: 'session_1',
            resultType: 'cleared',
            destinationType: 'REPAIR_DOCK',
            favorite: false,
            snapshots: {
                rocket: { rocket: 'snapshot' },
                sector: { sector: 'snapshot' }
            }
        });
        expect(repository.setSavedFlightRecordIndex).toHaveBeenCalledWith({ records: [record] });
        expect(recorder.getPendingRecord()).toBeNull();
    });

    it('keeps an auto-save rejected record as pending until discarded', () => {
        const fullRecords = Array.from({ length: 20 }, (_, index) => createRecord({
            id: `record_${index}`,
            score: 100 + index,
            createdAt: `2026-06-01T00:00:${String(index).padStart(2, '0')}.000Z`
        }));
        ({ repository, recorder } = createRecorder({ records: fullRecords }, {
            id: 'low_score',
            createdAt: '2026-06-04T00:00:00.000Z'
        }));
        capture(recorder);

        expect(recorder.recordFlightResult({ resultType: 'lost', score: 50, reachedSector: 2 })).toBeNull();
        expect(recorder.getPendingRecord()).toMatchObject({ id: 'low_score', score: 50 });
        expect(repository.setSavedFlightRecordIndex).not.toHaveBeenCalled();

        recorder.discardPendingRecord();

        expect(recorder.getPendingRecord()).toBeNull();
    });

    it('replaces the lowest non-favorite record when a full index receives a better score', () => {
        const fullRecords = Array.from({ length: 20 }, (_, index) => createRecord({
            id: `record_${index}`,
            score: index === 0 ? 10 : 100 + index,
            favorite: index === 1
        }));
        ({ repository, recorder } = createRecorder({ records: fullRecords }, { id: 'high_score' }));
        capture(recorder);

        const record = recorder.recordFlightResult({ resultType: 'returned', score: 500, reachedSector: 5 });

        expect(record.id).toBe('high_score');
        expect(recorder.getRecords()).toHaveLength(20);
        expect(recorder.getRecords().map(item => item.id)).not.toContain('record_0');
        expect(recorder.getRecords().map(item => item.id)).toContain('high_score');
        expect(repository.setSavedFlightRecordIndex).toHaveBeenCalledTimes(1);
    });

    it('prefers a new record over an older non-favorite record with the same score', () => {
        const fullRecords = Array.from({ length: 20 }, (_, index) => createRecord({
            id: `record_${index}`,
            score: index === 0 ? 100 : 200 + index,
            createdAt: `2026-06-01T00:00:${String(index).padStart(2, '0')}.000Z`
        }));
        ({ recorder } = createRecorder({ records: fullRecords }, { id: 'same_score' }));
        capture(recorder);

        const record = recorder.recordFlightResult({ resultType: 'cleared', score: 100, reachedSector: 4 });

        expect(record.id).toBe('same_score');
        expect(recorder.getRecords().map(item => item.id)).not.toContain('record_0');
        expect(recorder.getRecords().map(item => item.id)).toContain('same_score');
    });

    it('saves a pending record as favorite and prunes storage if needed', () => {
        const fullRecords = Array.from({ length: 20 }, (_, index) => createRecord({
            id: `record_${index}`,
            score: 100 + index,
            favorite: index < 4
        }));
        ({ repository, recorder } = createRecorder({ records: fullRecords }, { id: 'favorite_pending' }));
        capture(recorder);
        recorder.recordFlightResult({ resultType: 'lost', score: 50, reachedSector: 2 });

        const saved = recorder.savePendingRecordAsFavorite();

        expect(saved).toMatchObject({ id: 'favorite_pending', favorite: true });
        expect(recorder.getPendingRecord()).toBeNull();
        expect(recorder.getRecords()).toHaveLength(20);
        expect(recorder.getRecords().filter(record => record.favorite)).toHaveLength(5);
        expect(repository.setSavedFlightRecordIndex).toHaveBeenCalledTimes(1);
    });

    it('updates favorite state without applying the UI protect flow limit', () => {
        const records = Array.from({ length: 6 }, (_, index) => createRecord({
            id: `record_${index}`,
            score: 100 + index,
            favorite: index < 5
        }));
        ({ recorder } = createRecorder({ records }));

        const protectedRecord = recorder.setFavorite('record_5', true);

        expect(protectedRecord).toMatchObject({ id: 'record_5', favorite: true });
        expect(recorder.getRecords().find(record => record.id === 'record_5').favorite).toBe(true);
    });

    it('creates replay context by delegating snapshot restoration', () => {
        const rocket = { restored: 'rocket' };
        const sector = { restored: 'sector' };
        const rocketClass = { fromSnapshot: vi.fn(() => rocket) };
        const sectorClass = { fromSnapshot: vi.fn(() => sector) };
        const savedRecord = createRecord({ id: 'record_1', score: 100 });
        ({ recorder } = createRecorder({ records: [savedRecord] }, { rocketClass, sectorClass }));

        const context = recorder.createReplayContext('record_1');

        expect(rocketClass.fromSnapshot).toHaveBeenCalledWith(savedRecord.snapshots.rocket, expect.any(Object));
        expect(sectorClass.fromSnapshot).toHaveBeenCalledWith(savedRecord.snapshots.sector, expect.any(Object));
        expect(context).toEqual({
            record: savedRecord,
            rocket,
            sector
        });
    });

    it('rejects missing launch snapshots, unknown records, and duplicate saved ids', () => {
        expect(() => recorder.recordFlightResult({ resultType: 'cleared' })).toThrow('[FlightRecorder] Launch snapshot has not been captured.');
        expect(() => recorder.createReplayContext('missing')).toThrow('[FlightRecorder] Record not found: missing');

        expect(() => createRecorder({
            records: [
                createRecord({ id: 'duplicate', score: 1 }),
                createRecord({ id: 'duplicate', score: 2 })
            ]
        })).toThrow('[FlightRecorder] Duplicate record id: duplicate');
    });

    it('keeps a representative 20-record replay index below the size target', async () => {
        const gameDataRepository = new GameDataRepository({
            getSavedData: vi.fn(),
            setSavedData: vi.fn()
        }, {
            expandLanguageResource: value => value
        });
        await gameDataRepository.loadAllData();
        const { rocket, sector } = createRepresentativeReplayFixture(gameDataRepository);
        let nextId = 1;
        let nextSecond = 0;
        ({ recorder } = createRecorder({ records: [] }, {
            idFactory: () => `flight_${nextId++}`,
            now: () => `2026-06-04T00:00:${String(nextSecond++).padStart(2, '0')}.000Z`
        }));

        for (let index = 0; index < 20; index += 1) {
            recorder.captureLaunchSnapshot(rocket, sector);
            recorder.recordFlightResult({
                resultType: 'cleared',
                score: 1000 + index,
                reachedSector: 1,
                destinationType: 'TRADING_POST'
            });
        }

        const serialized = JSON.stringify(recorder.getFlightRecordIndex());
        const utf16Bytes = serialized.length * 2;
        const utf8Bytes = new TextEncoder().encode(serialized).length;
        const warningThresholdBytes = 700 * 1024;
        const hardLimitBytes = 800 * 1024;

        if (utf16Bytes > warningThresholdBytes) {
            console.warn(`[FlightRecorder] Representative replay index size is ${utf16Bytes} bytes UTF-16.`);
        }

        expect(utf16Bytes).toBeLessThanOrEqual(600 * 1024);
        expect(utf16Bytes).toBeLessThanOrEqual(warningThresholdBytes);
        expect(utf16Bytes).toBeLessThanOrEqual(hardLimitBytes);
        expect(utf8Bytes).toBeLessThanOrEqual(utf16Bytes);
        expect(JSON.parse(serialized)).toEqual(recorder.getFlightRecordIndex());
    });
});
