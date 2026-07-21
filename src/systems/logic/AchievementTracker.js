class AchievementTracker {
    constructor(gameDataRepository, gameRecordTracker, storySystem) {
        if (!gameDataRepository) {
            throw new Error('[AchievementTracker] gameDataRepository is required.');
        }
        if (!gameRecordTracker) {
            throw new Error('[AchievementTracker] gameRecordTracker is required.');
        }
        if (!storySystem) {
            throw new Error('[AchievementTracker] storySystem is required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.gameRecordTracker = gameRecordTracker;
        this.storySystem = storySystem;
        this.definitions = [];
        this.previousTiers = new Map();
    }

    initialize() {
        this.definitions = this.gameDataRepository.getAchievementDefinitions().map(definition => ({
            ...definition,
            tiers: [...(definition.tiers || [])]
        }));
        this.previousTiers = new Map();

        for (const definition of this.definitions) {
            this.#assertSupportedDefinition(definition);
            this.previousTiers.set(definition.id, this.#calculateAchievedTier(definition, this.#getValue(definition)));
        }
    }

    evaluateAchievements(target) {
        const source = target?.source;
        const keys = new Set(target?.keys || []);
        const reachedEvents = [];

        for (const definition of this.definitions) {
            if (definition.source !== source || !keys.has(definition.key)) {
                continue;
            }

            const value = this.#getValue(definition);
            const previousTier = this.previousTiers.get(definition.id);
            const currentTier = this.#calculateAchievedTier(definition, value);

            reachedEvents.push(...this.#createReachedEvents(definition, previousTier, currentTier, value));
            this.previousTiers.set(definition.id, currentTier);
        }

        return reachedEvents;
    }

    getAchievementProgress() {
        return this.definitions.map(definition => {
            const value = this.#getValue(definition);
            const achievedTier = this.#calculateAchievedTier(definition, value);
            const nextTier = this.#calculateNextTier(definition, achievedTier);

            return {
                achievementId: definition.id,
                source: definition.source,
                key: definition.key,
                value,
                achievedTier,
                nextTier,
                progressRate: this.#calculateProgressRate(definition, value, nextTier)
            };
        });
    }

    getAchievementCompletionRate() {
        if (this.definitions.length === 0) {
            return 0;
        }

        const achievedCount = this.getAchievementProgress()
            .filter(progress => progress.achievedTier !== null)
            .length;
        return achievedCount / this.definitions.length;
    }

    getAchievementTierCompletionRate() {
        const totalTierCount = this.definitions.reduce(
            (total, definition) => total + definition.tiers.length,
            0
        );
        if (totalTierCount === 0) {
            return 0;
        }

        const achievedTierCount = this.definitions.reduce((total, definition) => {
            const achievedTier = this.#calculateAchievedTier(definition, this.#getValue(definition));
            if (achievedTier === null) {
                return total;
            }
            return total + (definition.tiers.length - achievedTier + 1);
        }, 0);
        return achievedTierCount / totalTierCount;
    }

    #getValue(definition) {
        if (definition.source === 'game_record') {
            return this.gameRecordTracker.getRecordValue(definition.key);
        }

        if (definition.source === 'story_read') {
            const counts = this.storySystem.getReadCounts();
            return counts[definition.key] ?? 0;
        }

        throw new Error(`[AchievementTracker] Unsupported source: ${definition.source}`);
    }

    #calculateAchievedTier(definition, value) {
        for (let index = 0; index < definition.tiers.length; index += 1) {
            if (this.#isGoalReached(definition, value, definition.tiers[index].goal)) {
                return index + 1;
            }
        }

        return null;
    }

    #calculateNextTier(definition, achievedTier) {
        if (achievedTier === 1) {
            return null;
        }
        if (achievedTier === null) {
            return definition.tiers.length || null;
        }

        return achievedTier - 1;
    }

    #calculateProgressRate(definition, value, nextTier) {
        if (nextTier === null) {
            return 1;
        }

        const goal = definition.tiers[nextTier - 1]?.goal;
        if (!Number.isFinite(goal) || goal <= 0) {
            return 0;
        }

        return Math.min(1, Math.max(0, value / goal));
    }

    #createReachedEvents(definition, previousTier, currentTier, value) {
        if (currentTier === null) {
            return [];
        }

        const previousRank = previousTier ?? definition.tiers.length + 1;
        if (currentTier >= previousRank) {
            return [];
        }

        const events = [];
        for (let tier = previousRank - 1; tier >= currentTier; tier -= 1) {
            events.push({
                achievementId: definition.id,
                tier,
                value
            });
        }

        return events;
    }

    #isGoalReached(definition, value, goal) {
        if (definition.condition === 'max') {
            return value >= goal;
        }

        throw new Error(`[AchievementTracker] Unsupported condition: ${definition.condition}`);
    }

    #assertSupportedDefinition(definition) {
        if (!definition.id) {
            throw new Error('[AchievementTracker] Achievement id is required.');
        }
        if (!definition.source) {
            throw new Error(`[AchievementTracker] Achievement source is required: ${definition.id}`);
        }
        if (!definition.key) {
            throw new Error(`[AchievementTracker] Achievement key is required: ${definition.id}`);
        }
        if (definition.condition !== 'max') {
            throw new Error(`[AchievementTracker] Unsupported condition: ${definition.condition}`);
        }
    }
}

export default AchievementTracker;
