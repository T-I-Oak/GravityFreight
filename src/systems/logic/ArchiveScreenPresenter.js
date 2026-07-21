class ArchiveScreenPresenter {
    constructor(dependencies = {}) {
        this.gameRecordTracker = dependencies.gameRecordTracker;
        this.rankTracker = dependencies.rankTracker;
        this.achievementTracker = dependencies.achievementTracker;
        this.flightRecorder = dependencies.flightRecorder;
        this.gameDataRepository = dependencies.gameDataRepository;
        this.storySystem = dependencies.storySystem;
    }

    createViewData() {
        const records = this.gameRecordTracker.getGameRecordData().values || {};
        const recentResults = this.rankTracker.getRecentResults();
        const latestGameSessionId = recentResults.find(record => record.gameSessionId)?.gameSessionId ?? null;
        return {
            kpis: {
                totalCompletedSectors: records.total_completed_sectors ?? 0,
                lifetimeContracts: records.lifetime_contracts ?? 0,
                totalCollectedItems: records.total_collected_item_count ?? 0,
                achievementRate: Math.round(this.achievementTracker.getAchievementTierCompletionRate() * 100)
            },
            recentResults: this.#createRankRows(recentResults, latestGameSessionId),
            rankings: {
                score: this.#createRankRows(this.rankTracker.getRanking('score'), latestGameSessionId),
                sector: this.#createRankRows(this.rankTracker.getRanking('sector'), latestGameSessionId),
                collected: this.#createRankRows(this.rankTracker.getRanking('collected'), latestGameSessionId)
            },
            replays: this.#createReplayRows(this.flightRecorder.getRecords(), latestGameSessionId),
            achievements: this.#createAchievementRows(),
            stories: this.#createStoryRows()
        };
    }

    #createRankRows(records = [], latestGameSessionId = null) {
        return records.map((record, index) => ({
            rank: index + 1,
            id: record.id,
            gameSessionId: record.gameSessionId ?? null,
            score: record.score ?? 0,
            completedSectors: record.completedSectors ?? 0,
            reachedSector: record.reachedSector ?? 0,
            collectedItemCount: record.collectedItemCount ?? 0,
            createdAt: this.#formatDate(record.createdAt),
            isNew: !!latestGameSessionId && record.gameSessionId === latestGameSessionId
        }));
    }

    #createReplayRows(records = [], latestGameSessionId = null) {
        return records.map((record, index) => ({
            id: record.id,
            gameSessionId: record.gameSessionId ?? null,
            no: String(index + 1).padStart(2, '0'),
            favorite: !!record.favorite,
            reachedSector: record.reachedSector ?? 0,
            score: record.score ?? 0,
            createdAt: this.#formatDate(record.createdAt),
            isNew: !!latestGameSessionId && record.gameSessionId === latestGameSessionId
        }));
    }

    #createAchievementRows() {
        const definitions = new Map(
            this.gameDataRepository.getAchievementDefinitions()
                .map(definition => [definition.id, definition])
        );
        return this.achievementTracker.getAchievementProgress().map(progress => {
            const definition = definitions.get(progress.achievementId) || {};
            const achievedTier = this.#resolveTier(definition, progress.achievedTier);
            const nextTier = this.#resolveTier(definition, progress.nextTier);
            const goal = nextTier?.goal ?? 'MAX';
            return {
                title: progress.achievedTier ? achievedTier?.title : 'NOT ACHIEVED',
                method: definition.keyLabel || definition.label || progress.achievementId,
                stats: `${this.#formatNumber(progress.value ?? 0)} / ${goal === 'MAX' ? goal : this.#formatNumber(goal)}`,
                progressRate: progress.progressRate ?? 0,
                achievedTier: progress.achievedTier
            };
        });
    }

    #createStoryRows() {
        if (!this.storySystem) {
            return [];
        }
        return this.storySystem.getAllStoryStatus().map(story => {
            const category = this.gameDataRepository.getStoryCategoryDefinition(story.type);
            return {
                id: story.id,
                title: story.isRead ? story.title : '???',
                isRead: story.isRead,
                className: category.className,
                icon: category.icon
            };
        });
    }

    #resolveTier(definition, tierNumber) {
        const tiers = definition.tiers || [];
        return tierNumber ? tiers[tierNumber - 1] || null : null;
    }

    #formatDate(value) {
        const date = value ? new Date(value) : null;
        if (!date || Number.isNaN(date.getTime())) {
            return '-';
        }
        const pad = number => String(number).padStart(2, '0');
        return [
            `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`,
            `${pad(date.getHours())}:${pad(date.getMinutes())}`
        ].join(' ');
    }

    #formatNumber(value) {
        return new Intl.NumberFormat('en-US').format(value ?? 0);
    }
}

export default ArchiveScreenPresenter;
