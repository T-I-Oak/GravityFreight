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
        getGameBalance: vi.fn(() => ({
            SHIP_START_OFFSET: 12
        })),
        getMapConstants: vi.fn(() => ({
            STAR_HIT_MARGIN: 15
        })),
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
            'build.empty.rocket.text': '待機中のロケットなし',
            'build.empty.rocket.subtext': 'ここをクリックしてロケットを建造してください',
            'build.empty.launcher.text': '発射台なし',
            'build.empty.launcher.subtext': '購入または回収してください',
            'build.empty.booster.text': 'ブースターなし',
            'build.empty.booster.subtext': '購入または回収してください',
            'build.empty.chassis.text': 'シャーシなし',
            'build.empty.chassis.subtext': '購入または回収してください',
            'build.empty.logic.text': 'ロジックなし',
            'build.empty.logic.subtext': '購入または回収してください',
            'build.empty.module.text': 'モジュールなし',
            'build.empty.module.subtext': '購入または回収してください',
            'build.assemble.label': 'ASSEMBLE ROCKET',
            'build.assemble.waitingSubtext': 'Select chassis and logic to assemble.',
            'build.assemble.readySubtext': 'Ready to assemble.',
            'build.launch.label': 'LAUNCH ENGINE',
            'build.launch.waitingSubtext': 'Select a rocket and launcher to begin launch prep.',
            'build.launch.readySubtext': 'Confirm the launch angle to fire.',
            'build.launch.returnBonusText': 'RETURN BONUS POWER x{multiplier}'
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
    const currentSector = {
        luckyDiscountRate: 0,
        bodies: [
            {
                isHome: true,
                radius: 40,
                position: { x: 0, y: 0 }
            }
        ],
        createSnapshot: vi.fn(() => ({
            sectorNumber: 3,
            bodies: [],
            exits: []
        }))
    };
    const rocketItem = {
        uid: 'rocket_ready',
        id: 'rocket_ready',
        category: 'rocket',
        getMass: vi.fn(() => 10),
        getPower: vi.fn(() => 4),
        getPowerMultiplier: vi.fn(() => 1),
        getPrecision: vi.fn(() => 100),
        getPickupRange: vi.fn(() => 0),
        getPickupMultiplier: vi.fn(() => 1),
        getGravityMultiplier: vi.fn(() => 1),
        getArcMultiplier: vi.fn(() => 1),
        getViewData: vi.fn(() => ({
            uid: 'rocket_ready',
            id: 'rocket_ready',
            name: 'Ready Rocket',
            category: 'rocket',
            stats: {}
        })),
        createSnapshot: vi.fn(() => ({
            uid: 'rocket_ready',
            rocketItem: true
        }))
    };
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
    const readyLauncher = {
        uid: 'launcher_ready',
        category: 'launcher',
        charges: 2,
        maxCharges: 2,
        power: 8,
        powerMultiplier: 1,
        consumeCharge: vi.fn(amount => {
            readyLauncher.charges = Math.max(0, readyLauncher.charges - amount);
            return readyLauncher.charges;
        }),
        getViewData: vi.fn(() => ({
            uid: 'launcher_ready',
            id: 'pad_standard_d2',
            name: 'Standard Pad',
            category: 'launcher',
            stats: {}
        })),
        createSnapshot: vi.fn(() => ({
            uid: 'launcher_ready',
            id: 'pad_standard_d2',
            charges: readyLauncher.charges,
            enhancements: {}
        }))
    };
    const boosterItem = {
        uid: 'booster_ready',
        category: 'booster',
        charges: 1,
        maxCharges: 1,
        power: 0,
        powerMultiplier: 1.2,
        preventsLauncherWear: true,
        consumeCharge: vi.fn(amount => {
            boosterItem.charges = Math.max(0, boosterItem.charges - amount);
            return boosterItem.charges;
        }),
        getViewData: vi.fn(() => ({
            uid: 'booster_ready',
            id: 'opt_fuel',
            name: 'Fuel',
            category: 'booster',
            stats: {}
        })),
        createSnapshot: vi.fn(() => ({
            uid: 'booster_ready',
            id: 'opt_fuel',
            charges: boosterItem.charges,
            enhancements: {}
        }))
    };
    const inventoryStack = {
        uid: 'stack_sell',
        representative: sellItem,
        items: [sellItem],
        count: 1
    };
    const launcherStack = {
        uid: 'stack_launcher',
        representative: damagedLauncher,
        items: [damagedLauncher],
        count: 1
    };
    const rocketStack = {
        uid: 'stack_rocket_ready',
        representative: rocketItem,
        items: [rocketItem],
        count: 1
    };
    const readyLauncherStack = {
        uid: 'stack_launcher_ready',
        representative: readyLauncher,
        items: [readyLauncher],
        count: 1
    };
    const boosterStack = {
        uid: 'stack_booster_ready',
        representative: boosterItem,
        items: [boosterItem],
        count: 1
    };
    const chassisStack = {
        uid: 'stack_chassis',
        representative: chassisItem,
        items: [chassisItem],
        count: 1,
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
        count: 1,
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
    rocketStack.getViewData = vi.fn(() => ({
        ...rocketItem.getViewData(),
        uid: 'stack_rocket_ready',
        count: 1
    }));
    readyLauncherStack.getViewData = vi.fn(() => ({
        ...readyLauncher.getViewData(),
        uid: 'stack_launcher_ready',
        count: 1
    }));
    boosterStack.getViewData = vi.fn(() => ({
        ...boosterItem.getViewData(),
        uid: 'stack_booster_ready',
        count: 1
    }));
    const stacks = [
        inventoryStack,
        launcherStack,
        rocketStack,
        readyLauncherStack,
        boosterStack,
        chassisStack,
        logicStack
    ];
    const sessionState = {
        sectorNumber: 3,
        coins: 120,
        returnBonus: 0,
        initialize: vi.fn(() => {
            sessionState.sectorNumber = 0;
            sessionState.coins = 120;
            sessionState.returnBonus = 0;
        }),
        inventory: {
            stacks,
            getItemsByCategory: vi.fn(category => stacks
                .filter(stack => stack.representative?.category === category)),
            popItemByUid: vi.fn(uid => {
                const stackIndex = stacks.findIndex(stack => stack.uid === uid);
                if (stackIndex < 0) {
                    return null;
                }

                const stack = stacks[stackIndex];
                const item = stack.items.pop();
                stack.count = stack.items.length;
                if (stack.count === 0) {
                    stacks.splice(stackIndex, 1);
                }
                return item ?? null;
            }),
            addItem: vi.fn(item => {
                const stack = {
                    uid: `stack_readded_${item.uid}`,
                    representative: item,
                    items: [item],
                    count: 1,
                    getViewData: vi.fn(() => ({
                        ...item.getViewData(),
                        uid: `stack_readded_${item.uid}`,
                        count: 1
                    }))
                };
                stacks.push(stack);
            })
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
                removedItemCount,
                acquiredItems: transaction.acquiredItems ?? [],
                removedItems: transaction.removedItems ?? []
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
        captureLaunchSnapshot: vi.fn(),
        recordFlightResult: vi.fn(() => ({ id: 'flight_1', favorite: false })),
        getPendingRecord: vi.fn(() => null),
        getRecords: vi.fn(() => [
            { id: 'flight_old', no: '01', score: 1000, reachedSector: 1, favorite: true }
        ]),
        setFavorite: vi.fn((id, favorite) => ({ id, favorite })),
        savePendingRecordAsFavorite: vi.fn(() => ({ id: 'pending_1', favorite: true }))
    };
    const storySystem = {
        resetSession: vi.fn(),
        unlockNextStep: vi.fn(branchId => branchId),
        getStoryStatus: vi.fn(() => [{ id: 'T', type: 'T', isUnread: true }])
    };
    const uiController = {
        showResultScreen: vi.fn(),
        showFacilityScreen: vi.fn(),
        initHUD: vi.fn(),
        setFacilityActionHandler: vi.fn(),
        setFacilityDepartHandler: vi.fn(),
        setResultHandler: vi.fn(),
        setMapToggleHandler: vi.fn(),
        setGameEndReturnHandler: vi.fn(),
        setLaunchHandler: vi.fn(),
        showStarInfo: vi.fn(),
        hideStarInfo: vi.fn(),
        updateFacilityCredits: vi.fn(),
        updateHUDValue: vi.fn(),
        updateMailStatus: vi.fn(),
        setFlightMode: vi.fn(),
        showSectorTransitionScreen: vi.fn(),
        showSectorTitle: vi.fn(),
        showGameEndSequence: vi.fn(),
        showBuildScreen: vi.fn(),
        setBuildItemSelectionHandler: vi.fn(),
        setBuildAssembleHandler: vi.fn(),
        setCanvasInputHandler: vi.fn()
    };
    const cameraController = {
        isInMapArea: vi.fn(() => true),
        pan: vi.fn(),
        rotate: vi.fn(),
        zoom: vi.fn(),
        save: vi.fn(),
        toWorld: vi.fn(point => ({ ...point }))
    };
    const worldRenderer = {
        disableSonar: vi.fn(),
        enableSonar: vi.fn(),
        clearAimRocket: vi.fn(),
        clearPredictionPath: vi.fn(),
        playFinishAnimation: vi.fn(() => Promise.resolve()),
        playGameEndExitAnimation: vi.fn(() => Promise.resolve()),
        stopGameEndExitAnimation: vi.fn(() => Promise.resolve()),
        setSector: vi.fn(),
        clearSector: vi.fn(),
        setAimRocket: vi.fn(),
        setPredictionPath: vi.fn(),
        startWarpEffect: vi.fn(),
        stopWarpEffect: vi.fn(),
        startNavigation: vi.fn(),
        render: vi.fn()
    };
    const trajectoryPredictor = {
        predictPath: vi.fn(() => ({
            actualTrail: [
                { x: 0, y: 0 },
                { x: 12, y: 24 }
            ]
        }))
    };
    const navigationLoopController = {
        start: vi.fn(),
        stop: vi.fn()
    };
    const sectorFactory = vi.fn(({ sessionState, isAnomaly }) => ({
        sectorNumber: sessionState.sectorNumber,
        isAnomaly,
        luckyDiscountRate: 0,
        bodies: currentSector.bodies,
        createSnapshot: currentSector.createSnapshot
    }));

    const wait = vi.fn(() => Promise.resolve());
    const sectorTransitionDurations = {
        warpOut: 0,
        hold: 0,
        warpIn: 0
    };
    const appOrchestrator = {
        returnToTitle: vi.fn()
    };
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
        cameraController,
        trajectoryPredictor,
        navigationLoopController,
        gameDataRepository,
        appOrchestrator,
        sectorFactory,
        wait,
        sectorTransitionDurations
    });
    controller.currentRocket = currentRocket;
    controller.currentSector = currentSector;

    return {
        controller,
        currentRocket,
        currentSector,
        rocketItem,
        readyLauncher,
        boosterItem,
        sessionState,
        economySystem,
        gameRecordTracker,
        rankTracker,
        achievementTracker,
        flightRecorder,
        storySystem,
        uiController,
        worldRenderer,
        appOrchestrator,
        cameraController,
        trajectoryPredictor,
        navigationLoopController,
        gameDataRepository,
        sectorFactory,
        wait,
        sectorTransitionDurations
    };
}
