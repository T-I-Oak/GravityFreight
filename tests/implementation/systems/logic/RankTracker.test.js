import { describe, it, expect, beforeEach, vi } from 'vitest';
import RankTracker from '../../../../src/systems/logic/RankTracker.js';

function createRepository(savedData = { records: [] }) {
    return {
        getSavedRankData: vi.fn((migrationMap) => savedData ?? migrationMap.init()),
        setSavedRankData: vi.fn()
    };
}

function result(score, reachedSector, collectedItemCount, createdAt, extra = {}) {
    return {
        totalScore: score,
        completedSectors: Math.max(0, reachedSector - 1),
        reachedSector,
        collectedItemCount,
        createdAt,
        ...extra
    };
}

describe('RankTracker', () => {
    let repository;
    let tracker;

    beforeEach(() => {
        repository = createRepository();
        tracker = new RankTracker(repository);
    });

    it('loads saved rank data with a migration initializer', () => {
        tracker.initialize();

        expect(repository.getSavedRankData).toHaveBeenCalledWith({
            init: expect.any(Function)
        });
        expect(tracker.getRankData()).toEqual({ records: [] });
    });

    it('records a game result and returns category ranks', () => {
        tracker.initialize();

        const ranks = tracker.recordGameResult(result(1000, 3, 8, '2026-01-01T00:00:00.000Z'));

        expect(ranks).toEqual({
            scoreRank: 1,
            sectorRank: 1,
            collectedRank: 1
        });
        expect(tracker.getRankData().records).toEqual([
            {
                id: expect.stringMatching(/^rank_/),
                createdAt: '2026-01-01T00:00:00.000Z',
                score: 1000,
                completedSectors: 2,
                reachedSector: 3,
                collectedItemCount: 8
            }
        ]);
        expect(repository.setSavedRankData).toHaveBeenCalledWith(tracker.getRankData());
    });

    it('sorts rankings by category value and newer createdAt for ties', () => {
        tracker.initialize();

        tracker.recordGameResult(result(1000, 5, 5, '2026-01-01T00:00:00.000Z'));
        tracker.recordGameResult(result(3000, 2, 10, '2026-01-02T00:00:00.000Z'));
        tracker.recordGameResult(result(1000, 8, 1, '2026-01-03T00:00:00.000Z'));

        expect(tracker.getRanking('score').map(record => record.score)).toEqual([3000, 1000, 1000]);
        expect(tracker.getRanking('score')[1].createdAt).toBe('2026-01-03T00:00:00.000Z');
        expect(tracker.getRanking('sector').map(record => record.reachedSector)).toEqual([8, 5, 2]);
        expect(tracker.getRanking('collected').map(record => record.collectedItemCount)).toEqual([10, 5, 1]);
    });

    it('keeps recent results sorted from newest to oldest', () => {
        tracker.initialize();

        tracker.recordGameResult(result(100, 1, 1, '2026-01-01T00:00:00.000Z'));
        tracker.recordGameResult(result(200, 2, 2, '2026-01-03T00:00:00.000Z'));
        tracker.recordGameResult(result(300, 3, 3, '2026-01-02T00:00:00.000Z'));

        expect(tracker.getRecentResults().map(record => record.createdAt)).toEqual([
            '2026-01-03T00:00:00.000Z',
            '2026-01-02T00:00:00.000Z',
            '2026-01-01T00:00:00.000Z'
        ]);
    });

    it('prunes to the union of top rankings and recent results', () => {
        tracker.initialize();

        tracker.recordGameResult(result(10000, 1, 1, '2026-01-01T00:00:00.000Z'));
        tracker.recordGameResult(result(1, 100, 1, '2026-01-02T00:00:00.000Z'));
        tracker.recordGameResult(result(1, 1, 100, '2026-01-03T00:00:00.000Z'));
        for (let i = 4; i <= 30; i += 1) {
            tracker.recordGameResult(result(i, i, i, `2026-01-${String(i).padStart(2, '0')}T00:00:00.000Z`));
        }

        const records = tracker.getRankData().records;

        expect(records.length).toBeLessThanOrEqual(63);
        expect(records.some(record => record.score === 10000)).toBe(true);
        expect(records.some(record => record.reachedSector === 100)).toBe(true);
        expect(records.some(record => record.collectedItemCount === 100)).toBe(true);
        expect(records.some(record => record.createdAt === '2026-01-04T00:00:00.000Z')).toBe(false);
        expect(tracker.getRecentResults()).toHaveLength(20);
        expect(tracker.getRanking('score')).toHaveLength(20);
    });

    it('returns defensive copies for read APIs', () => {
        tracker.initialize();
        tracker.recordGameResult(result(1000, 3, 8, '2026-01-01T00:00:00.000Z'));

        const data = tracker.getRankData();
        data.records[0].score = 9999;

        expect(tracker.getRanking('score')[0].score).toBe(1000);
    });

    it('rejects unknown ranking categories', () => {
        tracker.initialize();

        expect(() => tracker.getRanking('distance')).toThrow('[RankTracker] Unknown ranking category: distance');
    });
});
