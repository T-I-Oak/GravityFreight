import Item from '../entities/Item.js';
import StackedItem from '../entities/StackedItem.js';

const INVENTORY_REWARD_CATEGORIES = ['chassis', 'logic', 'launcher', 'module', 'booster'];
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
        return item.calculateAppraisalValue();
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

    calculateSettlement(collision, flightData, session) {
        const status = this.#resolveSettlementStatus(collision);
        const destination = status === 'cleared' ? collision.target.getFacilityType() : null;
        const facility = destination ? this.gameDataRepository.getFacilityDefinition(destination) : null;
        const heldItems = flightData.heldCargo || [];
        const entries = [];
        const itemReport = [];
        const acquiredItems = [];

        let totalScore = flightData.ticks || 0;
        let totalCoins = 0;
        let unlockedBranchId = null;

        entries.push({ label: 'Flight Duration', score: flightData.ticks || 0 });

        if (facility) {
            totalScore += facility.rewardScore;
            totalCoins += facility.rewardCoins;
            entries.push({
                label: facility.name,
                score: facility.rewardScore,
                coin: facility.rewardCoins
            });
        }

        const collectedCoin = status === 'cleared'
            ? this.#sumCoinValues(heldItems.filter(item => item.category === 'coin'))
            : 0;
        if (collectedCoin > 0) {
            totalCoins += collectedCoin;
        }

        if (status === 'cleared') {
            const deliveryResult = this.#settleDeliveries(heldItems, destination, facility, session, itemReport, acquiredItems);
            totalScore += deliveryResult.score;
            totalCoins += deliveryResult.coins;
            unlockedBranchId = deliveryResult.unlockedBranchId;
            entries.push(...deliveryResult.entries);
        } else {
            this.#appendGroupedItemReports(
                itemReport,
                'delivery',
                heldItems.filter(item => item.category === 'cargo'),
                'unmatched'
            );
        }

        this.#appendGroupedItemReports(
            itemReport,
            'other',
            heldItems.filter(item => item.category !== 'cargo')
        );

        if (collectedCoin > 0) {
            entries.push({ label: 'Collected Coins', coin: collectedCoin });
        }

        const lostToTarget = this.#createLostToTarget(status, collision, heldItems, flightData.rocketItem);
        const insurancePayout = this.#calculateInsurancePayout(status, flightData.rocketItem);
        if (insurancePayout > 0) {
            totalCoins += insurancePayout;
            entries.push({
                label: this.#createInsuranceLabel(flightData.rocketItem),
                coin: insurancePayout
            });
        }

        return {
            status,
            destination,
            unlockedBranchId,
            totalScore,
            totalCoins,
            luckyDiscountRate: this.#calculateLuckyDiscount(status, heldItems),
            flightTicks: flightData.ticks || 0,
            entries,
            itemReport,
            acquiredItems,
            lostToTarget
        };
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

    #resolveSettlementStatus(collision) {
        if (collision?.type === 'arc') {
            return 'cleared';
        }
        if (collision?.type === 'body' && collision.target?.isHome) {
            return 'returned';
        }
        if (collision?.type === 'body') {
            return 'crashed';
        }
        return 'lost';
    }

    #settleDeliveries(heldItems, destination, facility, session, itemReport, acquiredItems) {
        const balance = this.gameDataRepository.getGameBalance();
        const result = {
            score: 0,
            coins: 0,
            entries: [],
            unlockedBranchId: null
        };

        this.#groupItems(heldItems.filter(item => item.category === 'cargo'))
            .forEach(cargoGroup => {
                const cargo = cargoGroup[0];
                const isMatch = cargo.deliveryGoalId === destination;
                const entry = this.#createGroupedItemReportEntry('delivery', cargoGroup, isMatch ? 'match' : 'unmatched');
                itemReport.push(entry);

                if (!isMatch && cargo.deliveryGoalId) {
                    const coins = balance.UNMATCHED_DELIVERY_REWARD.COINS * cargoGroup.length;
                    const score = balance.UNMATCHED_DELIVERY_REWARD.SCORE * cargoGroup.length;
                    result.coins += coins;
                    result.score += score;
                    result.entries.push({
                        label: cargo.name,
                        coin: coins
                    });
                    return;
                }

                if (!isMatch) {
                    return;
                }

                const bonusItems = this.drawLottery(session, facility.bonusItemCount * cargoGroup.length, {
                    bonusThreshold: 5,
                    excludeCategories: ['cargo']
                });
                entry.bonusItems = this.#createStacks(bonusItems);

                const bonusCoins = this.#sumCoinValues(bonusItems.filter(item => item.category === 'coin'));
                bonusItems
                    .filter(item => INVENTORY_REWARD_CATEGORIES.includes(item.category))
                    .forEach(item => acquiredItems.push(item));

                const deliveryScore = balance.DELIVERY_REWARD.SCORE * cargoGroup.length;
                const deliveryCoins = balance.DELIVERY_REWARD.COINS * cargoGroup.length + bonusCoins;
                result.score += deliveryScore;
                result.coins += deliveryCoins;
                result.unlockedBranchId = facility.id;
                result.entries.push({
                    label: cargo.name,
                    score: deliveryScore,
                    coin: deliveryCoins
                });
            });

        return result;
    }

    #sumCoinValues(items) {
        return items.reduce((total, item) => total + (item.score || 0), 0);
    }

    #createItemReportEntry(type, item, status) {
        return this.#createGroupedItemReportEntry(type, [item], status);
    }

    #createGroupedItemReportEntry(type, items, status) {
        const entry = {
            type,
            item: this.#createStackFromItems(items)
        };
        if (status) {
            entry.status = status;
        }
        return entry;
    }

    #appendGroupedItemReports(itemReport, type, items, status) {
        this.#groupItems(items)
            .map(group => this.#createGroupedItemReportEntry(type, group, status))
            .forEach(entry => itemReport.push(entry));
    }

    #groupItems(items) {
        return items.reduce((groups, item) => {
            const group = groups.find(candidate => candidate[0].equals(item));
            if (group) {
                group.push(item);
            } else {
                groups.push([item]);
            }
            return groups;
        }, []);
    }

    #createStacks(items) {
        return items.reduce((stacks, item) => {
            const stack = stacks.find(candidate => candidate.push(item));
            if (!stack) {
                stacks.push(this.#createStack(item));
            }
            return stacks;
        }, []);
    }

    #createStack(item) {
        const stack = new StackedItem();
        stack.push(item);
        return stack;
    }

    #createStackFromItems(items) {
        const stack = new StackedItem();
        items.forEach(item => stack.push(item));
        return stack;
    }

    #createLostToTarget(status, collision, heldItems, rocketItem) {
        if (status === 'returned') {
            return {
                target: collision.target,
                items: heldItems.filter(item => item.category === 'cargo')
            };
        }

        if (status !== 'crashed') {
            return null;
        }

        return {
            target: collision.target,
            items: [
                ...heldItems,
                ...rocketItem.getCompositionParts().filter(() => Math.random() < 0.5)
            ]
        };
    }

    #calculateInsurancePayout(status, rocketItem) {
        if (status !== 'crashed' && status !== 'lost') {
            return 0;
        }

        return rocketItem.calculateAppraisalValue() * this.#countInsuranceModules(rocketItem);
    }

    #createInsuranceLabel(rocketItem) {
        const count = this.#countInsuranceModules(rocketItem);
        return count === 1 ? 'Insurance Payout' : `Insurance Payout [x${count}]`;
    }

    #countInsuranceModules(rocketItem) {
        return rocketItem.getCompositionParts()
            .filter(item => item.id === 'mod_insurance')
            .length;
    }

    #calculateLuckyDiscount(status, heldItems) {
        if (status !== 'cleared') {
            return 0;
        }

        const luckyDiscount = heldItems
            .filter(item => item.id === 'cargo_lucky')
            .reduce((total, item) => total + item.coinDiscount, 0);

        return Math.min(this.gameDataRepository.getGameBalance().MAX_COIN_DISCOUNT, luckyDiscount);
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
