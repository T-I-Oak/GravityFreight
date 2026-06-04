import { describe, it, expect, beforeEach, vi } from 'vitest';
import GameRecordTracker from '../../../../src/systems/logic/GameRecordTracker.js';

function createRepository(savedData = { values: {} }) {
    return {
        getSavedGameRecordData: vi.fn((migrationMap) => savedData ?? migrationMap.init()),
        setSavedGameRecordData: vi.fn()
    };
}

describe('GameRecordTracker', () => {
    let repository;
    let tracker;

    beforeEach(() => {
        repository = createRepository();
        tracker = new GameRecordTracker(repository);
    });

    it('loads saved game record data with a migration initializer', () => {
        tracker.initialize();

        expect(repository.getSavedGameRecordData).toHaveBeenCalledWith({
            init: expect.any(Function)
        });
        expect(tracker.getGameRecordData()).toEqual({ values: {} });
        expect(tracker.getRecordValue('missing_key')).toBe(0);
    });

    it('records reached sector maximum on sector start', () => {
        tracker.initialize();

        expect(tracker.recordSectorStart({ sectorNumber: 3 })).toEqual(['max_reached_sector']);
        expect(tracker.recordSectorStart({ sectorNumber: 2 })).toEqual([]);
        expect(tracker.getRecordValue('max_reached_sector')).toBe(3);
        expect(repository.setSavedGameRecordData).toHaveBeenCalledTimes(1);
    });

    it('records flight result cumulative and maximum flight values', () => {
        tracker.initialize();

        const keys = tracker.recordFlightResult({
            completedSectors: 1,
            distance: 1200,
            score: 3400,
            earnedCoins: 120,
            collectedItemCount: 4
        });

        expect(keys).toEqual([
            'total_launches',
            'total_completed_sectors',
            'total_distance',
            'max_distance',
            'total_score',
            'total_earned_coins',
            'total_collected_item_count'
        ]);
        expect(tracker.getGameRecordData()).toEqual({
            values: {
                total_launches: 1,
                total_completed_sectors: 1,
                total_distance: 1200,
                max_distance: 1200,
                total_score: 3400,
                total_earned_coins: 120,
                total_collected_item_count: 4
            }
        });
    });

    it('records transaction deltas for facility purchases and rewards', () => {
        tracker.initialize();

        const keys = tracker.recordTransaction({
            spentCoins: 80,
            earnedCoins: 20,
            acquiredItemCount: 2
        }, {
            currentCoins: 260
        });

        expect(keys).toEqual([
            'total_earned_coins',
            'total_spent_coins',
            'total_collected_item_count',
            'max_coins'
        ]);
        expect(tracker.getRecordValue('total_earned_coins')).toBe(20);
        expect(tracker.getRecordValue('total_spent_coins')).toBe(80);
        expect(tracker.getRecordValue('total_collected_item_count')).toBe(2);
        expect(tracker.getRecordValue('max_coins')).toBe(260);
    });

    it('records delivery successes and contract result maximum values', () => {
        tracker.initialize();

        expect(tracker.recordDeliverySuccess({ count: 2, currentContractDeliveries: 2 })).toEqual([
            'total_deliveries',
            'max_deliveries'
        ]);
        expect(tracker.recordGameResult({
            totalScore: 5000,
            totalCoins: 350,
            reachedSector: 4,
            completedSectors: 3,
            collectedItemCount: 6
        })).toEqual([
            'lifetime_contracts',
            'max_score',
            'max_earned_coins',
            'max_reached_sector',
            'max_collected_item_count'
        ]);
        expect(tracker.getRecordValue('total_deliveries')).toBe(2);
        expect(tracker.getRecordValue('max_deliveries')).toBe(2);
        expect(tracker.getRecordValue('lifetime_contracts')).toBe(1);
        expect(tracker.getRecordValue('max_score')).toBe(5000);
        expect(tracker.getRecordValue('max_earned_coins')).toBe(350);
        expect(tracker.getRecordValue('max_reached_sector')).toBe(4);
        expect(tracker.getRecordValue('max_collected_item_count')).toBe(6);
    });

    it('returns defensive copies for read APIs', () => {
        tracker.initialize();
        tracker.recordTransaction({ earnedCoins: 10 });

        const data = tracker.getGameRecordData();
        data.values.total_earned_coins = 999;

        expect(tracker.getRecordValue('total_earned_coins')).toBe(10);
    });
});
