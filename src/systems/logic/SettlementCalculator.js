import StackedItem from '../entities/StackedItem.js';

const INVENTORY_REWARD_CATEGORIES = ['chassis', 'logic', 'launcher', 'module', 'booster'];

class SettlementCalculator {
    constructor(gameDataRepository, lotteryService) {
        if (!gameDataRepository || !lotteryService) {
            throw new Error('[SettlementCalculator] gameDataRepository and lotteryService are required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.lotteryService = lotteryService;
    }

    calculate(collision, flightData, session) {
        const status = this.#resolveSettlementStatus(collision);
        const destination = status === 'cleared' ? collision.target.getFacilityType() : null;
        const facility = destination ? this.gameDataRepository.getFacilityDefinition(destination) : null;
        const heldItems = flightData.heldCargo || [];
        const entries = [];
        const itemReport = [];
        const acquiredItems = [];
        const recoveredItems = this.#createRecoveredItems(status, flightData.rocketItem);

        let totalScore = flightData.ticks || 0;
        let totalCoins = 0;
        let unlockedBranchId = null;

        entries.push({
            label: this.gameDataRepository.getUiText('flightResult.entries.flightDuration'),
            score: flightData.ticks || 0
        });

        if (facility) {
            totalScore += facility.rewardScore;
            totalCoins += facility.rewardCoins;
            entries.push({
                label: this.gameDataRepository.getUiText('flightResult.entries.goalBonus'),
                score: facility.rewardScore,
                coin: facility.rewardCoins
            });
        }

        const isRecoveryResult = status === 'cleared' || status === 'returned';
        const collectedCoin = isRecoveryResult
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
        }

        if (isRecoveryResult) {
            this.#appendGroupedItemReports(
                itemReport,
                'other',
                heldItems.filter(item => item.category !== 'cargo' || (status === 'cleared' && this.#isSpecialCargo(item)))
            );
            heldItems
                .filter(item => this.#isInventoryRewardItem(item))
                .forEach(item => acquiredItems.push(item));
        }

        if (collectedCoin > 0) {
            entries.push({
                label: this.gameDataRepository.getUiText('flightResult.entries.collectedCoins'),
                coin: collectedCoin
            });
        }

        const lostToTarget = this.#createLostToTarget(status, collision, heldItems, flightData.rocketItem);
        const insurancePayout = this.#calculateInsurancePayout(status, flightData.rocketItem);
        if (insurancePayout > 0) {
            totalCoins += insurancePayout;
            entries.push({
                label: this.gameDataRepository.getUiText('flightResult.entries.insurancePayout'),
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
            recoveredItems,
            lostToTarget
        };
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

        this.#groupItems(heldItems.filter(item => this.#isDeliveryCargo(item)))
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
                    this.#appendSettlementEntry(result.entries, {
                        label: this.gameDataRepository.getUiText('flightResult.entries.deliveryBonus'),
                        score,
                        coin: coins
                    });
                    return;
                }

                if (!isMatch) {
                    return;
                }

                const bonusItems = this.lotteryService.drawLottery(session, facility.bonusItemCount * cargoGroup.length, {
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
                this.#appendSettlementEntry(result.entries, {
                    label: this.gameDataRepository.getUiText('flightResult.entries.deliveryBonus'),
                    score: deliveryScore,
                    coin: deliveryCoins
                });
            });

        return result;
    }

    #appendSettlementEntry(entries, nextEntry) {
        const entry = entries.find(candidate => candidate.label === nextEntry.label);
        if (!entry) {
            entries.push({ ...nextEntry });
            return;
        }

        if (nextEntry.score !== undefined) {
            entry.score = (entry.score || 0) + nextEntry.score;
        }
        if (nextEntry.coin !== undefined) {
            entry.coin = (entry.coin || 0) + nextEntry.coin;
        }
    }

    #sumCoinValues(items) {
        return items.reduce((total, item) => total + (item.score || 0), 0);
    }

    #isInventoryRewardItem(item) {
        return INVENTORY_REWARD_CATEGORIES.includes(item.category);
    }

    #isDeliveryCargo(item) {
        return item.category === 'cargo' && Boolean(item.deliveryGoalId);
    }

    #isSpecialCargo(item) {
        return item.category === 'cargo' && !item.deliveryGoalId;
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

    #createRecoveredItems(status, rocketItem) {
        if ((status === 'cleared' || status === 'returned') && rocketItem) {
            return [rocketItem];
        }

        return [];
    }

    #calculateInsurancePayout(status, rocketItem) {
        if (status !== 'crashed' && status !== 'lost') {
            return 0;
        }

        return rocketItem.calculateAppraisalValue() * this.#countInsuranceModules(rocketItem);
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
}

export default SettlementCalculator;
