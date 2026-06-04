const EXCLUDE_CATEGORIES = ['cargo', 'coin'];

const GACHA_SETTINGS = {
    normal: {
        baseCost: 100,
        outputLine: 100,
        bonusThreshold: 0,
        getEnhancementCount: roll => (roll < 0.5 ? 1 : 0)
    },
    premium: {
        baseCost: 500,
        outputLine: 500,
        bonusThreshold: 5,
        getEnhancementCount: roll => {
            if (roll < 0.5) {
                return 2;
            }
            if (roll < 0.75) {
                return 1;
            }
            return 0;
        }
    }
};

class BlackMarketService {
    constructor(lotteryService, pricingService) {
        if (!lotteryService || !pricingService) {
            throw new Error('[BlackMarketService] lotteryService and pricingService are required.');
        }

        this.lotteryService = lotteryService;
        this.pricingService = pricingService;
    }

    drawGacha(type, session, luckyDiscount = 0) {
        const setting = GACHA_SETTINGS[type];
        if (!setting) {
            throw new Error(`[BlackMarketService] Unknown gacha type: ${type}`);
        }

        const acquiredItems = [];
        let totalValue = 0;

        while (totalValue < setting.outputLine) {
            const [item] = this.lotteryService.drawLottery(session, 1, {
                bonusThreshold: setting.bonusThreshold,
                excludeCategories: EXCLUDE_CATEGORIES
            });
            if (!item) {
                throw new Error('[BlackMarketService] Lottery returned no item.');
            }

            const enhancementCount = setting.getEnhancementCount(Math.random());
            for (let i = 0; i < enhancementCount; i += 1) {
                item.applyMaintenance();
            }

            acquiredItems.push(item);
            totalValue += item.calculateAppraisalValue();
        }

        return {
            spentCoins: this.pricingService.calculateFinalPrice(setting.baseCost, luckyDiscount),
            earnedCoins: 0,
            acquiredItems
        };
    }
}

export default BlackMarketService;
