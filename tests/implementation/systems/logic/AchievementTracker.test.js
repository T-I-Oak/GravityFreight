import { describe, it, expect, vi, beforeEach } from 'vitest';
import AchievementTracker from '../../../../src/systems/logic/AchievementTracker.js';

const achievementDefinitions = [
    {
        id: 'stat_runs',
        source: 'game_record',
        key: 'lifetime_contracts',
        condition: 'max',
        label: 'Contracts',
        tiers: [
            { goal: 100, title: 'Gold' },
            { goal: 20, title: 'Silver' },
            { goal: 5, title: 'Bronze' }
        ]
    },
    {
        id: 'stat_stories_read',
        source: 'story_read',
        key: 'total',
        condition: 'max',
        label: 'Stories',
        tiers: [
            { goal: 39, title: 'All' },
            { goal: 20, title: 'Many' },
            { goal: 5, title: 'Few' }
        ]
    },
    {
        id: 'stat_t_branch',
        source: 'story_read',
        key: 'T',
        condition: 'max',
        label: 'T Stories',
        tiers: [
            { goal: 13, title: 'T Complete' }
        ]
    }
];

function createRepository() {
    return {
        getAchievementDefinitions: vi.fn(() => achievementDefinitions)
    };
}

function createGameRecordTracker(values = {}) {
    return {
        getRecordValue: vi.fn(key => values[key] ?? 0)
    };
}

function createStorySystem(counts = { total: 0, T: 0, R: 0, B: 0 }) {
    return {
        getReadCounts: vi.fn(() => counts)
    };
}

describe('AchievementTracker', () => {
    let repository;
    let gameRecordTracker;
    let storySystem;
    let tracker;

    beforeEach(() => {
        repository = createRepository();
        gameRecordTracker = createGameRecordTracker({ lifetime_contracts: 4 });
        storySystem = createStorySystem({ total: 4, T: 4, R: 0, B: 0 });
        tracker = new AchievementTracker(repository, gameRecordTracker, storySystem);
    });

    it('initializes definitions and previous tiers without emitting existing achievements', () => {
        gameRecordTracker = createGameRecordTracker({ lifetime_contracts: 6 });
        tracker = new AchievementTracker(repository, gameRecordTracker, storySystem);

        tracker.initialize();

        expect(tracker.evaluateAchievements({ source: 'game_record', keys: ['lifetime_contracts'] })).toEqual([]);
        expect(repository.getAchievementDefinitions).toHaveBeenCalled();
    });

    it('returns reached tier events only for targeted updated keys', () => {
        tracker.initialize();
        gameRecordTracker.getRecordValue.mockImplementation(key => ({ lifetime_contracts: 25 }[key] ?? 0));

        expect(tracker.evaluateAchievements({ source: 'game_record', keys: ['lifetime_contracts'] })).toEqual([
            { achievementId: 'stat_runs', tier: 3, value: 25 },
            { achievementId: 'stat_runs', tier: 2, value: 25 }
        ]);
        expect(tracker.evaluateAchievements({ source: 'game_record', keys: ['lifetime_contracts'] })).toEqual([]);
    });

    it('evaluates story read achievements from StorySystem read counts', () => {
        tracker.initialize();
        storySystem.getReadCounts.mockReturnValue({ total: 21, T: 13, R: 4, B: 4 });

        expect(tracker.evaluateAchievements({ source: 'story_read', keys: ['total', 'T'] })).toEqual([
            { achievementId: 'stat_stories_read', tier: 3, value: 21 },
            { achievementId: 'stat_stories_read', tier: 2, value: 21 },
            { achievementId: 'stat_t_branch', tier: 1, value: 13 }
        ]);
    });

    it('returns display progress with next-tier progress rate', () => {
        tracker.initialize();

        expect(tracker.getAchievementProgress()).toEqual([
            {
                achievementId: 'stat_runs',
                source: 'game_record',
                key: 'lifetime_contracts',
                value: 4,
                achievedTier: null,
                nextTier: 3,
                progressRate: 0.8
            },
            {
                achievementId: 'stat_stories_read',
                source: 'story_read',
                key: 'total',
                value: 4,
                achievedTier: null,
                nextTier: 3,
                progressRate: 0.8
            },
            {
                achievementId: 'stat_t_branch',
                source: 'story_read',
                key: 'T',
                value: 4,
                achievedTier: null,
                nextTier: 1,
                progressRate: 4 / 13
            }
        ]);
    });

    it('returns completion rate based on achievements with at least one achieved tier', () => {
        gameRecordTracker = createGameRecordTracker({ lifetime_contracts: 6 });
        storySystem = createStorySystem({ total: 1, T: 13, R: 0, B: 0 });
        tracker = new AchievementTracker(repository, gameRecordTracker, storySystem);
        tracker.initialize();

        expect(tracker.getAchievementCompletionRate()).toBe(2 / 3);
    });
});
