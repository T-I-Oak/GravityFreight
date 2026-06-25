class PricingService {
    calculateFinalPrice(originalPrice, luckyDiscount, itemDiscount = 0) {
        const finalDiscount = Math.min(0.5, luckyDiscount + itemDiscount);
        return Math.floor(originalPrice * (1 - finalDiscount));
    }

    calculateRepairCost(launcher, luckyDiscount) {
        return this.calculateFinalPrice(10, luckyDiscount);
    }

    calculateDismantleCost(countInSession, luckyDiscount) {
        return this.calculateFinalPrice(50 * (countInSession + 1), luckyDiscount);
    }
}

export default PricingService;
