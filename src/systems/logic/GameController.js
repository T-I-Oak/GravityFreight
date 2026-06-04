const FACILITY_THEME_CLASSES = {
    TRADING_POST: 'trading-post',
    REPAIR_DOCK: 'repair-dock',
    BLACK_MARKET: 'black-market'
};

const FACILITY_LABELS = {
    TRADING_POST: 'TRADING POST',
    REPAIR_DOCK: 'REPAIR DOCK',
    BLACK_MARKET: 'BLACK MARKET'
};

class GameController {
    constructor(infrastructure = {}) {
        this.gameDataRepository = infrastructure.gameDataRepository;
        this.sessionState = infrastructure.sessionState;
        this.economySystem = infrastructure.economySystem;
        this.gameRecordTracker = infrastructure.gameRecordTracker;
        this.achievementTracker = infrastructure.achievementTracker;
        this.flightRecorder = infrastructure.flightRecorder;
        this.storySystem = infrastructure.storySystem;
        this.uiController = infrastructure.uiController;
        this.worldRenderer = infrastructure.worldRenderer;
        this.currentSector = null;
        this.currentRocket = null;
        this.repairDockDismantleCount = 0;
    }

    async handleNavigationEnd(result) {
        if (!this.currentRocket || !this.currentSector) {
            throw new Error('[GameController] currentRocket and currentSector are required.');
        }

        const flightData = this.currentRocket.getFlightResult();
        const settlement = this.economySystem.calculateSettlement(result, flightData, this.sessionState);
        this.sessionState.applySettlement(settlement);

        if (settlement.unlockedBranchId) {
            this.storySystem.unlockNextStep(settlement.unlockedBranchId);
        }

        const resultContext = this.#createFlightResultContext(settlement);
        const replayRecord = this.flightRecorder.recordFlightResult(resultContext);
        const updatedRecordKeys = this.gameRecordTracker.recordFlightResult({
            completedSectors: settlement.status === 'cleared' ? 1 : 0,
            distance: result.distance ?? flightData.distance ?? 0,
            score: settlement.totalScore,
            earnedCoins: settlement.totalCoins,
            collectedItemCount: settlement.acquiredItems?.length ?? 0
        });
        const achievements = updatedRecordKeys.length > 0
            ? this.achievementTracker.evaluateAchievements({ source: 'game_record', keys: updatedRecordKeys })
            : [];

        this.worldRenderer?.disableSonar?.();
        await this.worldRenderer?.playFinishAnimation?.(result);

        const viewData = this.#createFlightResultViewData(settlement, replayRecord, achievements);
        this.uiController.showResultScreen(viewData);
        return viewData;
    }

    confirmSettlement(settlement) {
        if (this.currentSector) {
            this.currentSector.luckyDiscountRate = settlement.luckyDiscountRate ?? 0;
        }

        if (settlement.status === 'cleared') {
            this.enterFacility(settlement.destination);
            return;
        }

        if (!this.checkGameOverAndStartEndSequence?.()) {
            this.uiController.showBuildScreen?.();
        }
    }

    enterFacility(type) {
        const viewData = this.#createFacilityViewData(type);
        this.uiController.showFacilityScreen(type, viewData);
        this.uiController.setFacilityActionHandler?.((action, context) => this.handleFacilityAction(action, context));
        this.uiController.setFacilityDepartHandler?.(() => this.leaveFacility());
        return viewData;
    }

    handleFacilityAction(action, context) {
        throw new Error(`[GameController] Facility action is not connected yet: ${action} (${context.uid})`);
    }

    leaveFacility() {
        throw new Error('[GameController] Facility departure is not connected yet.');
    }

    #createFlightResultContext(settlement) {
        return {
            resultType: settlement.status,
            score: settlement.totalScore,
            totalScore: settlement.totalScore,
            reachedSector: this.sessionState.sectorNumber,
            destinationType: settlement.destination ?? null
        };
    }

    #createFlightResultViewData(settlement, replayRecord, achievements) {
        const pendingRecord = this.flightRecorder.getPendingRecord();
        const storyStatus = this.storySystem.getStoryStatus();

        return {
            title: this.#getTitle(settlement),
            status: settlement.status,
            themeClass: this.#getThemeClass(settlement),
            totalScore: settlement.totalScore,
            totalCoins: settlement.totalCoins,
            actionLabel: this.#getActionLabel(settlement),
            entries: settlement.entries || [],
            itemReport: settlement.itemReport || [],
            replay: {
                recorded: !!replayRecord,
                favorite: !!replayRecord?.favorite,
                pending: !replayRecord && !!pendingRecord
            },
            achievements,
            storyStatus,
            storyCards: storyStatus
        };
    }

    #getThemeClass(settlement) {
        if (settlement.destination) {
            return FACILITY_THEME_CLASSES[settlement.destination] || 'home';
        }

        return 'home';
    }

    #getActionLabel(settlement) {
        if (settlement.status === 'cleared' && settlement.destination) {
            return this.#formatText(
                this.gameDataRepository.getUiText('flightResult.actions.toFacility'),
                { facility: FACILITY_LABELS[settlement.destination] || settlement.destination }
            );
        }

        if (settlement.status === 'returned' || settlement.status === 'crashed' || settlement.status === 'lost') {
            return this.gameDataRepository.getUiText('flightResult.actions.backToBase');
        }

        return this.gameDataRepository.getUiText('flightResult.actions.continue');
    }

    #getTitle(settlement) {
        const titleKey = settlement.status
            ? `flightResult.titles.${settlement.status}`
            : 'flightResult.titles.complete';
        const title = this.gameDataRepository.getUiText(titleKey);

        return this.#formatText(title, { sector: this.sessionState.sectorNumber });
    }

    #formatText(template, values) {
        return Object.entries(values).reduce(
            (text, [key, value]) => text.replaceAll(`{${key}}`, value),
            template
        );
    }

    #createFacilityViewData(type) {
        const facility = this.gameDataRepository.getFacilityDefinition(type);
        const luckyDiscount = this.currentSector?.luckyDiscountRate ?? 0;

        return {
            type,
            name: facility.name,
            icon: facility.icon,
            themeClass: facility.className || FACILITY_THEME_CLASSES[type] || 'home',
            description: this.#getFacilityText(type, 'descriptions'),
            coins: this.sessionState.coins,
            luckyDiscountRate: luckyDiscount,
            creditsLabel: this.gameDataRepository.getUiText('facility.common.credits'),
            departLabel: this.gameDataRepository.getUiText('facility.common.depart'),
            sections: this.#createFacilitySections(type, luckyDiscount)
        };
    }

    #createFacilitySections(type, luckyDiscount) {
        if (type === 'TRADING_POST') {
            return this.#createTradingPostSections(luckyDiscount);
        }
        if (type === 'REPAIR_DOCK') {
            return this.#createRepairDockSections(luckyDiscount);
        }
        if (type === 'BLACK_MARKET') {
            return this.#createBlackMarketSections(luckyDiscount);
        }

        throw new Error(`[GameController] Unknown facility type: ${type}`);
    }

    #createTradingPostSections(luckyDiscount) {
        const stockEntries = this.economySystem.generateTradingPostStock(this.sessionState)
            .map(stock => this.#createTradeEntry({
                action: 'buy',
                actionLabel: this.gameDataRepository.getUiText('facility.actions.buy'),
                item: stock.item,
                price: this.economySystem.calculateFinalPrice(stock.originalPrice, luckyDiscount, stock.itemDiscount),
                discountRate: luckyDiscount + stock.itemDiscount
            }));
        const sellEntries = this.sessionState.inventory.stacks
            .filter(stack => !['cargo', 'coin'].includes(stack.representative.category))
            .map(stack => this.#createTradeEntry({
                action: 'sell',
                actionLabel: this.gameDataRepository.getUiText('facility.actions.sell'),
                item: stack.representative,
                price: this.economySystem.calculateAppraisalValue(stack.representative),
                uid: stack.uid
            }));

        return [
            this.#createFacilitySection('buy', 'tradingPostBuy', stockEntries),
            this.#createFacilitySection('sell', 'tradingPostSell', sellEntries)
        ];
    }

    #createRepairDockSections(luckyDiscount) {
        const repairEntries = this.sessionState.inventory.getItemsByCategory('launcher')
            .flatMap(stack => stack.items)
            .filter(item => item.charges < item.maxCharges)
            .map(item => this.#createTradeEntry({
                action: 'repair',
                actionLabel: this.gameDataRepository.getUiText('facility.actions.repair'),
                item,
                price: this.economySystem.calculateRepairCost(item, luckyDiscount)
            }));
        const rocketItem = this.currentRocket?.rocketItem;
        const dismantleEntries = rocketItem ? [
            this.#createTradeEntry({
                action: 'dismantle',
                actionLabel: this.gameDataRepository.getUiText('facility.actions.dismantle'),
                item: rocketItem,
                price: this.economySystem.calculateDismantleCost(this.repairDockDismantleCount, luckyDiscount)
            })
        ] : [];

        return [
            this.#createFacilitySection('repair', 'repairDockRepair', repairEntries),
            this.#createFacilitySection('dismantle', 'repairDockDismantle', dismantleEntries),
            this.#createFacilitySection('received', 'repairDockReceived', [])
        ];
    }

    #createBlackMarketSections(luckyDiscount) {
        const entries = [
            this.#createMenuEntry(
                'black_market_normal',
                this.gameDataRepository.getUiText('facility.blackMarket.normalName'),
                this.gameDataRepository.getUiText('facility.blackMarket.normalDescription'),
                'black-market',
                'buy_normal',
                this.gameDataRepository.getUiText('facility.actions.buy'),
                this.economySystem.calculateFinalPrice(100, luckyDiscount)
            ),
            this.#createMenuEntry(
                'black_market_premium',
                this.gameDataRepository.getUiText('facility.blackMarket.premiumName'),
                this.gameDataRepository.getUiText('facility.blackMarket.premiumDescription'),
                'black-market',
                'buy_premium',
                this.gameDataRepository.getUiText('facility.actions.buy'),
                this.economySystem.calculateFinalPrice(500, luckyDiscount)
            )
        ];

        return [
            this.#createFacilitySection('black-market', 'blackMarketStock', entries),
            this.#createFacilitySection('acquired', 'blackMarketAcquired', [])
        ];
    }

    #createTradeEntry({ action, actionLabel, item, price, uid = item.uid, discountRate = 0 }) {
        return {
            action,
            actionLabel,
            uid,
            item,
            itemViewData: item.getViewData(),
            price,
            discountPercent: Math.round(Math.min(0.5, discountRate) * 100),
            disabled: this.sessionState.coins < price
        };
    }

    #createMenuEntry(id, name, description, category, action, actionLabel, price) {
        return {
            action,
            actionLabel,
            uid: id,
            itemViewData: {
                uid: id,
                id,
                name,
                category,
                description,
                stats: {}
            },
            price,
            discountPercent: 0,
            disabled: this.sessionState.coins < price
        };
    }

    #createFacilitySection(id, resourceKey, entries) {
        return {
            id,
            title: this.gameDataRepository.getUiText(`facility.sections.${resourceKey}.title`),
            subtitle: this.gameDataRepository.getUiText(`facility.sections.${resourceKey}.subtitle`),
            entries,
            emptyText: this.gameDataRepository.getUiText('facility.common.emptyText'),
            emptySubtext: this.gameDataRepository.getUiText('facility.common.emptySubtext'),
            themeClass: 'home'
        };
    }

    #getFacilityText(type, group) {
        const key = {
            TRADING_POST: 'tradingPost',
            REPAIR_DOCK: 'repairDock',
            BLACK_MARKET: 'blackMarket'
        }[type];

        return this.gameDataRepository.getUiText(`facility.${group}.${key}`);
    }
}

export default GameController;
