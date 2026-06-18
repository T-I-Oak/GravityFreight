import Item from '../entities/Item.js';
import BlackMarketService from './BlackMarketService.js';
import PricingService from './PricingService.js';
import RepairDockService from './RepairDockService.js';
import SettlementCalculator from './SettlementCalculator.js';
import TradingPostService from './TradingPostService.js';

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
        this.pricingService = new PricingService();
        this.settlementCalculator = new SettlementCalculator(gameDataRepository, this);
        this.tradingPostService = new TradingPostService(this);
        this.blackMarketService = new BlackMarketService(this, this.pricingService);
        this.repairDockService = new RepairDockService(this.pricingService);
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
        return item.calculateAppraisalValue();
    }

    generateTradingPostStock(session) {
        return this.tradingPostService.generateStock(session);
    }

    drawBlackMarketGacha(type, session, luckyDiscount = 0) {
        return this.blackMarketService.drawGacha(type, session, luckyDiscount);
    }

    createRepairTransaction(launcher, luckyDiscount = 0) {
        return this.repairDockService.createRepairTransaction(launcher, luckyDiscount);
    }

    createDismantleTransaction(rocketItem, countInSession, luckyDiscount = 0) {
        return this.repairDockService.createDismantleTransaction(rocketItem, countInSession, luckyDiscount);
    }

    calculateFinalPrice(originalPrice, luckyDiscount, itemDiscount = 0) {
        return this.pricingService.calculateFinalPrice(originalPrice, luckyDiscount, itemDiscount);
    }

    calculateRepairCost(launcher, luckyDiscount) {
        return this.pricingService.calculateRepairCost(launcher, luckyDiscount);
    }

    calculateDismantleCost(countInSession, luckyDiscount) {
        return this.pricingService.calculateDismantleCost(countInSession, luckyDiscount);
    }

    calculateSettlement(collision, flightData, session) {
        return this.settlementCalculator.calculate(collision, flightData, session);
    }

    checkGameOver(session) {
        const details = [];
        if (!this.#hasLaunchableRocketBase(session)) {
            details.push(...REQUIRED_GAME_PARTS
                .filter(part => part.category !== 'launcher')
                .filter(part => !this.#hasUsableInventoryPart(session, part.category))
                .map(part => part.detail));
        }
        if (!this.#hasUsableInventoryPart(session, 'launcher')) {
            details.push('LAUNCHER');
        }

        if (details.length === 0) {
            return null;
        }

        return {
            reason: 'NO_PARTS_REMAINING',
            details
        };
    }

    #hasLaunchableRocketBase(session) {
        if (this.#hasUsableInventoryPart(session, 'rocket')) {
            return true;
        }

        return this.#hasUsableInventoryPart(session, 'chassis')
            && this.#hasUsableInventoryPart(session, 'logic');
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

    #hasUsableInventoryPart(session, category) {
        const stacks = session.inventory.getItemsByCategory(category);
        if (category !== 'launcher') {
            return stacks.length > 0;
        }

        return stacks.some(stack => stack.items.some(item => item.charges > 0));
    }
}

export default EconomySystem;
