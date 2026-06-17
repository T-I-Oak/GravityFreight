class ArchiveScreenPresenter {
    constructor(dependencies = {}) {
        this.gameRecordTracker = dependencies.gameRecordTracker;
        this.rankTracker = dependencies.rankTracker;
        this.achievementTracker = dependencies.achievementTracker;
        this.flightRecorder = dependencies.flightRecorder;
        this.gameDataRepository = dependencies.gameDataRepository;
    }

    createViewData() {
        const records = this.gameRecordTracker.getGameRecordData().values || {};
        return {
            kpis: {
                totalCompletedSectors: records.total_completed_sectors ?? 0,
                lifetimeContracts: records.lifetime_contracts ?? 0,
                totalCollectedItems: records.total_collected_item_count ?? 0,
                achievementRate: Math.round(this.achievementTracker.getAchievementCompletionRate() * 100)
            },
            recentResults: this.#createRankRows(this.rankTracker.getRecentResults()),
            rankings: {
                score: this.#createRankRows(this.rankTracker.getRanking('score')),
                sector: this.#createRankRows(this.rankTracker.getRanking('sector')),
                collected: this.#createRankRows(this.rankTracker.getRanking('collected'))
            },
            replays: this.#createReplayRows(this.flightRecorder.getRecords()),
            achievements: this.#createAchievementRows()
        };
    }

    #createRankRows(records = []) {
        return records.map((record, index) => ({
            rank: index + 1,
            score: record.score ?? 0,
            completedSectors: record.completedSectors ?? 0,
            reachedSector: record.reachedSector ?? 0,
            collectedItemCount: record.collectedItemCount ?? 0,
            createdAt: this.#formatDate(record.createdAt)
        }));
    }

    #createReplayRows(records = []) {
        return records.map((record, index) => ({
            id: record.id,
            no: String(index + 1).padStart(2, '0'),
            favorite: !!record.favorite,
            reachedSector: record.reachedSector ?? 0,
            score: record.score ?? 0,
            createdAt: this.#formatDate(record.createdAt)
        }));
    }

    #createAchievementRows() {
        const definitions = new Map(
            this.gameDataRepository.getAchievementDefinitions()
                .map(definition => [definition.id, definition])
        );
        return this.achievementTracker.getAchievementProgress().map(progress => {
            const definition = definitions.get(progress.achievementId) || {};
            const tier = this.#resolveTier(definition, progress);
            const goal = tier?.goal ?? 'MAX';
            return {
                title: progress.achievedTier ? tier?.title : 'NOT ACHIEVED',
                method: definition.keyLabel || definition.label || progress.achievementId,
                stats: `${progress.value ?? 0} / ${goal}`,
                progressRate: progress.progressRate ?? 0,
                achievedTier: progress.achievedTier
            };
        });
    }

    #resolveTier(definition, progress) {
        const tiers = definition.tiers || [];
        if (progress.achievedTier) {
            return tiers[progress.achievedTier - 1] || null;
        }
        if (progress.nextTier) {
            return tiers[progress.nextTier - 1] || null;
        }
        return null;
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
}

export default ArchiveScreenPresenter;
