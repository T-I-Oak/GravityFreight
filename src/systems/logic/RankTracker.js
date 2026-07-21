import IDGenerator from '../../core/utils/IDGenerator.js';

const MAX_CATEGORY_RECORDS = 20;
const RANKING_FIELDS = {
    score: 'score',
    sector: 'reachedSector',
    collected: 'collectedItemCount'
};

class RankTracker {
    constructor(gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[RankTracker] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.data = { records: [] };
    }

    initialize() {
        this.data = this.gameDataRepository.getSavedRankData({
            init: () => ({ records: [] })
        });
        this.data.records = Array.isArray(this.data.records) ? this.data.records.map(record => ({ ...record })) : [];
        this.#pruneRecords();
    }

    recordGameResult(gameResult = {}) {
        const record = this.#createGamePlayResult(gameResult);

        this.data.records.push(record);
        this.#pruneRecords();
        this.gameDataRepository.setSavedRankData(this.getRankData());

        return {
            scoreRank: this.#getRecordRank('score', record),
            sectorRank: this.#getRecordRank('sector', record),
            collectedRank: this.#getRecordRank('collected', record)
        };
    }

    getRanking(category) {
        this.#assertCategory(category);
        return this.#sortByCategory(category, this.data.records)
            .slice(0, MAX_CATEGORY_RECORDS)
            .map(record => ({ ...record }));
    }

    getRecentResults() {
        return this.#sortByCreatedAt(this.data.records)
            .slice(0, MAX_CATEGORY_RECORDS)
            .map(record => ({ ...record }));
    }

    getRankData() {
        return {
            records: this.data.records.map(record => ({ ...record }))
        };
    }

    #createGamePlayResult(gameResult) {
        return {
            id: IDGenerator.generate('rank'),
            createdAt: gameResult.createdAt || new Date().toISOString(),
            score: gameResult.totalScore ?? gameResult.score ?? 0,
            completedSectors: gameResult.completedSectors ?? 0,
            reachedSector: gameResult.reachedSector ?? 0,
            collectedItemCount: gameResult.collectedItemCount ?? 0,
            gameSessionId: gameResult.gameSessionId ?? null
        };
    }

    #pruneRecords() {
        const keepIds = new Set();

        Object.keys(RANKING_FIELDS).forEach(category => {
            this.#sortByCategory(category, this.data.records)
                .slice(0, MAX_CATEGORY_RECORDS)
                .forEach(record => keepIds.add(record.id));
        });
        this.#sortByCreatedAt(this.data.records)
            .slice(0, MAX_CATEGORY_RECORDS)
            .forEach(record => keepIds.add(record.id));

        this.data.records = this.data.records.filter(record => keepIds.has(record.id));
    }

    #getRecordRank(category, record) {
        const ranking = this.getRanking(category);
        const index = ranking.findIndex(candidate => candidate.id === record.id);
        return index < 0 ? null : index + 1;
    }

    #sortByCategory(category, records) {
        this.#assertCategory(category);
        const field = RANKING_FIELDS[category];
        return [...records].sort((a, b) => {
            const valueDiff = (b[field] ?? 0) - (a[field] ?? 0);
            if (valueDiff !== 0) {
                return valueDiff;
            }
            return this.#compareCreatedAtDesc(a, b);
        });
    }

    #sortByCreatedAt(records) {
        return [...records].sort((a, b) => this.#compareCreatedAtDesc(a, b));
    }

    #compareCreatedAtDesc(a, b) {
        const timeA = Date.parse(a.createdAt) || 0;
        const timeB = Date.parse(b.createdAt) || 0;
        if (timeB !== timeA) {
            return timeB - timeA;
        }
        return String(b.id).localeCompare(String(a.id));
    }

    #assertCategory(category) {
        if (!RANKING_FIELDS[category]) {
            throw new Error(`[RankTracker] Unknown ranking category: ${category}`);
        }
    }
}

export default RankTracker;
