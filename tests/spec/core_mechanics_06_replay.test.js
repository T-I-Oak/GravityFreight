import { describe, it, expect, vi } from 'vitest';
import FlightRecorder from '../../src/systems/logic/FlightRecorder.js';

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
    reachedSector = 1
}) {
    return {
        id,
        createdAt,
        score,
        reachedSector,
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

describe('core_mechanics.md chapter 6: best shot replay', () => {
    it('creates a flight replay record from the launch snapshot and result metadata', () => {
        const { repository, recorder } = createRecorder({ records: [] });
        const { rocket, sector } = capture(recorder);

        const record = recorder.recordFlightResult({
            resultType: 'cleared',
            totalScore: 1200,
            reachedSector: 3,
            destinationType: 'REPAIR_DOCK'
        });

        expect(rocket.createSnapshot).toHaveBeenCalled();
        expect(sector.createSnapshot).toHaveBeenCalled();
        expect(record).toMatchObject({
            id: 'flight_new',
            score: 1200,
            reachedSector: 3,
            resultType: 'cleared',
            destinationType: 'REPAIR_DOCK',
            favorite: false,
            snapshots: {
                rocket: { rocket: 'snapshot' },
                sector: { sector: 'snapshot' }
            }
        });
        expect(repository.setSavedFlightRecordIndex).toHaveBeenCalledWith({ records: [record] });
    });

    it('keeps at most 20 records and replaces the lowest non-favorite record when full', () => {
        const records = Array.from({ length: 20 }, (_, index) => createRecord({
            id: `record_${index}`,
            score: index === 0 ? 10 : 100 + index,
            favorite: index === 1
        }));
        const { recorder } = createRecorder({ records }, { id: 'high_score' });
        capture(recorder);

        recorder.recordFlightResult({
            resultType: 'returned',
            score: 500,
            reachedSector: 5
        });

        const savedRecords = recorder.getRecords();
        expect(savedRecords).toHaveLength(20);
        expect(savedRecords.map(record => record.id)).toContain('high_score');
        expect(savedRecords.map(record => record.id)).not.toContain('record_0');
        expect(savedRecords.find(record => record.id === 'record_1').favorite).toBe(true);
    });

    it('keeps a low-score full-storage record pending until favorite save or discard', () => {
        const records = Array.from({ length: 20 }, (_, index) => createRecord({
            id: `record_${index}`,
            score: 100 + index
        }));
        const { recorder } = createRecorder({ records }, { id: 'low_score' });
        capture(recorder);

        expect(recorder.recordFlightResult({
            resultType: 'lost',
            score: 50,
            reachedSector: 2
        })).toBeNull();
        expect(recorder.getPendingRecord()).toMatchObject({
            id: 'low_score',
            score: 50
        });

        recorder.discardPendingRecord();

        expect(recorder.getPendingRecord()).toBeNull();
    });

    it('restores replay context by delegating rocket and sector snapshots to their owners', () => {
        const rocket = { restored: 'rocket' };
        const sector = { restored: 'sector' };
        const rocketClass = { fromSnapshot: vi.fn(() => rocket) };
        const sectorClass = { fromSnapshot: vi.fn(() => sector) };
        const savedRecord = createRecord({ id: 'record_1', score: 100 });
        const { recorder } = createRecorder({ records: [savedRecord] }, { rocketClass, sectorClass });

        const context = recorder.createReplayContext('record_1');

        expect(rocketClass.fromSnapshot).toHaveBeenCalledWith(savedRecord.snapshots.rocket, expect.any(Object));
        expect(sectorClass.fromSnapshot).toHaveBeenCalledWith(savedRecord.snapshots.sector, expect.any(Object));
        expect(context).toEqual({
            record: savedRecord,
            rocket,
            sector
        });
    });
});
