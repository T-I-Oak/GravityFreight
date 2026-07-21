import { FACILITY_THEME_CLASSES } from './facilityViewConstants.js';

const CATEGORY_LABELS = {
    rocket: 'ROCKET',
    launcher: 'LAUNCHER',
    booster: 'BOOSTER',
    chassis: 'CHASSIS',
    logic: 'LOGIC',
    module: 'MODULES'
};

class FacilityFlowController {
    constructor({
        gameDataRepository,
        sessionState,
        economySystem,
        gameRecordTracker,
        achievementTracker,
        uiController,
        buildFlowController,
        getCurrentSector,
        getCurrentRocket,
        setCurrentRocket
    }) {
        this.gameDataRepository = gameDataRepository;
        this.sessionState = sessionState;
        this.economySystem = economySystem;
        this.gameRecordTracker = gameRecordTracker;
        this.achievementTracker = achievementTracker;
        this.uiController = uiController;
        this.buildFlowController = buildFlowController;
        this.getCurrentSector = getCurrentSector;
        this.getCurrentRocket = getCurrentRocket;
        this.setCurrentRocket = setCurrentRocket;
        this.reset();
    }

    get currentType() {
        return this.currentFacilityType;
    }

    reset() {
        this.repairDockDismantleCount = 0;
        this.currentFacilityType = null;
        this.currentFacilityViewData = null;
        this.currentTradingPostStock = null;
        this.currentFacilityAcquiredItems = [];
        this.blackMarketPurchaseMade = false;
    }

    enter(type) {
        this.currentFacilityType = type;
        this.currentTradingPostStock = type === 'TRADING_POST'
            ? this.economySystem.generateTradingPostStock(this.sessionState)
            : null;
        this.currentFacilityAcquiredItems = [];
        this.blackMarketPurchaseMade = false;
        const viewData = this.#createViewData(type);
        this.#showView(type, viewData);
        return viewData;
    }

    handleAction(action, context = {}) {
        const transaction = this.#createTransaction(action, context);
        const previousCoins = this.sessionState.coins;
        const delta = this.sessionState.applyTransaction(transaction);

        this.#afterTransaction(action, context, delta, previousCoins);
        return delta;
    }

    refreshView(options = {}) {
        if (!this.currentFacilityType) {
            return null;
        }

        return this.#refreshView(options);
    }

    #createViewData(type) {
        const facility = this.gameDataRepository.getFacilityDefinition(type);
        const luckyDiscount = this.getCurrentSector()?.luckyDiscountRate ?? 0;

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
            sections: this.#createSections(type, luckyDiscount)
        };
    }

    #createSections(type, luckyDiscount) {
        if (type === 'TRADING_POST') {
            return this.#createTradingPostSections(luckyDiscount);
        }
        if (type === 'REPAIR_DOCK') {
            return this.#createRepairDockSections(luckyDiscount);
        }
        if (type === 'BLACK_MARKET') {
            return this.#createBlackMarketSections(luckyDiscount);
        }

        throw new Error(`[FacilityFlowController] Unknown facility type: ${type}`);
    }

    #createTradingPostSections(luckyDiscount) {
        const stockEntries = this.currentTradingPostStock
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
                itemViewData: this.#createStackViewData(stack),
                price: this.economySystem.calculateAppraisalValue(stack.representative),
                uid: stack.uid,
                disabled: false,
                disableWhenUnaffordable: false,
                buttonClass: 'color-theme-sub',
                cardOptions: stack.count > 1 ? { selectedCount: 1 } : {}
            }));

        return [
            this.#createFacilitySection('buy', 'tradingPostBuy', stockEntries),
            this.#createGroupedFacilitySection(
                'sell',
                'tradingPostSell',
                this.#groupEntriesByItemCategory(sellEntries)
            )
        ];
    }

    #createRepairDockSections(luckyDiscount) {
        const repairEntries = this.sessionState.inventory.getItemsByCategory('launcher')
            .flatMap(stack => stack.items)
            .map(item => this.#createTradeEntry({
                action: 'repair',
                actionLabel: this.gameDataRepository.getUiText('facility.actions.repair'),
                item,
                price: this.economySystem.calculateRepairCost(item, luckyDiscount),
                discountRate: luckyDiscount,
                disabled: item.charges >= item.maxCharges
            }));
        const rocketItem = this.getCurrentRocket()?.rocketItem;
        const dismantleEntries = rocketItem ? [
            this.#createTradeEntry({
                action: 'dismantle',
                actionLabel: this.gameDataRepository.getUiText('facility.actions.dismantle'),
                item: rocketItem,
                price: this.economySystem.calculateDismantleCost(this.repairDockDismantleCount, luckyDiscount),
                discountRate: luckyDiscount
            })
        ] : [];

        const repairSection = this.#createFacilitySection('repair', 'repairDockRepair', repairEntries);
        const dismantleSection = this.#createFacilitySection('dismantle', 'repairDockDismantle', dismantleEntries);
        const receivedSection = this.#createFacilitySection('received', 'repairDockReceived', this.#createAcquiredEntries());

        return [
            {
                id: 'maintenance',
                sections: [repairSection, dismantleSection]
            },
            receivedSection
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
                this.economySystem.calculateFinalPrice(100, luckyDiscount),
                luckyDiscount
            ),
            this.#createMenuEntry(
                'black_market_premium',
                this.gameDataRepository.getUiText('facility.blackMarket.premiumName'),
                this.gameDataRepository.getUiText('facility.blackMarket.premiumDescription'),
                'black-market',
                'buy_premium',
                this.gameDataRepository.getUiText('facility.actions.buy'),
                this.economySystem.calculateFinalPrice(500, luckyDiscount),
                luckyDiscount
            )
        ];

        return [
            this.#createFacilitySection('black-market', 'blackMarketStock', entries),
            this.#createFacilitySection('acquired', 'blackMarketAcquired', this.#createAcquiredEntries())
        ];
    }

    #createTradeEntry({ action, actionLabel, item, itemViewData = item.getViewData(), price, uid = item.uid, discountRate = 0, disabled = false, disableWhenUnaffordable = true, buttonClass = '', cardOptions = {} }) {
        const disabledByCoins = disableWhenUnaffordable && this.sessionState.coins < price;
        return {
            action,
            actionLabel,
            uid,
            item,
            itemViewData,
            price,
            discountPercent: Math.round(Math.min(0.5, discountRate) * 100),
            disabled: disabled || disabledByCoins,
            buttonClass,
            cardOptions
        };
    }

    #createStackViewData(stack) {
        if (stack.getViewData) {
            return stack.getViewData();
        }

        return {
            ...stack.representative.getViewData(),
            uid: stack.uid,
            count: stack.count
        };
    }


    #createMenuEntry(id, name, description, category, action, actionLabel, price, discountRate = 0) {
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
            discountPercent: Math.round(Math.min(0.5, discountRate) * 100),
            disabled: this.sessionState.coins < price || this.blackMarketPurchaseMade
        };
    }

    #createAcquiredEntries() {
        return this.currentFacilityAcquiredItems.map(item => ({
            action: 'received',
            actionLabel: '',
            uid: item.uid,
            item,
            itemViewData: item.getViewData?.() ?? item,
            price: 0,
            discountPercent: 0,
            disabled: true,
            hideAction: true
        }));
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

    #createGroupedFacilitySection(id, resourceKey, sections) {
        return {
            id,
            title: this.gameDataRepository.getUiText(`facility.sections.${resourceKey}.title`),
            subtitle: this.gameDataRepository.getUiText(`facility.sections.${resourceKey}.subtitle`),
            sections: sections.length > 0
                ? sections
                : [this.#createFacilitySection(`${id}-empty`, resourceKey, [])]
        };
    }

    #groupEntriesByItemCategory(entries) {
        return Object.keys(CATEGORY_LABELS)
            .map(category => ({
                category,
                entries: entries.filter(entry => entry.itemViewData?.category === category)
            }))
            .filter(group => group.entries.length > 0)
            .map(group => ({
                ...this.#createFacilitySection(
                    `sell-${group.category}`,
                    `tradingPostSellCategories.${group.category}`,
                    group.entries
                ),
                title: CATEGORY_LABELS[group.category],
                subtitle: '',
                headerVariant: 'category',
                themeClass: group.category
            }));
    }

    #getFacilityText(type, group) {
        const key = {
            TRADING_POST: 'tradingPost',
            REPAIR_DOCK: 'repairDock',
            BLACK_MARKET: 'blackMarket'
        }[type];

        return this.gameDataRepository.getUiText(`facility.${group}.${key}`);
    }

    #showView(type, viewData, options = {}) {
        this.currentFacilityViewData = viewData;
        const displayViewData = options.displayCoins === undefined
            ? viewData
            : { ...viewData, coins: options.displayCoins };
        const buildViewData = this.buildFlowController.createViewData();
        this.uiController.showFacilityScreen(type, displayViewData, buildViewData, {
            collapseBuildPanel: options.collapseBuildPanel
        });
    }

    #refreshView(options = {}) {
        const viewData = this.#createViewData(this.currentFacilityType);
        this.#showView(this.currentFacilityType, viewData, {
            ...options,
            collapseBuildPanel: false
        });
        return viewData;
    }

    #createTransaction(action, context = {}) {
        if (this.currentFacilityType === 'TRADING_POST' && action === 'buy') {
            const entry = this.#findFacilityEntry(action, context.uid);
            return {
                spentCoins: entry.price,
                earnedCoins: 0,
                acquiredItems: [entry.item]
            };
        }

        if (this.currentFacilityType === 'TRADING_POST' && action === 'sell') {
            const stack = this.sessionState.inventory.stacks.find(candidate => candidate.uid === context.uid);
            if (!stack) {
                throw new Error(`[FacilityFlowController] Sell target not found: ${context.uid}`);
            }
            const item = stack.items[stack.items.length - 1];
            return {
                spentCoins: 0,
                earnedCoins: this.economySystem.calculateAppraisalValue(stack.representative),
                removedItems: [item]
            };
        }

        if (this.currentFacilityType === 'REPAIR_DOCK' && action === 'repair') {
            return this.economySystem.createRepairTransaction(
                this.#findInventoryItemByUid(context.uid),
                this.getCurrentSector()?.luckyDiscountRate ?? 0
            );
        }

        if (this.currentFacilityType === 'REPAIR_DOCK' && action === 'dismantle') {
            const entry = this.#findFacilityEntry(action, context.uid);
            return this.economySystem.createDismantleTransaction(
                entry.item,
                this.repairDockDismantleCount,
                this.getCurrentSector()?.luckyDiscountRate ?? 0
            );
        }

        if (this.currentFacilityType === 'BLACK_MARKET' && action === 'buy_normal') {
            if (this.blackMarketPurchaseMade) {
                throw new Error('[FacilityFlowController] Black Market purchase is limited to once per facility stay.');
            }
            return this.economySystem.drawBlackMarketGacha('normal', this.sessionState, this.getCurrentSector()?.luckyDiscountRate ?? 0);
        }

        if (this.currentFacilityType === 'BLACK_MARKET' && action === 'buy_premium') {
            if (this.blackMarketPurchaseMade) {
                throw new Error('[FacilityFlowController] Black Market purchase is limited to once per facility stay.');
            }
            return this.economySystem.drawBlackMarketGacha('premium', this.sessionState, this.getCurrentSector()?.luckyDiscountRate ?? 0);
        }

        throw new Error(`[FacilityFlowController] Unknown facility action: ${action}`);
    }

    #afterTransaction(action, context, delta, previousCoins) {
        if (this.currentFacilityType === 'TRADING_POST' && action === 'buy') {
            this.currentTradingPostStock = this.currentTradingPostStock
                .filter(stock => stock.item.uid !== context.uid);
        }

        if (this.currentFacilityType === 'REPAIR_DOCK' && action === 'dismantle') {
            this.setCurrentRocket(null);
            this.repairDockDismantleCount += 1;
        }
        if (this.currentFacilityType === 'BLACK_MARKET' && action.startsWith('buy_')) {
            this.blackMarketPurchaseMade = true;
        }
        if (delta.acquiredItems?.length > 0) {
            this.currentFacilityAcquiredItems.push(...delta.acquiredItems);
        }

        const updatedKeys = this.gameRecordTracker.recordTransaction(delta, {
            currentCoins: this.sessionState.coins
        });
        if (updatedKeys.length > 0) {
            const achievements = this.achievementTracker.evaluateAchievements({
                source: 'game_record',
                keys: updatedKeys
            });
            this.uiController.showAchievementToasts?.(achievements);
        }

        this.uiController.updateHUDValue?.('coin', this.sessionState.coins);
        this.#refreshView({ displayCoins: previousCoins });
        this.uiController.updateFacilityCredits?.(this.sessionState.coins);
    }

    #findFacilityEntry(action, uid) {
        const entry = this.#flattenSections(this.currentFacilityViewData?.sections ?? [])
            .flatMap(section => section.entries)
            .find(candidate => candidate.action === action && candidate.uid === uid);
        if (!entry) {
            throw new Error(`[FacilityFlowController] Facility entry not found: ${action} (${uid})`);
        }
        return entry;
    }

    #flattenSections(sections) {
        return sections.flatMap(section => section.sections
            ? this.#flattenSections(section.sections)
            : [section]);
    }

    #findInventoryItemByUid(uid) {
        const item = this.sessionState.inventory.stacks
            .flatMap(stack => stack.items)
            .find(candidate => candidate.uid === uid);
        if (!item) {
            throw new Error(`[FacilityFlowController] Inventory item not found: ${uid}`);
        }
        return item;
    }
}

export default FacilityFlowController;
