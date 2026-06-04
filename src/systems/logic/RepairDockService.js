import RocketItem from '../entities/RocketItem.js';

class RepairDockService {
    constructor(pricingService) {
        if (!pricingService) {
            throw new Error('[RepairDockService] pricingService is required.');
        }

        this.pricingService = pricingService;
    }

    createRepairTransaction(launcher, luckyDiscount = 0) {
        if (!launcher || launcher.category !== 'launcher' || launcher.charges >= launcher.maxCharges) {
            throw new Error('[RepairDockService] Repair target must be a damaged launcher.');
        }

        return {
            spentCoins: this.pricingService.calculateFinalPrice(10, luckyDiscount),
            earnedCoins: 0,
            acquiredItems: [],
            requiredItems: [launcher],
            onCommit: () => {
                launcher.repair(1);
                return {};
            }
        };
    }

    createDismantleTransaction(rocketItem, countInSession, luckyDiscount = 0) {
        if (!(rocketItem instanceof RocketItem)) {
            throw new Error('[RepairDockService] Dismantle target must be a RocketItem.');
        }

        return {
            spentCoins: this.pricingService.calculateDismantleCost(countInSession, luckyDiscount),
            earnedCoins: 0,
            acquiredItems: [],
            removedItems: [rocketItem],
            onCommit: () => {
                const parts = rocketItem.getCompositionParts();
                parts.forEach(item => item.applyMaintenance());
                return {
                    acquiredItems: parts
                };
            }
        };
    }
}

export default RepairDockService;
