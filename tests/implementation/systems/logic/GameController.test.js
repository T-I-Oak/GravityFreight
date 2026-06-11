import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createController, createSettlement } from './GameController.testHelper.js';

describe('GameController', () => {
    let context;

    beforeEach(() => {
        context = createController();
    });

    it('starts a contract by initializing session state, HUD, handlers, and the first sector', async () => {
        await context.controller.start();

        expect(context.sessionState.initialize).toHaveBeenCalled();
        expect(context.storySystem.resetSession).toHaveBeenCalled();
        expect(context.uiController.initHUD).toHaveBeenCalledWith(context.sessionState);
        expect(context.uiController.setResultHandler).toHaveBeenCalled();
        expect(context.uiController.setGameEndReturnHandler).toHaveBeenCalled();
        expect(context.uiController.setBuildItemSelectionHandler).toHaveBeenCalled();
        expect(context.uiController.setBuildAssembleHandler).toHaveBeenCalled();
        expect(context.uiController.setLaunchHandler).toHaveBeenCalled();
        expect(context.uiController.setCanvasInputHandler).toHaveBeenCalled();
        expect(context.sessionState.sectorNumber).toBe(1);
        expect(context.sectorFactory).toHaveBeenCalledWith({
            sessionState: context.sessionState,
            isAnomaly: false
        });
        expect(context.worldRenderer.setSector).toHaveBeenCalledWith(context.controller.currentSector);
        expect(context.uiController.showBuildScreen).toHaveBeenCalled();
        const buildViewData = context.uiController.showBuildScreen.mock.calls.at(-1)[0];
        expect(buildViewData.sections.launcher.entries).toHaveLength(2);
        expect(buildViewData.sections.chassis.entries).toHaveLength(1);
        expect(buildViewData.sections.logic.entries).toHaveLength(1);
        expect(buildViewData.launch.ready).toBe(false);
    });

    it('delegates build item selection to BuildFlowController', async () => {
        await context.controller.start();
        const handler = context.uiController.setBuildItemSelectionHandler.mock.calls.at(-1)[0];

        handler({ category: 'launcher', uid: 'stack_launcher' });

        expect(context.controller.buildFlowController.currentBuildSelection.launcher).toBe('stack_launcher');
    });

    it('launches the selected rocket and captures the launch snapshot', async () => {
        await context.controller.start();
        context.controller.buildFlowController.currentBuildSelection = {
            rocket: 'stack_rocket_ready',
            launcher: 'stack_launcher_ready',
            booster: 'stack_booster_ready'
        };
        const handler = context.uiController.setLaunchHandler.mock.calls.at(-1)[0];

        const rocket = handler();

        expect(rocket.rocketItem).toBe(context.rocketItem);
        expect(rocket.launcher).toBe(context.readyLauncher);
        expect(rocket.booster).toBe(context.boosterItem);
        expect(context.controller.currentRocket).toBe(rocket);
        expect(context.readyLauncher.consumeCharge).not.toHaveBeenCalled();
        expect(context.sessionState.inventory.addItem).toHaveBeenCalledWith(context.readyLauncher);
        expect(context.boosterItem.consumeCharge).toHaveBeenCalledWith(1);
        expect(context.sessionState.inventory.addItem).not.toHaveBeenCalledWith(context.boosterItem);
        expect(context.flightRecorder.captureLaunchSnapshot).toHaveBeenCalledWith(
            rocket,
            context.controller.currentSector
        );
        expect(context.uiController.setFlightMode).toHaveBeenCalledWith(true);
        expect(context.worldRenderer.startNavigation).toHaveBeenCalledWith(rocket);
        expect(context.worldRenderer.enableSonar).toHaveBeenCalled();
        expect(context.controller.buildFlowController.currentBuildSelection.rocket).toBeUndefined();
        expect(context.controller.buildFlowController.currentBuildSelection.launcher).toBeUndefined();
        expect(context.controller.buildFlowController.currentBuildSelection.booster).toBeUndefined();
        const refreshedBuildView = context.uiController.showBuildScreen.mock.calls.at(-1)[0];
        expect(refreshedBuildView.launch.ready).toBe(false);
        expect(refreshedBuildView.sections.rocket.entries).toEqual([]);
        expect(refreshedBuildView.sections.launcher.entries).toHaveLength(2);
    });

    it('exposes inconsistent launch operations while required flight parts are not selected', async () => {
        await context.controller.start();

        expect(() => context.controller.launchSelectedRocket())
            .toThrow('[GameController] rocket and launcher selections are required.');
        expect(context.flightRecorder.captureLaunchSnapshot).not.toHaveBeenCalled();
        expect(context.uiController.setFlightMode).not.toHaveBeenCalledWith(true);
        expect(context.worldRenderer.startNavigation).not.toHaveBeenCalled();
    });

    it('pans the camera from map pointer drags inside the map area', async () => {
        await context.controller.start();

        context.controller.handleCanvasInput({
            type: 'pointerdown',
            point: { x: 100, y: 120 }
        });
        context.controller.handleCanvasInput({
            type: 'pointermove',
            point: { x: 130, y: 150 }
        });
        context.controller.handleCanvasInput({
            type: 'pointerup',
            point: { x: 130, y: 150 }
        });

        expect(context.cameraController.pan).toHaveBeenCalledWith({ x: 30, y: 30 });
        expect(context.worldRenderer.render).toHaveBeenCalled();
        expect(context.cameraController.save).toHaveBeenCalledTimes(1);
    });

    it('rotates the camera from pointer drags outside the map area', async () => {
        await context.controller.start();
        context.cameraController.isInMapArea.mockReturnValue(false);

        context.controller.handleCanvasInput({
            type: 'pointerdown',
            point: { x: 700, y: 120 }
        });
        context.controller.handleCanvasInput({
            type: 'pointermove',
            point: { x: 740, y: 160 }
        });
        context.controller.handleCanvasInput({
            type: 'pointerup',
            point: { x: 740, y: 160 }
        });

        expect(context.cameraController.rotate).toHaveBeenCalledWith(
            { x: 700, y: 120 },
            { x: 40, y: 40 }
        );
        expect(context.worldRenderer.render).toHaveBeenCalled();
        expect(context.cameraController.save).toHaveBeenCalledTimes(1);
    });

    it('maps two pointer gestures to camera pan and zoom', async () => {
        await context.controller.start();

        context.controller.handleCanvasInput({
            type: 'pinch',
            point: { x: 180, y: 140 },
            delta: { x: 12, y: -4 },
            scale: 1.25
        });
        context.controller.handleCanvasInput({
            type: 'pointerup',
            point: { x: 180, y: 140 }
        });

        expect(context.cameraController.pan).toHaveBeenCalledWith({ x: 12, y: -4 });
        expect(context.cameraController.zoom).toHaveBeenCalledWith(1.25, { x: 180, y: 140 });
        expect(context.worldRenderer.render).toHaveBeenCalled();
        expect(context.cameraController.save).toHaveBeenCalledTimes(1);
    });

    it('updates launch angle from AIM input and launches from the home body surface', async () => {
        await context.controller.start();
        context.controller.buildFlowController.currentBuildSelection = {
            rocket: 'stack_rocket_ready',
            launcher: 'stack_launcher_ready'
        };

        context.controller.handleCanvasInput({
            type: 'pointerdown',
            point: { x: 0, y: 40 }
        });
        const rocket = context.controller.launchSelectedRocket();

        expect(rocket.angle).toBeCloseTo(Math.PI / 2);
        expect(rocket.position.x).toBeCloseTo(0);
        expect(rocket.position.y).toBeCloseTo(40);
        expect(context.worldRenderer.render).toHaveBeenCalled();
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
            achievements: [{ achievementId: 'stat_launches', tier: 3, value: 20 }],
            ranks: {
                scoreRank: 1,
                sectorRank: 1,
                collectedRank: 1
            }
        });
        expect(context.sectorFactory).not.toHaveBeenCalled();
    });
});
