class GameRecordTracker {
    constructor(gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[GameRecordTracker] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.data = { values: {} };
    }

    initialize() {
        this.data = this.gameDataRepository.getSavedGameRecordData({
            init: () => ({ values: {} })
        });
        this.data.values = { ...(this.data.values || {}) };
    }

    recordSectorStart(sessionState) {
        return this.#saveIfChanged([
            this.#setMax('max_reached_sector', sessionState.sectorNumber)
        ]);
    }

    recordFlightResult(result = {}) {
        return this.#saveIfChanged([
            this.#add('total_launches', 1),
            this.#add('total_completed_sectors', result.completedSectors ?? 0),
            this.#add('total_distance', result.distance ?? 0),
            this.#setMax('max_distance', result.distance ?? 0),
            this.#add('total_score', result.score ?? result.totalScore ?? 0),
            this.#add('total_earned_coins', result.earnedCoins ?? result.totalCoins ?? 0),
            this.#add('total_collected_item_count', result.collectedItemCount ?? result.acquiredItemCount ?? 0)
        ]);
    }

    recordGameResult(gameResult = {}) {
        return this.#saveIfChanged([
            this.#add('lifetime_contracts', 1),
            this.#setMax('max_score', gameResult.totalScore ?? 0),
            this.#setMax('max_earned_coins', gameResult.totalCoins ?? 0),
            this.#setMax('max_reached_sector', gameResult.reachedSector ?? 0),
            this.#setMax('max_collected_item_count', gameResult.collectedItemCount ?? 0)
        ]);
    }

    recordTransaction(delta = {}, context = {}) {
        return this.#saveIfChanged([
            this.#add('total_earned_coins', delta.earnedCoins ?? 0),
            this.#add('total_spent_coins', delta.spentCoins ?? 0),
            this.#add('total_collected_item_count', delta.acquiredItemCount ?? 0),
            this.#setMax('max_coins', context.currentCoins ?? 0)
        ]);
    }

    recordCurrencyChange(context = {}) {
        return this.#saveIfChanged([
            this.#add('total_earned_coins', context.earnedCoins ?? 0),
            this.#add('total_spent_coins', context.spentCoins ?? 0),
            this.#setMax('max_coins', context.currentCoins ?? 0)
        ]);
    }

    recordDeliverySuccess(context = {}) {
        const count = context.count ?? 1;
        const currentContractDeliveries = context.currentContractDeliveries ?? count;

        return this.#saveIfChanged([
            this.#add('total_deliveries', count),
            this.#setMax('max_deliveries', currentContractDeliveries)
        ]);
    }

    getRecordValue(recordKey) {
        return this.data.values[recordKey] ?? 0;
    }

    getGameRecordData() {
        return {
            values: { ...this.data.values }
        };
    }

    #add(key, amount) {
        if (!Number.isFinite(amount) || amount === 0) {
            return null;
        }

        this.data.values[key] = this.getRecordValue(key) + amount;
        return key;
    }

    #setMax(key, value) {
        if (!Number.isFinite(value) || value <= this.getRecordValue(key)) {
            return null;
        }

        this.data.values[key] = value;
        return key;
    }

    #saveIfChanged(keys) {
        const updatedKeys = [...new Set(keys.filter(Boolean))];
        if (updatedKeys.length > 0) {
            this.gameDataRepository.setSavedGameRecordData(this.getGameRecordData());
        }
        return updatedKeys;
    }
}

export default GameRecordTracker;
