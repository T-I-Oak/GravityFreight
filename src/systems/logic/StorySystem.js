const VALID_BRANCH_TYPES = new Set(['T', 'R', 'B']);

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
            type: storyId.at(-1)
        };
    }

    getReadCounts() {
        const counts = { total: 0, T: 0, R: 0, B: 0 };

        for (const storyId of this.readIds) {
            if (!this.masterIds.has(storyId)) {
                continue;
            }

            counts.total += 1;
            const branchType = storyId[0];
            if (branchType in counts) {
                counts[branchType] += 1;
            }
        }

        return counts;
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
