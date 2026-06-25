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
        const { controller, gameRecordTracker, flightRecorder } = createController(createSettlement({
            status,
            destination: null,
            unlockedBranchId: null,
            totalScore: 260,
            totalCoins,
            acquiredItems
        }));

        const viewData = await controller.handleNavigationEnd({ type: status === 'returned' ? 'body' : 'boundary' });

        expect(flightRecorder.recordFlightResult).toHaveBeenCalledWith({
            resultType: status,
            score: 260,
            totalScore: 260,
            reachedSector: 3,
            destinationType: null
        });
        expect(gameRecordTracker.recordFlightResult).toHaveBeenCalledWith({
            completedSectors: 0,
            distance: 1400,
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

    it.each(['returned', 'crashed', 'lost'])('confirms %s settlement by returning to build when the contract can continue', status => {
        context.controller.confirmSettlement(createSettlement({
            status,
            destination: null,
            luckyDiscountRate: 0.3
        }));

        expect(context.currentSector.luckyDiscountRate).toBe(0.3);
        expect(context.economySystem.checkGameOver).toHaveBeenCalledWith(context.sessionState);
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
        expect(context.uiController.updateFacilityCredits).toHaveBeenCalledWith(80);

        const refreshedView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        expect(refreshedView.coins).toBe(120);
        expect(refreshedView.sections[0].entries).toEqual([]);
        expect(context.uiController.showFacilityScreen.mock.invocationCallOrder.at(-1))
            .toBeLessThan(context.uiController.updateFacilityCredits.mock.invocationCallOrder.at(-1));
    });

    it('applies Trading Post sell transactions from an inventory stack', () => {
        context.controller.enterFacility('TRADING_POST');

        const initialView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        const sellEntry = initialView.sections[1].entries.find(entry => entry.uid === 'stack_sell');
        expect(sellEntry.disabled).toBe(false);

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
        expect(context.uiController.updateHUDValue).toHaveBeenCalledWith('coin', 160);
        const refreshedView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        expect(refreshedView.coins).toBe(120);
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
            expect.objectContaining({ uid: 'launcher_damaged', disabled: false }),
            expect.objectContaining({ uid: 'launcher_ready', disabled: true })
        ]);

        context.controller.handleFacilityAction('repair', { uid: 'launcher_damaged' });
        context.controller.handleFacilityAction('dismantle', { uid: 'rocket_item' });

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
        const refreshedView = context.uiController.showFacilityScreen.mock.calls.at(-1)[1];
        expect(refreshedView.sections[0].entries.every(entry => entry.disabled)).toBe(true);
        expect(refreshedView.sections[1].entries).toHaveLength(1);
        expect(refreshedView.sections[1].entries[0]).toMatchObject({
            uid: 'premium_item',
            hideAction: true
        });
        expect(() => context.controller.handleFacilityAction('buy_normal', { uid: 'black_market_normal' }))
            .toThrow('[GameController] Black Market purchase is limited to once per facility stay.');
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
        expect(context.worldRenderer.setSector).toHaveBeenCalledWith(context.controller.currentSector);
        expect(context.uiController.updateHUDValue).toHaveBeenCalledWith('sector', 4);
        expect(context.uiController.showBuildScreen).toHaveBeenCalled();
        expect(context.uiController.setFlightMode).toHaveBeenCalledWith(false);
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
        expect(context.uiController.showGameEndSequence).toHaveBeenCalledWith(gameResult, gameOver, {
            achievements: [{ achievementId: 'stat_launches', tier: 3, value: 20 }]
        });
        expect(context.sectorFactory).not.toHaveBeenCalled();
    });
});
