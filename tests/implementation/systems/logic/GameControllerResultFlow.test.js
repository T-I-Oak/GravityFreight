import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createController, createSettlement } from './GameController.testHelper.js';

describe('GameController result and facility flow', () => {
    let context;

    beforeEach(() => {
        context = createController();
    });

    it('settles navigation end and shows a flight result view model', async () => {
        const collision = { type: 'arc', target: { getFacilityType: () => 'TRADING_POST' } };

        const viewData = await context.controller.handleNavigationEnd(collision);

        expect(context.currentRocket.getFlightResult).toHaveBeenCalled();
        expect(context.navigationLoopController.stop).toHaveBeenCalled();
        expect(context.economySystem.calculateSettlement).toHaveBeenCalledWith(
            collision,
            expect.objectContaining({ ticks: 260 }),
            context.sessionState
        );
        expect(context.sessionState.applySettlement).toHaveBeenCalledWith(expect.objectContaining({ status: 'cleared' }));
        expect(context.storySystem.unlockNextStep).toHaveBeenCalledWith('T');
        expect(context.uiController.updateMailStatus).toHaveBeenCalledWith(0, 'T', true);
        expect(context.flightRecorder.recordFlightResult).toHaveBeenCalledWith({
            resultType: 'cleared',
            score: 3260,
            totalScore: 3260,
            reachedSector: 3,
            destinationType: 'TRADING_POST'
        });
        expect(context.gameRecordTracker.recordFlightResult).toHaveBeenCalledWith({
            completedSectors: 1,
            distance: 260,
            score: 3260,
            earnedCoins: 30,
            collectedItemCount: 1
        });
        expect(context.achievementTracker.evaluateAchievements).toHaveBeenCalledWith({
            source: 'game_record',
            keys: ['total_launches', 'total_score']
        });
        expect(context.uiController.showAchievementToasts).toHaveBeenCalledWith([
            { achievementId: 'stat_launches', tier: 3, value: 20 }
        ]);
        expect(context.worldRenderer.disableSonar).toHaveBeenCalled();
        expect(context.uiController.playFlightEndSE).toHaveBeenCalledWith('cleared');
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
        expect(viewData.shareMap).toMatchObject({
            bodies: [
                { kind: 'home', radius: 40, position: { x: 0, y: 0 } }
            ],
            exits: [
                { angle: 30, width: 26, radius: 450, facilityType: 'TRADING_POST', facilityName: 'TRADING POST' }
            ],
            trail: [
                { x: 0, y: 0 },
                { x: 80, y: 40 },
                { x: 120, y: 70 }
            ],
            rocket: {
                position: { x: 120, y: 70 },
                velocity: { x: 5, y: 1 }
            }
        });
    });

    it('captures share map trail before finish animation collapses the visible trail', async () => {
        const flightTrail = [
            { x: 0, y: 0 },
            { x: 80, y: 40 },
            { x: 120, y: 70 }
        ];
        context.currentRocket.actualTrail = flightTrail.map(point => ({ ...point }));
        context.worldRenderer.playFinishAnimation.mockImplementation(() => {
            context.currentRocket.actualTrail = [
                { x: 120, y: 70 },
                { x: 120, y: 70 },
                { x: 120, y: 70 }
            ];
            return Promise.resolve();
        });

        const viewData = await context.controller.handleNavigationEnd({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        });

        expect(viewData.shareMap.trail).toEqual(flightTrail);
    });

    it('shows only the story unlocked by the current flight in the flight result', async () => {
        context.storySystem.unlockNextStep.mockReturnValue('TR');
        context.storySystem.getStoryStatus.mockReturnValue([
            { id: 'T', type: 'T', isUnread: true },
            { id: 'TR', type: 'R', isUnread: true }
        ]);

        const viewData = await context.controller.handleNavigationEnd({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        });

        expect(context.uiController.updateMailStatus).toHaveBeenCalledWith(1, 'R', true);
        expect(viewData.storyStatus).toEqual([
            { id: 'T', type: 'T', isUnread: true },
            { id: 'TR', type: 'R', isUnread: true }
        ]);
        expect(viewData.storyCards).toEqual([
            { id: 'TR', type: 'R', isUnread: true }
        ]);
    });

    it('does not show previous unread stories when the current flight unlocks no new story', async () => {
        context.storySystem.unlockNextStep.mockReturnValue(null);
        context.storySystem.getStoryStatus.mockReturnValue([
            { id: 'T', type: 'T', isUnread: true },
            { id: 'TR', type: 'R', isUnread: true },
            { id: 'TRB', type: 'B', isUnread: true }
        ]);

        const viewData = await context.controller.handleNavigationEnd({
            type: 'arc',
            target: { getFacilityType: () => 'TRADING_POST' }
        });

        expect(context.uiController.updateMailStatus).not.toHaveBeenCalled();
        expect(viewData.storyStatus).toEqual([
            { id: 'T', type: 'T', isUnread: true },
            { id: 'TR', type: 'R', isUnread: true },
            { id: 'TRB', type: 'B', isUnread: true }
        ]);
        expect(viewData.storyCards).toEqual([]);
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

    it('updates favorite state for an auto-saved flight record from the result screen', async () => {
        await context.controller.handleNavigationEnd({ type: 'arc' });

        const updated = context.controller.handleResultProtect(true);

        expect(context.flightRecorder.setFavorite).toHaveBeenCalledWith('flight_1', true);
        expect(context.flightRecorder.savePendingRecordAsFavorite).not.toHaveBeenCalled();
        expect(updated).toMatchObject({ id: 'flight_1', favorite: true });
    });

    it('releases a replaced protected record before protecting the result replay', async () => {
        await context.controller.handleNavigationEnd({ type: 'arc' });

        const updated = context.controller.handleResultProtect(true, { replaceRecordId: 'flight_old' });

        expect(context.flightRecorder.setFavorite).toHaveBeenNthCalledWith(1, 'flight_old', false);
        expect(context.flightRecorder.setFavorite).toHaveBeenNthCalledWith(2, 'flight_1', true);
        expect(updated).toMatchObject({ id: 'flight_1', favorite: true });
    });

    it('saves a pending flight record as favorite from the result screen', async () => {
        const { controller, flightRecorder } = createController(createSettlement({
            status: 'lost',
            destination: null,
            unlockedBranchId: null,
            totalScore: 260,
            totalCoins: 0
        }));
        flightRecorder.recordFlightResult.mockReturnValue(null);
        flightRecorder.getPendingRecord.mockReturnValue({ id: 'pending_1', favorite: false });

        await controller.handleNavigationEnd({ type: 'boundary' });
        const saved = controller.handleResultProtect(true);

        expect(flightRecorder.setFavorite).not.toHaveBeenCalled();
        expect(flightRecorder.savePendingRecordAsFavorite).toHaveBeenCalledTimes(1);
        expect(saved).toMatchObject({ id: 'pending_1', favorite: true });
    });

    it.each([
        ['returned', 'ROCKET RECOVERED', 100, 1],
        ['crashed', 'SHIP CRASHED', 60, 0],
        ['lost', 'LOST IN SPACE', 60, 0]
    ])('creates the %s flight result view and flight record context', async (status, title, totalCoins, collectedItemCount) => {
        const acquiredItems = collectedItemCount > 0 ? [{ id: 'recovered_part' }] : [];
        const { controller, gameRecordTracker, flightRecorder, uiController } = createController(createSettlement({
            status,
            destination: null,
            unlockedBranchId: null,
            totalScore: 260,
            totalCoins,
            acquiredItems
        }));

        const viewData = await controller.handleNavigationEnd({ type: status === 'returned' ? 'body' : 'boundary' });

        expect(uiController.playFlightEndSE).toHaveBeenCalledWith(status);
        expect(flightRecorder.recordFlightResult).toHaveBeenCalledWith({
            resultType: status,
            score: 260,
            totalScore: 260,
            reachedSector: 3,
            destinationType: null
        });
        expect(gameRecordTracker.recordFlightResult).toHaveBeenCalledWith({
            completedSectors: 0,
            distance: 260,
            score: 260,
            earnedCoins: totalCoins,
            collectedItemCount
        });
        expect(viewData).toMatchObject({
            title,
            status,
            themeClass: 'home',
            actionLabel: 'BACK TO BASE',
            totalScore: 260,
            totalCoins
        });
    });

    it('does not count recovered launch equipment as collected items in flight records', async () => {
        const recoveredRocket = { id: 'recovered_rocket' };
        const { controller, gameRecordTracker, rocketItem } = createController(createSettlement({
            status: 'returned',
            destination: null,
            unlockedBranchId: null,
            totalScore: 260,
            totalCoins: 100,
            acquiredItems: [],
            recoveredItems: [recoveredRocket]
        }));

        await controller.handleNavigationEnd({ type: 'body' });

        expect(recoveredRocket).not.toBe(rocketItem);
        expect(gameRecordTracker.recordFlightResult).toHaveBeenCalledWith(expect.objectContaining({
            collectedItemCount: 0
        }));
    });

    it('records matched delivery counts for delivery achievements', async () => {
        const { controller, sessionState, gameRecordTracker, achievementTracker } = createController(createSettlement({
            status: 'cleared',
            destination: 'TRADING_POST',
            deliveryCount: 2
        }));
        sessionState.applySettlement.mockImplementation(result => {
            sessionState.totalDeliveries = (sessionState.totalDeliveries ?? 0) + (result.deliveryCount ?? 0);
        });

        await controller.handleNavigationEnd({ type: 'arc' });

        expect(gameRecordTracker.recordDeliverySuccess).toHaveBeenCalledWith({
            count: 2,
            currentContractDeliveries: 2
        });
        expect(achievementTracker.evaluateAchievements).toHaveBeenCalledWith({
            source: 'game_record',
            keys: ['total_launches', 'total_score', 'total_deliveries', 'max_deliveries']
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
            }),
            expect.objectContaining({
                sections: expect.objectContaining({
                    rocket: expect.any(Object),
                    launcher: expect.any(Object)
                })
            }),
            expect.objectContaining({
                collapseBuildPanel: undefined
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
        expect(viewData.sections[1].sections).toEqual([
            expect.objectContaining({
                id: 'sell-rocket',
                title: 'ROCKET',
                subtitle: '',
                headerVariant: 'category'
            }),
            expect.objectContaining({
                id: 'sell-launcher',
                title: 'LAUNCHER',
                subtitle: '',
                headerVariant: 'category'
            }),
            expect.objectContaining({
                id: 'sell-booster',
                title: 'BOOSTER',
                subtitle: '',
                headerVariant: 'category'
            }),
            expect.objectContaining({
                id: 'sell-chassis',
                title: 'CHASSIS',
                subtitle: '',
                headerVariant: 'category'
            }),
            expect.objectContaining({
                id: 'sell-logic',
                title: 'LOGIC',
                subtitle: '',
                headerVariant: 'category'
            }),
            expect.objectContaining({
                id: 'sell-module',
                title: 'MODULES',
                subtitle: '',
                headerVariant: 'category'
            })
        ]);
        expect(viewData.sections[1].sections.map(section => section.id)).toEqual([
            'sell-rocket',
            'sell-launcher',
            'sell-booster',
            'sell-chassis',
            'sell-logic',
            'sell-module'
        ]);
        const sellEntries = viewData.sections[1].sections.flatMap(section => section.entries);
        expect(sellEntries.find(entry => entry.uid === 'stack_sell')).toMatchObject({
            action: 'sell',
            actionLabel: 'SELL',
            uid: 'stack_sell',
            price: 40,
            disabled: false
        });
        expect(context.uiController.setFacilityActionHandler).toHaveBeenCalled();
        expect(context.uiController.setFacilityDepartHandler).toHaveBeenCalled();
    });

    it.each(['returned', 'crashed', 'lost'])('confirms %s settlement by returning to build when the contract can continue', status => {
        context.controller.confirmSettlement(createSettlement({
            status,
            destination: null,
            luckyDiscountRate: 0.3
        }));

        expect(context.currentSector.luckyDiscountRate).toBe(0.3);
        expect(context.economySystem.checkGameOver).toHaveBeenCalledWith(context.sessionState);
        expect(context.uiController.setFlightMode).toHaveBeenCalledWith(false);
        expect(context.uiController.showBuildScreen).toHaveBeenCalled();
        expect(context.uiController.showFacilityScreen).not.toHaveBeenCalled();
        expect(context.uiController.showGameEndSequence).not.toHaveBeenCalled();
    });

    it('rebuilds the build view from recovered inventory after confirming a returned rocket', async () => {
        context.sessionState.inventory.popItemByUid('stack_rocket_ready');
        context.sessionState.applySettlement.mockImplementation(result => {
            result.recoveredItems?.forEach(item => context.sessionState.inventory.addItem(item));
        });
        const settlement = createSettlement({
            status: 'returned',
            destination: null,
            unlockedBranchId: null,
            acquiredItems: [],
            recoveredItems: [context.rocketItem]
        });
        context.economySystem.calculateSettlement.mockReturnValue(settlement);

        await context.controller.handleNavigationEnd({ type: 'body' });
        context.controller.confirmSettlement(settlement);

        const buildViewData = context.uiController.showBuildScreen.mock.calls.at(-1)[0];
        expect(buildViewData.sections.rocket.entries).toEqual([
            expect.objectContaining({
                uid: 'stack_readded_rocket_ready',
                itemViewData: expect.objectContaining({
                    id: 'rocket_ready',
                    uid: 'stack_readded_rocket_ready'
                })
            })
        ]);
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
        expect(context.uiController.showAchievementToasts).toHaveBeenLastCalledWith([
            { achievementId: 'stat_launches', tier: 3, value: 20 }
        ]);
        expect(context.uiController.updateFacilityCredits).toHaveBeenCalledWith(80);

        const refreshedView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        const refreshedBuildView = context.uiController.showFacilityScreen.mock.calls.at(-1)[2];
        const refreshedOptions = context.uiController.showFacilityScreen.mock.calls.at(-1)[3];
        expect(refreshedView.coins).toBe(120);
        expect(refreshedView.sections[0].entries).toEqual([]);
        expect(refreshedView.sections[1].sections.flatMap(section => section.entries))
            .toEqual(expect.arrayContaining([
                expect.objectContaining({
                    action: 'sell',
                    itemViewData: expect.objectContaining({ name: 'Long Sensor' })
                })
            ]));
        expect(refreshedBuildView.sections.logic.entries).toEqual(expect.arrayContaining([
            expect.objectContaining({
                uid: expect.stringContaining('stock_item'),
                itemViewData: expect.objectContaining({ name: 'Long Sensor' })
            })
        ]));
        expect(refreshedOptions).toEqual(expect.objectContaining({
            collapseBuildPanel: false
        }));
        expect(context.uiController.showFacilityScreen.mock.invocationCallOrder.at(-1))
            .toBeLessThan(context.uiController.updateFacilityCredits.mock.invocationCallOrder.at(-1));
    });

    it('updates the Trading Post sell stack count when buying an already owned item', () => {
        const stockItem = {
            uid: 'stock_logic_same',
            id: 'sensor_short',
            category: 'logic',
            getViewData: vi.fn(() => ({
                uid: 'stock_logic_same',
                id: 'sensor_short',
                name: 'Short Sensor',
                category: 'logic',
                stats: {}
            }))
        };
        context.economySystem.generateTradingPostStock.mockReturnValue([
            {
                item: stockItem,
                originalPrice: 80,
                itemDiscount: 0
            }
        ]);
        context.controller.enterFacility('TRADING_POST');

        context.controller.handleFacilityAction('buy', { uid: 'stock_logic_same' });

        const refreshedView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        const logicSellEntry = refreshedView.sections[1].sections
            .find(section => section.id === 'sell-logic')
            .entries
            .find(entry => entry.itemViewData.id === 'sensor_short');
        expect(logicSellEntry.itemViewData).toMatchObject({
            uid: 'stack_logic',
            count: 2
        });
        expect(logicSellEntry.cardOptions).toEqual({ selectedCount: 1 });
    });

    it('applies Trading Post sell transactions from an inventory stack', () => {
        context.sessionState.coins = 0;
        context.controller.enterFacility('TRADING_POST');

        const initialView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        const sellEntry = initialView.sections[1].sections
            .flatMap(section => section.entries)
            .find(entry => entry.uid === 'stack_sell');
        expect(sellEntry.disabled).toBe(false);
        expect(initialView.sections[1].sections.map(section => section.id)).toContain('sell-module');

        const delta = context.controller.handleFacilityAction('sell', { uid: 'stack_sell' });

        expect(context.sessionState.applyTransaction).toHaveBeenCalledWith({
            spentCoins: 0,
            earnedCoins: 40,
            removedItems: [expect.objectContaining({ uid: 'sell_item' })]
        });
        expect(context.gameRecordTracker.recordTransaction).toHaveBeenCalledWith(delta, {
            currentCoins: 40
        });
        expect(context.uiController.updateFacilityCredits).toHaveBeenCalledWith(40);
        expect(context.uiController.updateHUDValue).toHaveBeenCalledWith('coin', 40);
        const refreshedView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        const refreshedBuildView = context.uiController.showFacilityScreen.mock.calls.at(-1)[2];
        expect(refreshedView.coins).toBe(0);
        expect(refreshedView.sections[1].sections.flatMap(section => section.entries))
            .not.toEqual(expect.arrayContaining([
                expect.objectContaining({ uid: 'stack_sell' })
            ]));
        expect(refreshedBuildView.sections.logic.entries)
            .not.toEqual(expect.arrayContaining([
                expect.objectContaining({ uid: 'stack_sell' })
            ]));
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
        const initialView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        const repairEntries = initialView.sections[0].sections[0].entries;

        expect(repairEntries).toEqual([
            expect.objectContaining({
                uid: 'launcher_damaged',
                price: 8,
                disabled: false,
                discountPercent: 20
            }),
            expect.objectContaining({
                uid: 'launcher_ready',
                price: 8,
                disabled: true,
                discountPercent: 20
            })
        ]);

        context.controller.handleFacilityAction('repair', { uid: 'launcher_damaged' });
        expect(context.uiController.setFacilityActionHandler).toHaveBeenCalledTimes(2);
        expect(context.uiController.setFacilityDepartHandler).toHaveBeenCalledTimes(2);

        context.controller.handleFacilityAction('dismantle', { uid: 'rocket_item' });
        expect(context.uiController.setFacilityActionHandler).toHaveBeenCalledTimes(3);
        expect(context.uiController.setFacilityDepartHandler).toHaveBeenCalledTimes(3);

        expect(context.economySystem.createRepairTransaction).toHaveBeenCalledWith(
            expect.objectContaining({ uid: 'launcher_damaged' }),
            0.2
        );
        expect(context.economySystem.createDismantleTransaction).toHaveBeenCalledWith(rocketItem, 0, 0.2);
        const refreshedView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        expect(refreshedView.sections).toHaveLength(2);
        expect(refreshedView.sections[0].sections).toHaveLength(2);
        expect(refreshedView.sections[0].sections[1].entries).toEqual([]);
        expect(refreshedView.sections[1].entries).toHaveLength(1);
        expect(refreshedView.sections[1].entries[0]).toMatchObject({
            uid: 'enhanced_part',
            hideAction: true
        });
    });

    it('disables Repair Dock paid actions when the player does not have enough coins', () => {
        context.sessionState.coins = 5;
        context.controller.currentRocket = { rocketItem: context.rocketItem };
        context.currentSector.luckyDiscountRate = 0;
        context.controller.enterFacility('REPAIR_DOCK');

        const viewData = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        const repairEntries = viewData.sections[0].sections[0].entries;
        const dismantleEntries = viewData.sections[0].sections[1].entries;

        expect(repairEntries.find(entry => entry.uid === 'launcher_damaged')).toMatchObject({
            disabled: true
        });
        expect(dismantleEntries[0]).toMatchObject({
            disabled: true
        });
    });

    it('delegates Black Market premium transactions', () => {
        context.currentSector.luckyDiscountRate = 0.2;
        context.controller.enterFacility('BLACK_MARKET');

        const initialView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        expect(initialView.sections[0].entries).toEqual([
            expect.objectContaining({ uid: 'black_market_normal', discountPercent: 20 }),
            expect.objectContaining({ uid: 'black_market_premium', discountPercent: 20 })
        ]);

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
        const refreshedView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        expect(refreshedView.sections[0].entries.every(entry => entry.disabled)).toBe(true);
        expect(refreshedView.sections[1].entries).toHaveLength(1);
        expect(refreshedView.sections[1].entries[0]).toMatchObject({
            uid: 'premium_item',
            hideAction: true
        });
        expect(() => context.controller.handleFacilityAction('buy_normal', { uid: 'black_market_normal' }))
            .toThrow('[FacilityFlowController] Black Market purchase is limited to once per facility stay.');
    });

    it('leaves a facility and starts the next sector when the contract can continue', async () => {
        context.controller.enterFacility('TRADING_POST');

        const gameEnded = await context.controller.leaveFacility();

        expect(gameEnded).toBe(false);
        expect(context.economySystem.checkGameOver).toHaveBeenCalledWith(context.sessionState);
        expect(context.sessionState.sectorNumber).toBe(4);
        expect(context.sectorFactory).toHaveBeenCalledWith({
            sessionState: context.sessionState,
            isAnomaly: false
        });
        expect(context.controller.currentSector).toMatchObject({
            sectorNumber: 4,
            isAnomaly: false,
            luckyDiscountRate: 0
        });
        expect(context.gameRecordTracker.recordSectorStart).toHaveBeenCalledWith(context.sessionState);
        expect(context.achievementTracker.evaluateAchievements).toHaveBeenLastCalledWith({
            source: 'game_record',
            keys: ['max_reached_sector']
        });
        expect(context.uiController.showAchievementToasts).toHaveBeenLastCalledWith([
            { achievementId: 'stat_launches', tier: 3, value: 20 }
        ]);
        expect(context.worldRenderer.setSector).toHaveBeenCalledWith(context.controller.currentSector);
        expect(context.uiController.updateHUDValue).toHaveBeenCalledWith('coin', 120);
        expect(context.uiController.updateHUDValue).toHaveBeenCalledWith('sector', 4);
        expect(context.uiController.showBuildScreen).toHaveBeenCalled();
        expect(context.uiController.setFlightMode).toHaveBeenCalledWith(false);
    });

    it('records a Black Market visit before generating the next sector', async () => {
        context.controller.enterFacility('BLACK_MARKET');

        await context.controller.leaveFacility();

        expect(context.sessionState.recordBlackMarketVisit).toHaveBeenCalledTimes(1);
        expect(context.sessionState.recordBlackMarketVisit.mock.invocationCallOrder[0])
            .toBeLessThan(context.sectorFactory.mock.invocationCallOrder[0]);
        expect(context.sessionState.blackMarketVisits).toBe(1);
    });

    it('shows the game end sequence on facility departure when the contract cannot continue', async () => {
        const gameOver = { reason: 'NO_PARTS_REMAINING', details: ['CHASSIS'] };
        context.economySystem.checkGameOver.mockReturnValue(gameOver);
        context.controller.enterFacility('REPAIR_DOCK');

        const gameEnded = await context.controller.leaveFacility();

        expect(gameEnded).toBe(true);
        expect(context.sessionState.getGameResultSummary).toHaveBeenCalledWith({
            completedSectors: 3
        });
        const gameResult = context.sessionState.getGameResultSummary.mock.results.at(-1).value;
        expect(context.gameRecordTracker.recordGameResult).toHaveBeenCalledWith(gameResult);
        expect(context.rankTracker.recordGameResult).toHaveBeenCalledWith(gameResult);
        expect(context.achievementTracker.evaluateAchievements).toHaveBeenLastCalledWith({
            source: 'game_record',
            keys: ['lifetime_contracts']
        });
        expect(context.uiController.showAchievementToasts).toHaveBeenLastCalledWith([
            { achievementId: 'stat_launches', tier: 3, value: 20 }
        ]);
        expect(context.uiController.showGameEndSequence).toHaveBeenCalledWith(gameResult, gameOver, {
            achievements: [{ achievementId: 'stat_launches', tier: 3, value: 20 }]
        });
        expect(context.sectorFactory).not.toHaveBeenCalled();
    });
});
