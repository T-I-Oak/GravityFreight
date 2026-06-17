import { describe, it, expect, vi } from 'vitest';
import ArchiveScreenPresenter from '../../../../src/systems/logic/ArchiveScreenPresenter.js';

function createPresenter() {
    const gameRecordTracker = {
        getGameRecordData: vi.fn(() => ({
            values: {
                total_completed_sectors: 12,
                lifetime_contracts: 4,
                total_collected_item_count: 31
            }
        }))
    };
    const rankTracker = {
        getRecentResults: vi.fn(() => [
            { id: 'recent_1', score: 1200, reachedSector: 3, collectedItemCount: 7, createdAt: '2026-06-17T01:02:03.000Z' }
        ]),
        getRanking: vi.fn(category => ({
            score: [
                { id: 'score_1', score: 3000, reachedSector: 5, collectedItemCount: 10, createdAt: '2026-06-16T01:02:03.000Z' }
            ],
            sector: [],
            collected: []
        })[category])
    };
    const achievementTracker = {
        getAchievementCompletionRate: vi.fn(() => 0.25),
        getAchievementProgress: vi.fn(() => [
            { achievementId: 'stat_launches', value: 2, achievedTier: null, nextTier: 3, progressRate: 0.4 }
        ])
    };
    const flightRecorder = {
        getRecords: vi.fn(() => [
            { id: 'flight_1', score: 2400, reachedSector: 4, createdAt: '2026-06-15T01:02:03.000Z', favorite: true }
        ])
    };
    const gameDataRepository = {
        getAchievementDefinitions: vi.fn(() => [
            {
                id: 'stat_launches',
                label: 'Launch Count',
                keyLabel: 'Total Launches',
                tiers: [
                    { title: 'Veteran', goal: 10 },
                    { title: 'Pilot', goal: 5 },
                    { title: 'Rookie', goal: 1 }
                ]
            }
        ])
    };

    return {
        presenter: new ArchiveScreenPresenter({
            gameRecordTracker,
            rankTracker,
            achievementTracker,
            flightRecorder,
            gameDataRepository
        }),
        rankTracker
    };
}

describe('ArchiveScreenPresenter', () => {
    it('creates archive view data from persistent trackers', () => {
        const { presenter, rankTracker } = createPresenter();

        const viewData = presenter.createViewData();

        expect(viewData.kpis).toEqual({
            totalCompletedSectors: 12,
            lifetimeContracts: 4,
            totalCollectedItems: 31,
            achievementRate: 25
        });
        expect(rankTracker.getRanking).toHaveBeenCalledWith('score');
        expect(rankTracker.getRanking).toHaveBeenCalledWith('sector');
        expect(rankTracker.getRanking).toHaveBeenCalledWith('collected');
        expect(viewData.rankings.score[0]).toMatchObject({
            rank: 1,
            score: 3000,
            reachedSector: 5,
            collectedItemCount: 10,
            createdAt: '2026.06.16 10:02'
        });
        expect(viewData.replays[0]).toMatchObject({
            id: 'flight_1',
            no: '01',
            favorite: true,
            score: 2400,
            reachedSector: 4,
            createdAt: '2026.06.15 10:02'
        });
        expect(viewData.achievements[0]).toMatchObject({
            title: 'NOT ACHIEVED',
            method: 'Total Launches',
            stats: '2 / 1',
            progressRate: 0.4,
            achievedTier: null
        });
    });
});
