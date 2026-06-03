class TradingPostService {
    constructor(lotteryService) {
        if (!lotteryService) {
            throw new Error('[TradingPostService] lotteryService is required.');
        }

        this.lotteryService = lotteryService;
    }

    generateStock(session) {
        const items = this.lotteryService.drawLottery(session, 6, {
            excludeCategories: ['cargo', 'coin']
        });
        const saleIndex = Math.floor(Math.random() * items.length);

        return items.map((item, index) => ({
            item,
            originalPrice: item.calculateAppraisalValue() * 2,
            itemDiscount: index === saleIndex ? 0.3 : 0
        }));
    }
}

export default TradingPostService;
