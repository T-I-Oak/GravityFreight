import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import StorySystem from '../../../../src/systems/logic/StorySystem.js';

function createCommonDataManagerStub(savedStoryProgress = { readMessageIds: [] }) {
    return {
        getSavedData: vi.fn((key, migrationMap) => {
            if (key === 'story_progress') {
                return savedStoryProgress;
            }
            return migrationMap.init();
        }),
        setSavedData: vi.fn()
    };
}

async function createStorySystem(savedStoryProgress) {
    const commonDataManager = createCommonDataManagerStub(savedStoryProgress);
    const repository = new GameDataRepository(commonDataManager, { expandLanguageResource: value => value });
    await repository.loadAllData();

    const storySystem = new StorySystem(repository);
    storySystem.initialize();

    return { commonDataManager, repository, storySystem };
}

describe('StorySystem', () => {
    let commonDataManager;
    let repository;
    let storySystem;

    beforeEach(async () => {
        ({ commonDataManager, repository, storySystem } = await createStorySystem({
            readMessageIds: ['T', 'TR']
        }));
    });

    it('initializes read state from saved story progress', () => {
        expect(storySystem.isRead('T')).toBe(true);
        expect(storySystem.isRead('TR')).toBe(true);
        expect(storySystem.isRead('TB')).toBe(false);
        expect(commonDataManager.getSavedData).toHaveBeenCalledWith('story_progress', expect.any(Object));
    });

    it('checks deep read state against existing story ids only', () => {
        expect(storySystem.isRead('TR', true)).toBe(false);
        expect(storySystem.isRead('missing', true)).toBe(true);
    });

    it('updates read status and persists StoryProgressData without duplicates', () => {
        storySystem.updateReadStatus('TB');
        storySystem.updateReadStatus('TB');

        expect(storySystem.isRead('TB')).toBe(true);
        expect(commonDataManager.setSavedData).toHaveBeenCalledTimes(1);
        expect(commonDataManager.setSavedData).toHaveBeenCalledWith('story_progress', {
            readMessageIds: ['T', 'TR', 'TB']
        });
    });

    it('builds session story status from unlocked branch history', async () => {
        ({ storySystem } = await createStorySystem({ readMessageIds: ['T'] }));

        expect(storySystem.unlockNextStep('T')).toBe('T');
        expect(storySystem.unlockNextStep('R')).toBe('TR');

        expect(storySystem.getStoryStatus()).toEqual([
            { id: 'T', type: 'T', isUnread: false },
            { id: 'TR', type: 'R', isUnread: true }
        ]);
    });

    it('stops unlocking after the third story step', async () => {
        ({ storySystem } = await createStorySystem({ readMessageIds: [] }));

        expect(storySystem.unlockNextStep('T')).toBe('T');
        expect(storySystem.unlockNextStep('R')).toBe('TR');
        expect(storySystem.unlockNextStep('B')).toBe('TRB');
        expect(storySystem.unlockNextStep('T')).toBeNull();

        expect(storySystem.getStoryStatus()).toEqual([
            { id: 'T', type: 'T', isUnread: true },
            { id: 'TR', type: 'R', isUnread: true },
            { id: 'TRB', type: 'B', isUnread: true }
        ]);
    });

    it('returns message data delegated through GameDataRepository', () => {
        const message = storySystem.getMessageData('TR');
        const story = repository.getStoryContent('TR');

        expect(message).toEqual({
            id: 'TR',
            title: story.title,
            discovery: story.discovery,
            body: story.content,
            type: 'R'
        });
    });

    it('returns read counts for achievement evaluation', () => {
        expect(storySystem.getReadCounts()).toEqual({
            total: 2,
            T: 2,
            R: 0,
            B: 0
        });
    });

    it('rejects unknown story ids and branch types', () => {
        expect(() => storySystem.updateReadStatus('missing')).toThrow('[StorySystem] Story not found: missing');
        expect(() => storySystem.getMessageData('missing')).toThrow('[StorySystem] Story not found: missing');
        expect(() => storySystem.unlockNextStep('X')).toThrow('[StorySystem] Invalid branch type: X');
    });
});
