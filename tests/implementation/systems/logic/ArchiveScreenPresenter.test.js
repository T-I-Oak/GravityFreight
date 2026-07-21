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
            { id: 'recent_1', gameSessionId: 'session_latest', score: 1200, reachedSector: 3, collectedItemCount: 7, createdAt: '2026-06-17T01:02:03.000Z' }
        ]),
        getRanking: vi.fn(category => ({
            score: [
                { id: 'score_1', gameSessionId: 'session_latest', score: 3000, reachedSector: 5, collectedItemCount: 10, createdAt: '2026-06-16T01:02:03.000Z' }
            ],
            sector: [],
            collected: []
        })[category])
    };
    const achievementTracker = {
        getAchievementCompletionRate: vi.fn(() => 0.25),
        getAchievementTierCompletionRate: vi.fn(() => 0.5),
        getAchievementProgress: vi.fn(() => [
            { achievementId: 'stat_launches', value: 2, achievedTier: null, nextTier: 3, progressRate: 0.4 }
        ])
    };
    const flightRecorder = {
        getRecords: vi.fn(() => [
            { id: 'flight_1', gameSessionId: 'session_latest', score: 2400, reachedSector: 4, createdAt: '2026-06-15T01:02:03.000Z', favorite: true }
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
        ]),
        getStoryCategoryDefinition: vi.fn(type => ({
            T: { className: 'trading-post', icon: 'T' },
            R: { className: 'repair-dock', icon: 'R' },
            HOME: { className: 'home', icon: 'H' }
        })[type])
    };
    const storySystem = {
        getAllStoryStatus: vi.fn(() => [
            { id: 'T', type: 'T', title: 'Read Story', isRead: true },
            { id: 'TR', type: 'R', title: 'Unread Story', isRead: false },
            { id: 'HOME25', type: 'HOME', title: 'Home Story', isRead: true }
        ])
    };

    return {
        presenter: new ArchiveScreenPresenter({
            gameRecordTracker,
            rankTracker,
            achievementTracker,
            flightRecorder,
            gameDataRepository,
            storySystem
        }),
        rankTracker,
        storySystem
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
            achievementRate: 50
        });
        expect(rankTracker.getRanking).toHaveBeenCalledWith('score');
        expect(rankTracker.getRanking).toHaveBeenCalledWith('sector');
        expect(rankTracker.getRanking).toHaveBeenCalledWith('collected');
        expect(viewData.rankings.score[0]).toMatchObject({
            rank: 1,
            score: 3000,
            reachedSector: 5,
            collectedItemCount: 10,
            createdAt: '2026.06.16 10:02',
            isNew: true
        });
        expect(viewData.replays[0]).toMatchObject({
            id: 'flight_1',
            no: '01',
            favorite: true,
            score: 2400,
            reachedSector: 4,
            createdAt: '2026.06.15 10:02',
            isNew: true
        });
        expect(viewData.achievements[0]).toMatchObject({
            title: 'NOT ACHIEVED',
            method: 'Total Launches',
            stats: '2 / 1',
            progressRate: 0.4,
            achievedTier: null
        });
        expect(viewData.stories).toEqual([
            { id: 'T', title: 'Read Story', isRead: true, className: 'trading-post', icon: 'T' },
            { id: 'TR', title: '???', isRead: false, className: 'repair-dock', icon: 'R' },
            { id: 'HOME25', title: 'Home Story', isRead: true, className: 'home', icon: 'H' }
        ]);
    });

    it('shows the next tier goal for achieved achievement progress', () => {
        const { presenter } = createPresenter();
        presenter.achievementTracker = {
            getAchievementTierCompletionRate: vi.fn(() => 0),
            getAchievementProgress: vi.fn(() => [
                { achievementId: 'stat_launches', value: 7000, achievedTier: 3, nextTier: 2, progressRate: 0.4 },
                { achievementId: 'stat_launches', value: 12000, achievedTier: 1, nextTier: null, progressRate: 1 }
            ])
        };
        presenter.gameDataRepository = {
            getAchievementDefinitions: vi.fn(() => [
                {
                    id: 'stat_launches',
                    label: 'Launch Count',
                    keyLabel: 'Total Launches',
                    tiers: [
                        { title: 'Veteran', goal: 10000 },
                        { title: 'Pilot', goal: 5000 },
                        { title: 'Rookie', goal: 1000 }
                    ]
                }
            ]),
            getStoryCategoryDefinition: vi.fn(type => ({
                T: { className: 'trading-post', icon: 'T' },
                R: { className: 'repair-dock', icon: 'R' },
                HOME: { className: 'home', icon: 'H' }
            })[type])
        };

        const viewData = presenter.createViewData();

        expect(viewData.achievements[0]).toMatchObject({
            title: 'Rookie',
            stats: '7,000 / 5,000',
            achievedTier: 3
        });
        expect(viewData.achievements[1]).toMatchObject({
            title: 'Veteran',
            stats: '12,000 / MAX',
            achievedTier: 1
        });
    });
});
