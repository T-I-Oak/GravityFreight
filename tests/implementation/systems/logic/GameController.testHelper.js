import { vi } from 'vitest';
import GameController from '../../../../src/systems/logic/GameController.js';

export function createSettlement(overrides = {}) {
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

export function createController(settlement = createSettlement()) {
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
            'facility.blackMarket.premiumDescription': 'Acquire items worth at least 500c.',
            'build.empty.rocket.text': 'NO ROCKET EQUIPPED',
            'build.empty.rocket.subtext': 'ASSEMBLE A ROCKET',
            'build.empty.launcher.text': 'NO LAUNCHER',
            'build.empty.launcher.subtext': 'ACQUIRE A LAUNCHER',
            'build.empty.booster.text': 'NO BOOSTER EQUIPPED',
            'build.empty.booster.subtext': 'BOOSTER IS OPTIONAL',
            'build.empty.chassis.text': 'NO CHASSIS',
            'build.empty.chassis.subtext': 'ACQUIRE CHASSIS',
            'build.empty.logic.text': 'NO LOGIC',
            'build.empty.logic.subtext': 'ACQUIRE LOGIC',
            'build.empty.module.text': 'NO MODULE',
            'build.empty.module.subtext': 'MODULE IS OPTIONAL',
            'build.launch.label': 'LAUNCH ENGINE',
            'build.launch.waitingSubtext': 'Select a rocket and launcher to begin launch prep.',
            'build.launch.readySubtext': 'Confirm the launch angle to fire.'
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
    const chassisItem = {
        uid: 'chassis_item',
        category: 'chassis',
        getViewData: vi.fn(() => ({
            uid: 'chassis_item',
            id: 'hull_light',
            name: 'Light Hull',
            category: 'chassis',
            stats: {}
        }))
    };
    const logicItem = {
        uid: 'logic_item',
        category: 'logic',
        getViewData: vi.fn(() => ({
            uid: 'logic_item',
            id: 'sensor_short',
            name: 'Short Sensor',
            category: 'logic',
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
    const chassisStack = {
        uid: 'stack_chassis',
        representative: chassisItem,
        items: [chassisItem],
        getViewData: vi.fn(() => ({
            ...chassisItem.getViewData(),
            uid: 'stack_chassis',
            count: 1
        }))
    };
    const logicStack = {
        uid: 'stack_logic',
        representative: logicItem,
        items: [logicItem],
        getViewData: vi.fn(() => ({
            ...logicItem.getViewData(),
            uid: 'stack_logic',
            count: 1
        }))
    };
    inventoryStack.getViewData = vi.fn(() => ({
        ...sellItem.getViewData(),
        uid: 'stack_sell',
        count: 1
    }));
    launcherStack.getViewData = vi.fn(() => ({
        ...damagedLauncher.getViewData(),
        uid: 'stack_launcher',
        count: 1
    }));
    const sessionState = {
        sectorNumber: 3,
        coins: 120,
        initialize: vi.fn(() => {
            sessionState.sectorNumber = 0;
            sessionState.coins = 120;
        }),
        inventory: {
            stacks: [inventoryStack, launcherStack, chassisStack, logicStack],
            getItemsByCategory: vi.fn(category => ({
                module: [inventoryStack],
                launcher: [launcherStack],
                chassis: [chassisStack],
                logic: [logicStack]
            }[category] ?? []))
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
        incrementSector: vi.fn(() => {
            sessionState.sectorNumber += 1;
        }),
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
        })),
        checkGameOver: vi.fn(() => null)
    };
    const gameRecordTracker = {
        recordFlightResult: vi.fn(() => ['total_launches', 'total_score']),
        recordTransaction: vi.fn(() => ['total_spent_coins']),
        recordSectorStart: vi.fn(() => ['max_reached_sector']),
        recordGameResult: vi.fn(() => ['lifetime_contracts'])
    };
    const rankTracker = {
        recordGameResult: vi.fn(() => ({
            scoreRank: 1,
            sectorRank: 1,
            collectedRank: 1
        }))
    };
    const achievementTracker = {
        evaluateAchievements: vi.fn(() => [{ achievementId: 'stat_launches', tier: 3, value: 20 }])
    };
    const flightRecorder = {
        recordFlightResult: vi.fn(() => ({ id: 'flight_1', favorite: false })),
        getPendingRecord: vi.fn(() => null)
    };
    const storySystem = {
        resetSession: vi.fn(),
        unlockNextStep: vi.fn(),
        getStoryStatus: vi.fn(() => [{ id: 'T', type: 'T', isUnread: true }])
    };
    const uiController = {
        showResultScreen: vi.fn(),
        showFacilityScreen: vi.fn(),
        initHUD: vi.fn(),
        setFacilityActionHandler: vi.fn(),
        setFacilityDepartHandler: vi.fn(),
        setResultHandler: vi.fn(),
        setGameEndReturnHandler: vi.fn(),
        updateFacilityCredits: vi.fn(),
        updateHUDValue: vi.fn(),
        setFlightMode: vi.fn(),
        showGameEndSequence: vi.fn(),
        showBuildScreen: vi.fn()
    };
    const worldRenderer = {
        disableSonar: vi.fn(),
        playFinishAnimation: vi.fn(() => Promise.resolve()),
        setSector: vi.fn()
    };
    const sectorFactory = vi.fn(({ sessionState, isAnomaly }) => ({
        sectorNumber: sessionState.sectorNumber,
        isAnomaly,
        luckyDiscountRate: 0
    }));

    const controller = new GameController({
        sessionState,
        economySystem,
        gameRecordTracker,
        rankTracker,
        achievementTracker,
        flightRecorder,
        storySystem,
        uiController,
        worldRenderer,
        gameDataRepository,
        sectorFactory
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
        rankTracker,
        achievementTracker,
        flightRecorder,
        storySystem,
        uiController,
        worldRenderer,
        gameDataRepository,
        sectorFactory
    };
}
