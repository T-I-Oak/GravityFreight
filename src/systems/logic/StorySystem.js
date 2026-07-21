const VALID_BRANCH_TYPES = new Set(['T', 'R', 'B']);
const REGULAR_STORY_ID_PATTERN = /^[TRB]{1,3}$/;
const HOMECOMING_STORY_ID = 'HOME25';
const HOMECOMING_SECTOR = 25;

class StorySystem {
    constructor(gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[StorySystem] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.history = '';
        this.readIds = new Set();
        this.masterIds = new Set();
    }

    initialize() {
        const migrationMap = {
            init: () => ({ readMessageIds: [] })
        };
        const data = this.gameDataRepository.getSavedStoryProgress(migrationMap) || {};

        this.readIds = new Set(Array.isArray(data.readMessageIds) ? data.readMessageIds : []);
        this.masterIds = new Set(this.gameDataRepository.getStoryIds());
        this.history = '';
    }

    isRead(storyId, deep = false) {
        if (!deep) {
            return this.readIds.has(storyId);
        }

        const targetIds = Array.from(this.masterIds).filter(id => id.startsWith(storyId));
        return targetIds.every(id => this.readIds.has(id));
    }

    updateReadStatus(storyId) {
        this.#assertStoryId(storyId);
        if (this.readIds.has(storyId)) {
            return;
        }

        this.readIds.add(storyId);
        this.#save();
    }

    unlockNextStep(branchType) {
        if (!VALID_BRANCH_TYPES.has(branchType)) {
            throw new Error(`[StorySystem] Invalid branch type: ${branchType}`);
        }
        if (this.history.length >= 3) {
            return null;
        }

        const nextId = `${this.history}${branchType}`;
        this.#assertStoryId(nextId);
        this.history = nextId;
        this.#save();
        return nextId;
    }

    getSectorArrivalStoryId(previousSectorNumber, currentSectorNumber) {
        if (previousSectorNumber !== HOMECOMING_SECTOR - 1 || currentSectorNumber !== HOMECOMING_SECTOR) {
            return null;
        }

        this.#assertStoryId(HOMECOMING_STORY_ID);
        const regularStoryIds = Array.from(this.masterIds).filter(id => REGULAR_STORY_ID_PATTERN.test(id));
        const allRegularStoriesRead = regularStoryIds.every(id => this.readIds.has(id));
        return allRegularStoriesRead ? HOMECOMING_STORY_ID : null;
    }

    getStoryStatus() {
        return Array.from({ length: this.history.length }, (_, index) => {
            const id = this.history.slice(0, index + 1);
            return {
                id,
                type: id.at(-1),
                isUnread: !this.readIds.has(id)
            };
        });
    }

    getMessageData(storyId) {
        this.#assertStoryId(storyId);
        const story = this.gameDataRepository.getStoryContent(storyId);

        return {
            id: storyId,
            title: story.title,
            discovery: story.discovery,
            body: story.content,
            type: story.branch
        };
    }

    getReadCounts() {
        const counts = { total: 0, T: 0, R: 0, B: 0 };

        for (const storyId of this.readIds) {
            if (!this.masterIds.has(storyId)) {
                continue;
            }

            counts.total += 1;
            if (!REGULAR_STORY_ID_PATTERN.test(storyId)) {
                continue;
            }
            const branchType = storyId[0];
            if (branchType in counts) {
                counts[branchType] += 1;
            }
        }

        return counts;
    }

    getAllStoryStatus() {
        return Array.from(this.masterIds).map(id => {
            const story = this.gameDataRepository.getStoryContent(id);
            return {
                id,
                type: story.branch,
                title: story.title,
                isRead: this.readIds.has(id)
            };
        });
    }

    getStoryProgressData() {
        return {
            readMessageIds: Array.from(this.readIds)
        };
    }

    resetSession() {
        this.history = '';
    }

    #save() {
        this.gameDataRepository.setSavedStoryProgress(this.getStoryProgressData());
    }

    #assertStoryId(storyId) {
        if (!this.masterIds.has(storyId)) {
            throw new Error(`[StorySystem] Story not found: ${storyId}`);
        }
    }
}

export default StorySystem;
