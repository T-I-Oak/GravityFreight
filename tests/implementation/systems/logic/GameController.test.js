import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameController from '../../../../src/systems/logic/GameController.js';

function createSettlement(overrides = {}) {
    return {
        status: 'cleared',
        destination: 'TRADING_POST',
        unlockedBranchId: 'T',
        totalScore: 3260,
        totalCoins: 30,
        luckyDiscountRate: 0.2,
        flightTicks: 260,
        entries: [
            { label: 'Flight Duration', score: 260 },
            { label: 'Goal Bonus', score: 3000, coin: 30 }
        ],
        itemReport: [],
        acquiredItems: [{ id: 'bonus_item' }],
        lostToTarget: null,
        ...overrides
    };
}

function createController(settlement = createSettlement()) {
    const gameDataRepository = {
        getFacilityDefinition: vi.fn(type => ({
            TRADING_POST: { name: 'TRADING POST', icon: 'T', className: 'trading-post' },
            REPAIR_DOCK: { name: 'REPAIR DOCK', icon: 'R', className: 'repair-dock' },
            BLACK_MARKET: { name: 'BLACK MARKET', icon: 'B', className: 'black-market' }
        })[type]),
        getUiText: vi.fn(key => ({
            'flightResult.titles.cleared': 'SECTOR {sector} COMPLETED',
            'flightResult.titles.returned': 'ROCKET RECOVERED',
            'flightResult.titles.crashed': 'SHIP CRASHED',
            'flightResult.titles.lost': 'LOST IN SPACE',
            'flightResult.titles.complete': 'FLIGHT COMPLETE',
            'flightResult.actions.toFacility': 'TO {facility}',
            'flightResult.actions.backToBase': 'BACK TO BASE',
            'flightResult.actions.continue': 'CONTINUE',
            'facility.common.credits': 'CREDITS:',
            'facility.common.depart': 'TO NEXT SECTOR',
            'facility.common.emptyText': 'NO ITEMS',
            'facility.common.emptySubtext': 'No items are currently available.',
            'facility.actions.buy': 'BUY',
            'facility.actions.sell': 'SELL',
            'facility.actions.repair': 'REPAIR',
            'facility.actions.dismantle': 'DISMANTLE',
            'facility.descriptions.tradingPost': 'Trading post description',
            'facility.descriptions.repairDock': 'Repair dock description',
            'facility.descriptions.blackMarket': 'Black market description',
            'facility.sections.tradingPostBuy.title': 'Items for Sale',
            'facility.sections.tradingPostBuy.subtitle': 'Advanced parts available at this station.',
            'facility.sections.tradingPostSell.title': 'Sell Parts',
            'facility.sections.tradingPostSell.subtitle': 'Sell unneeded parts to earn credits.',
            'facility.sections.repairDockRepair.title': 'Launcher Maintenance',
            'facility.sections.repairDockRepair.subtitle': 'Restore launcher charges.',
            'facility.sections.repairDockDismantle.title': 'Dismantle and Enhance',
            'facility.sections.repairDockDismantle.subtitle': 'Dismantle the rocket and recover its parts.',
            'facility.sections.repairDockReceived.title': 'Enhanced Parts',
            'facility.sections.repairDockReceived.subtitle': 'Parts recovered through dismantling and enhancement.',
            'facility.sections.blackMarketStock.title': 'Black Sector Stock',
            'facility.sections.blackMarketStock.subtitle': 'Acquire enhanced one-off parts once per dock stay.',
            'facility.sections.blackMarketAcquired.title': 'Acquired Items',
            'facility.sections.blackMarketAcquired.subtitle': 'Purchased items appear here.',
            'facility.blackMarket.normalName': 'Standard Deal',
            'facility.blackMarket.normalDescription': 'Acquire items worth at least 100c.',
            'facility.blackMarket.premiumName': 'Premium Deal',
            'facility.blackMarket.premiumDescription': 'Acquire items worth at least 500c.'
        })[key])
    };
    const currentRocket = {
        getFlightResult: vi.fn(() => ({
            ticks: 260,
            distance: 1400,
            heldCargo: [],
            rocketItem: { id: 'rocket_item' }
        }))
    };
    const currentSector = { luckyDiscountRate: 0 };
    const sellItem = {
        uid: 'sell_item',
        category: 'module',
        getViewData: vi.fn(() => ({
            uid: 'sell_item',
            id: 'mod_capacity',
            name: 'Capacity Module',
            category: 'module',
            stats: {}
        }))
    };
    const damagedLauncher = {
        uid: 'launcher_damaged',
        category: 'launcher',
        charges: 0,
        maxCharges: 2,
        getViewData: vi.fn(() => ({
            uid: 'launcher_damaged',
            id: 'pad_standard_d2',
            name: 'Standard Pad',
            category: 'launcher',
            stats: {}
        }))
    };
    const inventoryStack = {
        uid: 'stack_sell',
        representative: sellItem,
        items: [sellItem]
    };
    const launcherStack = {
        uid: 'stack_launcher',
        representative: damagedLauncher,
        items: [damagedLauncher]
    };
    const sessionState = {
        sectorNumber: 3,
        coins: 120,
        inventory: {
            stacks: [inventoryStack, launcherStack],
            getItemsByCategory: vi.fn(category => (category === 'launcher' ? [launcherStack] : []))
        },
        applyTransaction: vi.fn(transaction => {
            const spentCoins = transaction.spentCoins ?? 0;
            const earnedCoins = transaction.earnedCoins ?? 0;
            const acquiredItemCount = transaction.acquiredItems?.length ?? 0;
            const removedItemCount = transaction.removedItems?.length ?? 0;
            sessionState.coins = sessionState.coins - spentCoins + earnedCoins;
            return {
                spentCoins,
                earnedCoins,
                acquiredItemCount,
                removedItemCount
            };
        }),
        applySettlement: vi.fn(),
        getGameResultSummary: vi.fn(() => ({
            totalScore: 3260,
            totalCoins: 30,
            completedSectors: 1,
            reachedSector: 3,
            totalFlightTicks: 260,
            collectedItemCount: 1
        }))
    };
    const economySystem = {
        calculateSettlement: vi.fn(() => settlement),
        generateTradingPostStock: vi.fn(() => [
            {
                item: {
                    uid: 'stock_item',
                    getViewData: vi.fn(() => ({
                        uid: 'stock_item',
                        id: 'sensor_long',
                        name: 'Long Sensor',
                        category: 'logic',
                        stats: {}
                    }))
                },
                originalPrice: 80,
                itemDiscount: 0.3
            }
        ]),
        calculateFinalPrice: vi.fn((price, lucky, itemDiscount = 0) => Math.floor(price * (1 - Math.min(0.5, lucky + itemDiscount)))),
        calculateAppraisalValue: vi.fn(() => 40),
        calculateRepairCost: vi.fn(() => 8),
        calculateDismantleCost: vi.fn(() => 40),
        createRepairTransaction: vi.fn(launcher => ({
            spentCoins: 8,
            earnedCoins: 0,
            requiredItems: [launcher]
        })),
        createDismantleTransaction: vi.fn(rocketItem => ({
            spentCoins: 40,
            earnedCoins: 0,
            removedItems: [rocketItem],
            acquiredItems: [{ uid: 'enhanced_part' }]
        })),
        drawBlackMarketGacha: vi.fn(type => ({
            spentCoins: type === 'premium' ? 500 : 100,
            earnedCoins: 0,
            acquiredItems: [{ uid: `${type}_item` }]
        }))
    };
    const gameRecordTracker = {
        recordFlightResult: vi.fn(() => ['total_launches', 'total_score']),
        recordTransaction: vi.fn(() => ['total_spent_coins'])
    };
    const achievementTracker = {
        evaluateAchievements: vi.fn(() => [{ achievementId: 'stat_launches', tier: 3, value: 20 }])
    };
    const flightRecorder = {
        recordFlightResult: vi.fn(() => ({ id: 'flight_1', favorite: false })),
        getPendingRecord: vi.fn(() => null)
    };
    const storySystem = {
        unlockNextStep: vi.fn(),
        getStoryStatus: vi.fn(() => [{ id: 'T', type: 'T', isUnread: true }])
    };
    const uiController = {
        showResultScreen: vi.fn(),
        showFacilityScreen: vi.fn(),
        setFacilityActionHandler: vi.fn(),
        setFacilityDepartHandler: vi.fn(),
        updateFacilityCredits: vi.fn(),
        showBuildScreen: vi.fn()
    };
    const worldRenderer = {
        disableSonar: vi.fn(),
        playFinishAnimation: vi.fn(() => Promise.resolve())
    };

    const controller = new GameController({
        sessionState,
        economySystem,
        gameRecordTracker,
        achievementTracker,
        flightRecorder,
        storySystem,
        uiController,
        worldRenderer,
        gameDataRepository
    });
    controller.currentRocket = currentRocket;
    controller.currentSector = currentSector;

    return {
        controller,
        currentRocket,
        currentSector,
        sessionState,
        economySystem,
        gameRecordTracker,
        achievementTracker,
        flightRecorder,
        storySystem,
        uiController,
        worldRenderer,
        gameDataRepository
    };
}

describe('GameController', () => {
    let context;

    beforeEach(() => {
        context = createController();
    });

    it('settles navigation end and shows a flight result view model', async () => {
        const collision = { type: 'arc', target: { getFacilityType: () => 'TRADING_POST' } };

        const viewData = await context.controller.handleNavigationEnd(collision);

        expect(context.currentRocket.getFlightResult).toHaveBeenCalled();
        expect(context.economySystem.calculateSettlement).toHaveBeenCalledWith(
            collision,
            expect.objectContaining({ ticks: 260 }),
            context.sessionState
        );
        expect(context.sessionState.applySettlement).toHaveBeenCalledWith(expect.objectContaining({ status: 'cleared' }));
        expect(context.storySystem.unlockNextStep).toHaveBeenCalledWith('T');
        expect(context.flightRecorder.recordFlightResult).toHaveBeenCalledWith({
            resultType: 'cleared',
            score: 3260,
            totalScore: 3260,
            reachedSector: 3,
            destinationType: 'TRADING_POST'
        });
        expect(context.gameRecordTracker.recordFlightResult).toHaveBeenCalledWith({
            completedSectors: 1,
            distance: 1400,
            score: 3260,
            earnedCoins: 30,
            collectedItemCount: 1
        });
        expect(context.achievementTracker.evaluateAchievements).toHaveBeenCalledWith({
            source: 'game_record',
            keys: ['total_launches', 'total_score']
        });
        expect(context.worldRenderer.disableSonar).toHaveBeenCalled();
        expect(context.worldRenderer.playFinishAnimation).toHaveBeenCalledWith(collision);
        expect(context.uiController.showResultScreen).toHaveBeenCalledWith(viewData);
        expect(viewData).toMatchObject({
            title: 'SECTOR 3 COMPLETED',
            status: 'cleared',
            themeClass: 'trading-post',
            actionLabel: 'TO TRADING POST',
            totalScore: 3260,
            totalCoins: 30,
            replay: {
                recorded: true,
                favorite: false,
                pending: false
            },
            achievements: [{ achievementId: 'stat_launches', tier: 3, value: 20 }],
            storyStatus: [{ id: 'T', type: 'T', isUnread: true }],
            storyCards: [{ id: 'T', type: 'T', isUnread: true }]
        });
    });

    it('keeps rejected replay records as pending in the result view', async () => {
        const { controller, flightRecorder } = createController(createSettlement({
            status: 'lost',
            destination: null,
            unlockedBranchId: null,
            totalScore: 260,
            totalCoins: 0
        }));
        flightRecorder.recordFlightResult.mockReturnValue(null);
        flightRecorder.getPendingRecord.mockReturnValue({ id: 'pending_1', favorite: false });

        const viewData = await controller.handleNavigationEnd({ type: 'boundary' });

        expect(viewData).toMatchObject({
            title: 'LOST IN SPACE',
            status: 'lost',
            themeClass: 'home',
            actionLabel: 'BACK TO BASE',
            replay: {
                recorded: false,
                favorite: false,
                pending: true
            }
        });
    });

    it('requires current rocket and sector before navigation end', async () => {
        context.controller.currentRocket = null;

        await expect(context.controller.handleNavigationEnd({ type: 'arc' }))
            .rejects
            .toThrow('[GameController] currentRocket and currentSector are required.');
    });

    it('confirms cleared settlement and enters the destination facility with real display data', () => {
        const settlement = createSettlement({ luckyDiscountRate: 0.2 });

        context.controller.confirmSettlement(settlement);

        expect(context.currentSector.luckyDiscountRate).toBe(0.2);
        expect(context.economySystem.generateTradingPostStock).toHaveBeenCalledWith(context.sessionState);
        expect(context.uiController.showFacilityScreen).toHaveBeenCalledWith(
            'TRADING_POST',
            expect.objectContaining({
                name: 'TRADING POST',
                icon: 'T',
                themeClass: 'trading-post',
                description: 'Trading post description',
                coins: 120,
                luckyDiscountRate: 0.2
            })
        );
        const viewData = context.uiController.showFacilityScreen.mock.calls[0][1];
        expect(viewData.sections[0].id).toBe('buy');
        expect(viewData.sections[0].title).toBe('Items for Sale');
        expect(viewData.sections[0].entries[0]).toMatchObject({
            action: 'buy',
            actionLabel: 'BUY',
            uid: 'stock_item',
            price: 40,
            discountPercent: 50,
            disabled: false
        });
        expect(viewData.sections[1].id).toBe('sell');
        expect(viewData.sections[1].entries[0]).toMatchObject({
            action: 'sell',
            actionLabel: 'SELL',
            uid: 'stack_sell',
            price: 40,
            disabled: false
        });
        expect(context.uiController.setFacilityActionHandler).toHaveBeenCalled();
        expect(context.uiController.setFacilityDepartHandler).toHaveBeenCalled();
    });

    it('applies Trading Post buy transactions and refreshes the facility view', () => {
        context.currentSector.luckyDiscountRate = 0.2;
        context.controller.enterFacility('TRADING_POST');

        const delta = context.controller.handleFacilityAction('buy', { uid: 'stock_item' });

        expect(context.sessionState.applyTransaction).toHaveBeenCalledWith({
            spentCoins: 40,
            earnedCoins: 0,
            acquiredItems: [expect.objectContaining({ uid: 'stock_item' })]
        });
        expect(delta).toMatchObject({
            spentCoins: 40,
            earnedCoins: 0,
            acquiredItemCount: 1,
            removedItemCount: 0
        });
        expect(context.gameRecordTracker.recordTransaction).toHaveBeenCalledWith(delta, {
            currentCoins: 80
        });
        expect(context.achievementTracker.evaluateAchievements).toHaveBeenLastCalledWith({
            source: 'game_record',
            keys: ['total_spent_coins']
        });
        expect(context.uiController.updateFacilityCredits).toHaveBeenCalledWith(80);

        const refreshedView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        expect(refreshedView.sections[0].entries).toEqual([]);
    });

    it('applies Trading Post sell transactions from an inventory stack', () => {
        context.controller.enterFacility('TRADING_POST');

        const delta = context.controller.handleFacilityAction('sell', { uid: 'stack_sell' });

        expect(context.sessionState.applyTransaction).toHaveBeenCalledWith({
            spentCoins: 0,
            earnedCoins: 40,
            removedItems: [expect.objectContaining({ uid: 'sell_item' })]
        });
        expect(context.gameRecordTracker.recordTransaction).toHaveBeenCalledWith(delta, {
            currentCoins: 160
        });
        expect(context.uiController.updateFacilityCredits).toHaveBeenCalledWith(160);
    });

    it('delegates Repair Dock repair and dismantle transactions', () => {
        const rocketItem = {
            uid: 'rocket_item',
            getViewData: vi.fn(() => ({
                uid: 'rocket_item',
                id: 'rocket_item',
                name: 'Current Rocket',
                category: 'rocket',
                stats: {}
            }))
        };
        context.controller.currentRocket = { rocketItem };
        context.currentSector.luckyDiscountRate = 0.2;
        context.controller.enterFacility('REPAIR_DOCK');

        context.controller.handleFacilityAction('repair', { uid: 'launcher_damaged' });
        context.controller.handleFacilityAction('dismantle', { uid: 'rocket_item' });

        expect(context.economySystem.createRepairTransaction).toHaveBeenCalledWith(
            expect.objectContaining({ uid: 'launcher_damaged' }),
            0.2
        );
        expect(context.economySystem.createDismantleTransaction).toHaveBeenCalledWith(rocketItem, 0, 0.2);
        const refreshedView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        expect(refreshedView.sections[1].entries).toEqual([]);
    });

    it('delegates Black Market premium transactions', () => {
        context.currentSector.luckyDiscountRate = 0.2;
        context.controller.enterFacility('BLACK_MARKET');

        context.controller.handleFacilityAction('buy_premium', { uid: 'black_market_premium' });

        expect(context.economySystem.drawBlackMarketGacha).toHaveBeenCalledWith(
            'premium',
            context.sessionState,
            0.2
        );
        expect(context.sessionState.applyTransaction).toHaveBeenCalledWith({
            spentCoins: 500,
            earnedCoins: 0,
            acquiredItems: [expect.objectContaining({ uid: 'premium_item' })]
        });
    });
});
