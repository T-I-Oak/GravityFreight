import Item from './Item.js';
import ItemContainer from './ItemContainer.js';

class SessionState {
    constructor(gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[SessionState] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.inventory = new ItemContainer();
        this.#resetCounters();
    }

    initialize() {
        const initialSetup = this.gameDataRepository.getInitialSetup();

        this.#resetCounters();
        this.coins = initialSetup.initialCoins;
        this.inventory = new ItemContainer();
        initialSetup.initialInventory.forEach(itemId => {
            this.inventory.addItem(new Item(itemId, this.gameDataRepository));
        });
    }

    incrementSector() {
        this.sectorNumber += 1;
    }

    recordBlackMarketVisit() {
        this.blackMarketVisits += 1;
    }

    applyTransaction(transaction = {}) {
        const spentCoins = transaction.spentCoins ?? 0;
        const baseEarnedCoins = transaction.earnedCoins ?? 0;
        const baseAcquiredItems = transaction.acquiredItems ?? [];
        const requiredItems = transaction.requiredItems ?? [];
        const removedItems = transaction.removedItems ?? [];

        if (this.coins < spentCoins) {
            throw new Error('[SessionState] Not enough coins for transaction.');
        }
        [...requiredItems, ...removedItems].forEach(item => {
            if (!this.inventory.hasItem(item)) {
                throw new Error('[SessionState] Transaction item is not in inventory.');
            }
        });

        const removedItemResults = removedItems.map(item => this.inventory.removeItem(item));
        const commitResult = transaction.onCommit ? transaction.onCommit({
            removedItems: removedItemResults
        }) : {};
        const earnedCoins = baseEarnedCoins + (commitResult.earnedCoins ?? 0);
        const acquiredItems = [
            ...baseAcquiredItems,
            ...(commitResult.acquiredItems ?? [])
        ];

        this.coins = this.coins - spentCoins + earnedCoins;
        this.totalEarnedCoins += earnedCoins;
        this.collectedItemCount += acquiredItems.length;
        acquiredItems.forEach(item => this.inventory.addItem(item));

        return {
            spentCoins,
            earnedCoins,
            acquiredItemCount: acquiredItems.length,
            removedItemCount: removedItemResults.length
        };
    }

    applySettlement(result = {}) {
        const totalCoins = result.totalCoins ?? 0;
        const totalScore = result.totalScore ?? 0;
        const flightTicks = result.flightTicks ?? 0;
        const acquiredItems = result.acquiredItems ?? [];

        this.coins += totalCoins;
        this.totalEarnedCoins += totalCoins;
        this.totalScore += totalScore;
        this.totalFlightTicks += flightTicks;
        this.collectedItemCount += acquiredItems.length;
        acquiredItems.forEach(item => this.inventory.addItem(item));

        if (result.lostToTarget) {
            result.lostToTarget.target.addItems(result.lostToTarget.items);
        }
    }

    getGameResultSummary(context = {}) {
        if (!Number.isInteger(context.completedSectors)) {
            throw new Error('[SessionState] completedSectors is required.');
        }

        return {
            totalScore: this.totalScore,
            totalCoins: this.totalEarnedCoins,
            completedSectors: context.completedSectors,
            reachedSector: this.sectorNumber,
            totalFlightTicks: this.totalFlightTicks,
            collectedItemCount: this.collectedItemCount
        };
    }

    #resetCounters() {
        this.sectorNumber = 0;
        this.totalScore = 0;
        this.totalEarnedCoins = 0;
        this.totalFlightTicks = 0;
        this.collectedItemCount = 0;
        this.coins = 0;
        this.blackMarketVisits = 0;
    }
}

export default SessionState;
