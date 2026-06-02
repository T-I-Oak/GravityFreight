import Item from '../entities/Item.js';

const COMPONENT_CATEGORIES = ['chassis', 'logic', 'launcher', 'module', 'booster'];
const REQUIRED_GAME_PARTS = [
    { category: 'chassis', detail: 'CHASSIS' },
    { category: 'logic', detail: 'LOGIC' },
    { category: 'launcher', detail: 'LAUNCHER' }
];

class EconomySystem {
    constructor(gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[EconomySystem] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
    }

    drawLottery(session, count, options = {}) {
        if (!session || !Number.isInteger(session.sectorNumber)) {
            throw new Error('[EconomySystem] session with sectorNumber is required.');
        }
        if (!Number.isInteger(count) || count < 0) {
            throw new Error('[EconomySystem] count must be a non-negative integer.');
        }

        const pool = this.#createLotteryPool(session, options);
        if (pool.length === 0 && count > 0) {
            throw new Error('[EconomySystem] Lottery pool is empty.');
        }

        return Array.from({ length: count }, () => {
            const selected = this.#drawWeighted(pool);
            return new Item(selected.definition.id, this.gameDataRepository);
        });
    }

    calculateAppraisalValue(item) {
        const rarityRate = this.#getRarityRate(item.rarity);
        const basePrice = this.gameDataRepository.getRarityPrices()[String(rarityRate)];
        if (!Number.isFinite(basePrice)) {
            throw new Error(`[EconomySystem] Rarity price not found: ${item.rarity}`);
        }

        const conditionCorrection = this.#calculateConditionCorrection(item);
        const enhancementCorrection = 1 + (item.enhancementCount || 0) * 0.1;

        return Math.floor(basePrice * conditionCorrection * enhancementCorrection);
    }

    generateTradingPostStock(session) {
        const items = this.drawLottery(session, 6, {
            excludeCategories: ['cargo', 'coin']
        });
        const saleIndex = Math.floor(Math.random() * items.length);

        return items.map((item, index) => ({
            item,
            originalPrice: this.calculateAppraisalValue(item) * 2,
            itemDiscount: index === saleIndex ? 0.3 : 0
        }));
    }

    calculateFinalPrice(originalPrice, luckyDiscount, itemDiscount = 0) {
        const finalDiscount = Math.min(0.5, luckyDiscount + itemDiscount);
        return Math.floor(originalPrice * (1 - finalDiscount));
    }

    calculateRepairCost(launcher, luckyDiscount) {
        const missingCharges = Math.max(0, launcher.maxCharges - launcher.charges);
        return this.calculateFinalPrice(missingCharges * 10, luckyDiscount);
    }

    calculateDismantleCost(countInSession, luckyDiscount) {
        return this.calculateFinalPrice(50 * (countInSession + 1), luckyDiscount);
    }

    checkGameOver(session) {
        const details = REQUIRED_GAME_PARTS
            .filter(part => !this.#hasUsableInventoryPart(session, part.category))
            .map(part => part.detail);

        if (details.length === 0) {
            return null;
        }

        return {
            reason: 'NO_PARTS_REMAINING',
            details
        };
    }

    #createLotteryPool(session, options) {
        const excludeCategories = options.excludeCategories || [];
        const bonusThreshold = options.bonusThreshold || 0;
        const threshold = 14 + session.sectorNumber + bonusThreshold;

        return this.gameDataRepository.getAllItemDefinitions()
            .filter(definition => !excludeCategories.includes(definition.category))
            .map(definition => ({
                definition,
                weight: threshold - this.#getRarityRate(definition.rarity)
            }))
            .filter(candidate => candidate.weight > 0);
    }

    #drawWeighted(pool) {
        const totalWeight = pool.reduce((sum, candidate) => sum + candidate.weight, 0);
        let cursor = Math.random() * totalWeight;

        for (const candidate of pool) {
            cursor -= candidate.weight;
            if (cursor < 0) {
                return candidate;
            }
        }

        return pool[pool.length - 1];
    }

    #getRarityRate(rarity) {
        const rate = this.gameDataRepository.getRaritySettings()[rarity.toUpperCase()];
        if (!Number.isFinite(rate)) {
            throw new Error(`[EconomySystem] Rarity setting not found: ${rarity}`);
        }
        return rate;
    }

    #calculateConditionCorrection(item) {
        if (!COMPONENT_CATEGORIES.includes(item.category) || item.maxCharges <= 0) {
            return 1;
        }

        return (item.charges + 1) / (item.maxCharges + 1);
    }

    #hasUsableInventoryPart(session, category) {
        const stacks = session.inventory.getItemsByCategory(category);
        if (category !== 'launcher') {
            return stacks.length > 0;
        }

        return stacks.some(stack => stack.items.some(item => item.charges > 0));
    }
}

export default EconomySystem;
