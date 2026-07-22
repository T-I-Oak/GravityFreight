import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createController } from './GameController.testHelper.js';

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
        expect(context.worldRenderer.clearSector).toHaveBeenCalled();
        expect(context.uiController.setResultHandler).toHaveBeenCalled();
        expect(context.uiController.setMapToggleHandler).toHaveBeenCalled();
        expect(context.uiController.setMailHandler).toHaveBeenCalled();
        expect(context.uiController.setResultStoryHandler).toHaveBeenCalled();
        expect(context.uiController.setGameEndReturnHandler).toHaveBeenCalled();
        expect(context.uiController.setBuildItemSelectionHandler).toHaveBeenCalled();
        expect(context.uiController.setBuildAssembleHandler).toHaveBeenCalled();
        expect(context.uiController.setLaunchHandler).toHaveBeenCalled();
        expect(context.uiController.setBuildTabChangeHandler).toHaveBeenCalled();
        expect(context.uiController.setCanvasInputHandler).toHaveBeenCalled();
        expect(context.tutorialFlowController.setCanvasTargetResolver).toHaveBeenCalledWith(expect.any(Function));
        expect(context.tutorialFlowController.setCanvasFocusBoundsResolver).toHaveBeenCalledWith(expect.any(Function));
        expect(context.tutorialFlowController.setMapInteractionController).toHaveBeenCalledWith(context.controller.mapInteractionController);
        expect(context.uiController.showSectorTransitionScreen).toHaveBeenCalled();
        expect(context.worldRenderer.startWarpEffect).toHaveBeenCalledWith(0);
        expect(context.sessionState.sectorNumber).toBe(1);
        expect(context.sectorFactory).toHaveBeenCalledWith({
            sessionState: context.sessionState,
            isAnomaly: false
        });
        expect(context.worldRenderer.startWarpEffect.mock.invocationCallOrder[0])
            .toBeLessThan(context.sectorFactory.mock.invocationCallOrder[0]);
        expect(context.sectorFactory.mock.invocationCallOrder[0])
            .toBeLessThan(context.worldRenderer.stopWarpEffect.mock.invocationCallOrder[0]);
        expect(context.worldRenderer.stopWarpEffect).toHaveBeenCalledWith(0);
        expect(context.worldRenderer.stopWarpEffect.mock.invocationCallOrder[0])
            .toBeLessThan(context.uiController.showBuildScreen.mock.invocationCallOrder[0]);
        expect(context.worldRenderer.setSector).toHaveBeenCalledWith(context.controller.currentSector);
        expect(context.uiController.showBuildScreen).toHaveBeenCalled();
        expect(context.uiController.setFlightMode).toHaveBeenCalledWith(false);
        const buildViewData = context.uiController.showBuildScreen.mock.calls.at(-1)[0];
        expect(buildViewData.sections.launcher.entries).toHaveLength(2);
        expect(buildViewData.sections.chassis.entries).toHaveLength(1);
        expect(buildViewData.sections.logic.entries).toHaveLength(1);
        expect(buildViewData.launch.ready).toBe(false);
    });

    it('opens an unread story from a mail slot and refreshes mail status', () => {
        context.storySystem.getStoryStatus
            .mockReturnValueOnce([{ id: 'T', type: 'T', isUnread: true }])
            .mockReturnValueOnce([{ id: 'T', type: 'T', isUnread: true }])
            .mockReturnValueOnce([{ id: 'T', type: 'T', isUnread: false }]);

        const updatedStory = context.controller.handleMailClick(0);

        expect(context.uiController.showStoryModal).toHaveBeenCalledWith('T');
        expect(context.storySystem.updateReadStatus).toHaveBeenCalledWith('T');
        expect(context.achievementTracker.evaluateAchievements).toHaveBeenCalledWith({
            source: 'story_read',
            keys: ['total', 'T']
        });
        expect(context.uiController.showAchievementToasts).toHaveBeenCalledWith([
            { achievementId: 'stat_launches', tier: 3, value: 20 }
        ]);
        expect(context.uiController.updateMailStatus).toHaveBeenCalledWith(0, 'T', false);
        expect(updatedStory).toEqual({ id: 'T', type: 'T', isUnread: false });
    });

    it('opens a story card without re-reading an already read story', () => {
        context.storySystem.getStoryStatus.mockReturnValue([
            { id: 'T', type: 'T', isUnread: false }
        ]);

        context.controller.handleStoryOpen('T');

        expect(context.uiController.showStoryModal).toHaveBeenCalledWith('T');
        expect(context.storySystem.updateReadStatus).not.toHaveBeenCalled();
        expect(context.achievementTracker.evaluateAchievements).not.toHaveBeenCalled();
        expect(context.uiController.updateMailStatus).toHaveBeenCalledWith(0, 'T', false);
    });

    it('shows and marks the sector arrival story read when entering sector 25 from sector 24', async () => {
        context.sessionState.sectorNumber = 24;
        context.storySystem.getSectorArrivalStoryId.mockReturnValue('HOME25');
        context.achievementTracker.evaluateAchievements.mockReturnValue([
            { achievementId: 'stat_stories_read', tier: 1, value: 40 }
        ]);

        await context.controller.beginSectorTransition();

        expect(context.storySystem.getSectorArrivalStoryId).toHaveBeenCalledWith(24, 25);
        expect(context.uiController.showSectorTitle).toHaveBeenCalledWith(25, true, { type: 'home' });
        expect(context.uiController.showStoryModal).toHaveBeenCalledWith('HOME25');
        expect(context.storySystem.updateReadStatus).toHaveBeenCalledWith('HOME25');
        expect(context.achievementTracker.evaluateAchievements).toHaveBeenCalledWith({
            source: 'story_read',
            keys: ['total']
        });
        expect(context.uiController.showAchievementToasts).toHaveBeenCalledWith([
            { achievementId: 'stat_stories_read', tier: 1, value: 40 }
        ]);
        expect(context.uiController.updateMailStatus).not.toHaveBeenCalledWith(expect.any(Number), 'HOME', expect.any(Boolean));
    });

    it('refreshes the current build screen after language resources change', () => {
        context.uiController.showBuildScreen.mockClear();

        const viewData = context.controller.refreshCurrentView();

        expect(context.uiController.showBuildScreen).toHaveBeenCalledWith(viewData);
        expect(viewData.sections.chassis.entries[0].itemViewData.name).toBe('Light Hull');
    });

    it('refreshes the current facility screen after language resources change', () => {
        context.controller.enterFacility('TRADING_POST');
        context.uiController.showFacilityScreen.mockClear();
        context.uiController.setFacilityActionHandler.mockClear();
        context.uiController.setFacilityDepartHandler.mockClear();

        const viewData = context.controller.refreshCurrentView();

        expect(context.uiController.showFacilityScreen).toHaveBeenCalledWith(
            'TRADING_POST',
            viewData,
            expect.any(Object),
            { collapseBuildPanel: false }
        );
        expect(context.uiController.setFacilityActionHandler).toHaveBeenCalledTimes(1);
        expect(context.uiController.setFacilityDepartHandler).toHaveBeenCalledTimes(1);
    });

    it('notifies tutorial triggers when entering facilities', () => {
        context.controller.enterFacility('TRADING_POST');
        context.controller.enterFacility('REPAIR_DOCK');
        context.controller.enterFacility('BLACK_MARKET');

        expect(context.tutorialFlowController.checkTrigger).toHaveBeenCalledWith(
            'facilityTradingPost',
            { currentScene: 'facility', facilityType: 'TRADING_POST' }
        );
        expect(context.tutorialFlowController.checkTrigger).toHaveBeenCalledWith(
            'facilityRepairDock',
            { currentScene: 'facility', facilityType: 'REPAIR_DOCK' }
        );
        expect(context.tutorialFlowController.checkTrigger).toHaveBeenCalledWith(
            'facilityBlackMarket',
            { currentScene: 'facility', facilityType: 'BLACK_MARKET' }
        );
    });

    it('renders the world when the flight result map view is opened', async () => {
        await context.controller.start();
        const handler = context.uiController.setMapToggleHandler.mock.calls.at(-1)[0];
        context.worldRenderer.render.mockClear();

        handler(true);
        handler(false);

        expect(context.worldRenderer.render).toHaveBeenCalledTimes(1);
    });

    it('slows the game-end exit warp before returning to title', async () => {
        await context.controller.returnToTitle();

        expect(context.worldRenderer.stopWarpEffect).toHaveBeenCalledWith(1600, { fromCurrent: true });
        expect(context.appOrchestrator.returnToTitle).toHaveBeenCalledTimes(1);
    });

    it('delegates build item selection to BuildFlowController', async () => {
        await context.controller.start();
        const handler = context.uiController.setBuildItemSelectionHandler.mock.calls.at(-1)[0];

        handler({ category: 'launcher', uid: 'stack_launcher' });

        expect(context.controller.buildFlowController.currentBuildSelection.launcher).toBe('stack_launcher');
    });

    it('resolves tutorial canvas targets from the current sector and camera', () => {
        const resolver = context.tutorialFlowController.setCanvasTargetResolver.mock.calls.at(-1)[0];

        const rect = resolver({ targetType: 'exit-arc' });

        expect(rect.left).toBeCloseTo(580.856);
        expect(rect.top).toBeCloseTo(408.5);
        expect(rect.width).toBeGreaterThan(24);
        expect(rect.height).toBeGreaterThan(24);
    });

    it('resolves tutorial canvas targets through the renderer transform used for map drawing', () => {
        const resolver = context.tutorialFlowController.setCanvasTargetResolver.mock.calls.at(-1)[0];
        context.worldRenderer.worldToViewport.mockImplementation(point => ({
            x: point.x * 2 + 100,
            y: point.y * 2 + 200
        }));

        const rect = resolver({ targetType: 'home-star' });

        expect(context.worldRenderer.worldToViewport).toHaveBeenCalledWith({ x: 0, y: 0 });
        expect(context.worldRenderer.worldToViewport).toHaveBeenCalledWith({ x: 40, y: 0 });
        expect(rect).toEqual({
            left: 20,
            top: 120,
            width: 160,
            height: 160
        });
    });

    it('centers circular tutorial canvas targets on the rendered world point', () => {
        const resolver = context.tutorialFlowController.setCanvasTargetResolver.mock.calls.at(-1)[0];
        const renderedHomeCenter = { x: 240, y: 320 };
        context.worldRenderer.worldToViewport.mockImplementation(point => (
            point.x === 0 && point.y === 0
                ? renderedHomeCenter
                : {
                    x: point.x * 2 + 240,
                    y: point.y * 2 + 320
                }
        ));

        const rect = resolver({ targetType: 'home-star' });

        expect(context.worldRenderer.worldToViewport).toHaveBeenCalledWith({ x: 0, y: 0 });
        expect(rect.left + rect.width / 2).toBe(renderedHomeCenter.x);
        expect(rect.top + rect.height / 2).toBe(renderedHomeCenter.y);
    });

    it('resolves tutorial canvas focus bounds in world coordinates', () => {
        const resolver = context.tutorialFlowController.setCanvasFocusBoundsResolver.mock.calls.at(-1)[0];

        const bounds = resolver({ targetType: 'exit-arc' });

        expect(bounds.left).toBeCloseTo(279.711);
        expect(bounds.top).toBeCloseTo(115);
        expect(bounds.width).toBe(220);
        expect(bounds.height).toBe(220);
    });

    it('resolves each tutorial canvas focus target in world coordinates', () => {
        const resolver = context.tutorialFlowController.setCanvasFocusBoundsResolver.mock.calls.at(-1)[0];
        context.currentSector.bodies.push({
            isHome: false,
            radius: 20,
            position: { x: 100, y: 0 }
        });
        context.controller.buildFlowController.currentBuildSelection = {
            rocket: 'stack_rocket_ready',
            launcher: 'stack_launcher_ready'
        };

        expect(resolver({ targetType: 'aim-preview-rocket' })).toEqual({
            left: -8,
            top: -60,
            width: 120,
            height: 120
        });
        expect(resolver({ targetType: 'prediction-line' })).toEqual({
            left: 0,
            top: 0,
            width: 120,
            height: 120
        });
        expect(resolver({ targetType: 'home-star' })).toEqual({
            left: -40,
            top: -40,
            width: 80,
            height: 80
        });
        expect(resolver({ targetType: 'hover-star' })).toEqual({
            left: 80,
            top: -20,
            width: 40,
            height: 40
        });
    });

    it('keeps tutorial canvas target rects separate from focus bounds', () => {
        const targetResolver = context.tutorialFlowController.setCanvasTargetResolver.mock.calls.at(-1)[0];
        const focusResolver = context.tutorialFlowController.setCanvasFocusBoundsResolver.mock.calls.at(-1)[0];

        const target = targetResolver({ targetType: 'home-star' });
        const focus = focusResolver({ targetType: 'home-star' });

        expect(target.left).not.toBe(focus.left);
        expect(target.top).not.toBe(focus.top);
        expect(target.left).toBeGreaterThan(300);
        expect(focus.left).toBeLessThan(0);
    });

    it('keeps circular tutorial canvas targets round when the camera is rotated', () => {
        const resolver = context.tutorialFlowController.setCanvasTargetResolver.mock.calls.at(-1)[0];
        const angle = Math.PI / 4;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        context.cameraController.toScreen.mockImplementation(point => ({
            x: (point.x * cos - point.y * sin) * 2 + 400,
            y: (point.x * sin + point.y * cos) * 2 + 300
        }));

        const rect = resolver({ targetType: 'home-star' });

        expect(rect.width).toBeCloseTo(rect.height);
        expect(rect.width).toBeGreaterThan(160);
    });

    it('notifies tutorial triggers when build tabs become active', async () => {
        await context.controller.start();
        const handler = context.uiController.setBuildTabChangeHandler.mock.calls.at(-1)[0];

        handler('assembly');
        handler('flight');

        expect(context.tutorialFlowController.checkTrigger).toHaveBeenCalledWith(
            'assemblyTabReady',
            { currentScene: 'build' }
        );
        expect(context.tutorialFlowController.checkTrigger).toHaveBeenCalledWith(
            'flightTabReady',
            { currentScene: 'build' }
        );
    });

    it('enters AIM state as soon as rocket and launcher are selected', async () => {
        await context.controller.start();
        const handler = context.uiController.setBuildItemSelectionHandler.mock.calls.at(-1)[0];

        handler({ category: 'rocket', uid: 'stack_rocket_ready' });
        handler({ category: 'launcher', uid: 'stack_launcher_ready' });

        expect(context.worldRenderer.setAimRocket).toHaveBeenCalledWith(expect.objectContaining({
            rocketItem: context.rocketItem,
            launcher: context.readyLauncher,
            position: { x: 52, y: 0 }
        }));
        expect(context.worldRenderer.enableSonar).toHaveBeenCalled();
        expect(context.worldRenderer.setPredictionPath).toHaveBeenCalledWith([
            { x: 52, y: 0 },
            { x: 0, y: 0 },
            { x: 12, y: 24 }
        ]);
        expect(context.tutorialFlowController.checkTrigger).toHaveBeenCalledWith(
            'aimStart',
            { currentScene: 'build' }
        );
    });

    it('launches the selected rocket and captures the launch snapshot', async () => {
        await context.controller.start();
        context.controller.buildFlowController.currentBuildSelection = {
            rocket: 'stack_rocket_ready',
            launcher: 'stack_launcher_ready',
            booster: 'stack_booster_ready'
        };
        context.sessionState.returnBonus = 0.3;
        const handler = context.uiController.setLaunchHandler.mock.calls.at(-1)[0];

        const rocket = handler();

        expect(rocket.rocketItem).toBe(context.rocketItem);
        expect(rocket.launcher).toBe(context.readyLauncher);
        expect(rocket.booster).toBe(context.boosterItem);
        expect(rocket.velocity.x).toBeCloseTo(18.72);
        expect(rocket.velocity.y).toBeCloseTo(0);
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
        expect(context.navigationLoopController.start).toHaveBeenCalledWith({
            rocket,
            sector: context.controller.currentSector,
            onNavigationEnd: expect.any(Function)
        });
        expect(context.controller.buildFlowController.currentBuildSelection.rocket).toBeUndefined();
        expect(context.controller.buildFlowController.currentBuildSelection.launcher).toBeUndefined();
        expect(context.controller.buildFlowController.currentBuildSelection.booster).toBeUndefined();
        const refreshedBuildView = context.uiController.showBuildScreen.mock.calls.at(-1)[0];
        expect(refreshedBuildView.launch.ready).toBe(false);
        expect(refreshedBuildView.sections.rocket.entries).toEqual([]);
        expect(refreshedBuildView.sections.launcher.entries).toHaveLength(2);
    });

    it('consumes a one-shot booster without wearing the launcher when it prevents launcher wear', async () => {
        const powerBlade = {
            uid: 'booster_power_blade',
            category: 'booster',
            charges: 0,
            maxCharges: 0,
            power: 0,
            powerMultiplier: 1.3,
            preventsLauncherWear: true,
            consumeCharge: vi.fn(amount => {
                powerBlade.charges = Math.max(0, powerBlade.charges - amount);
                return powerBlade.charges;
            }),
            getViewData: vi.fn(() => ({
                uid: 'booster_power_blade',
                id: 'boost_power',
                name: '高出力パワーブレード',
                category: 'booster',
                stats: {}
            })),
            createSnapshot: vi.fn(() => ({
                uid: 'booster_power_blade',
                id: 'boost_power',
                charges: powerBlade.charges,
                enhancements: {}
            }))
        };
        context.sessionState.inventory.stacks.push({
            uid: 'stack_power_blade',
            representative: powerBlade,
            items: [powerBlade],
            count: 1,
            getViewData: vi.fn(() => ({
                ...powerBlade.getViewData(),
                uid: 'stack_power_blade',
                count: 1
            }))
        });
        await context.controller.start();
        context.controller.buildFlowController.currentBuildSelection = {
            rocket: 'stack_rocket_ready',
            launcher: 'stack_launcher_ready',
            booster: 'stack_power_blade'
        };

        const rocket = context.controller.launchSelectedRocket();

        expect(rocket.booster).toBe(powerBlade);
        expect(context.readyLauncher.consumeCharge).not.toHaveBeenCalled();
        expect(context.sessionState.inventory.addItem).toHaveBeenCalledWith(context.readyLauncher);
        expect(context.sessionState.inventory.addItem).not.toHaveBeenCalledWith(powerBlade);
        expect(context.sessionState.inventory.stacks.some(stack => stack.representative === powerBlade)).toBe(false);
    });

    it('exposes inconsistent launch operations while required flight parts are not selected', async () => {
        await context.controller.start();

        expect(() => context.controller.launchSelectedRocket())
            .toThrow('[LaunchSelectionFactory] rocket and launcher selections are required.');
        expect(context.flightRecorder.captureLaunchSnapshot).not.toHaveBeenCalled();
        expect(context.uiController.setFlightMode).not.toHaveBeenCalledWith(true);
        expect(context.worldRenderer.startNavigation).not.toHaveBeenCalled();
        expect(context.navigationLoopController.start).not.toHaveBeenCalled();
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

    it('shows star item info when hovering over a body that holds items', async () => {
        const item = {
            id: 'coin_100',
            uid: 'coin_1',
            category: 'coin',
            equals: vi.fn(candidate => candidate.id === 'coin_100'),
            getViewData: vi.fn(() => ({
                id: 'coin_100',
                uid: 'coin_1',
                name: '100c Coin',
                category: 'coin',
                stats: {}
            }))
        };
        context.currentSector.bodies.push({
            isHome: false,
            radius: 20,
            position: { x: 100, y: 0 },
            items: [item]
        });
        context.cameraController.toWorld.mockReturnValue({ x: 100, y: 0 });
        await context.controller.start();

        context.controller.handleCanvasInput({
            type: 'hover',
            point: { x: 500, y: 240 },
            displayPoint: { x: 250, y: 120 }
        });

        expect(context.uiController.showStarInfo).toHaveBeenCalledWith(
            context.controller.currentSector.bodies.at(-1),
            { x: 250, y: 120 }
        );
    });

    it('shows star item info when a touch pointer taps an item-bearing body', async () => {
        const item = {
            id: 'coin_100',
            uid: 'coin_1',
            category: 'coin',
            equals: vi.fn(candidate => candidate.id === 'coin_100'),
            getViewData: vi.fn(() => ({
                id: 'coin_100',
                uid: 'coin_1',
                name: '100c Coin',
                category: 'coin',
                stats: {}
            }))
        };
        context.currentSector.bodies.push({
            isHome: false,
            radius: 20,
            position: { x: 100, y: 0 },
            items: [item]
        });
        context.cameraController.toWorld.mockReturnValue({ x: 100, y: 0 });
        await context.controller.start();

        context.controller.handleCanvasInput({
            type: 'pointerdown',
            pointerType: 'touch',
            point: { x: 500, y: 240 },
            displayPoint: { x: 250, y: 120 }
        });

        expect(context.uiController.showStarInfo).toHaveBeenCalledWith(
            context.controller.currentSector.bodies.at(-1),
            { x: 250, y: 120 }
        );
        expect(context.cameraController.pan).not.toHaveBeenCalled();
        expect(context.cameraController.rotate).not.toHaveBeenCalled();
    });

    it('hides star item info when hover leaves item-bearing bodies', async () => {
        await context.controller.start();
        context.cameraController.toWorld.mockReturnValue({ x: 400, y: 0 });

        context.controller.handleCanvasInput({
            type: 'hover',
            point: { x: 500, y: 240 }
        });
        context.controller.handleCanvasInput({ type: 'hoverleave' });

        expect(context.uiController.hideStarInfo).toHaveBeenCalledTimes(2);
    });

    it('shows delivery cargo guidance when hovering over a matching exit cargo icon', async () => {
        const item = {
            id: 'cargo_safe',
            name: '通商物資',
            category: 'cargo',
            deliveryGoalId: 'TRADING_POST',
            getViewData: vi.fn(() => ({
                id: 'cargo_safe',
                uid: 'cargo_1',
                name: '通商物資',
                category: 'cargo',
                deliveryGoalId: 'TRADING_POST',
                stats: {}
            }))
        };
        context.cameraController.toWorld.mockReturnValue({ x: 985, y: 0 });
        await context.controller.start();
        context.controller.currentSector.exits = [
            {
                angle: 0,
                width: 60,
                radius: 900,
                getFacilityType: () => 'TRADING_POST'
            }
        ];
        context.controller.currentSector.bodies.push({
            isHome: false,
            radius: 20,
            position: { x: 100, y: 0 },
            items: [item]
        });

        context.controller.handleCanvasInput({
            type: 'hover',
            point: { x: 500, y: 240 },
            displayPoint: { x: 250, y: 120 }
        });

        expect(context.uiController.showDeliveryCargoInfo).toHaveBeenCalledWith(
            {
                facilityType: 'TRADING_POST',
                itemId: 'cargo_safe'
            },
            { x: 250, y: 120 }
        );
        expect(context.uiController.showStarInfo).not.toHaveBeenCalled();
    });

    it('shows delivery cargo guidance when a touch pointer taps a matching exit cargo icon', async () => {
        const item = {
            id: 'cargo_safe',
            name: '通商物資',
            category: 'cargo',
            deliveryGoalId: 'TRADING_POST',
            getViewData: vi.fn(() => ({
                id: 'cargo_safe',
                uid: 'cargo_1',
                name: '通商物資',
                category: 'cargo',
                deliveryGoalId: 'TRADING_POST',
                stats: {}
            }))
        };
        context.cameraController.toWorld.mockReturnValue({ x: 985, y: 0 });
        await context.controller.start();
        context.controller.currentSector.exits = [
            {
                angle: 0,
                width: 60,
                radius: 900,
                getFacilityType: () => 'TRADING_POST'
            }
        ];
        context.controller.currentSector.bodies.push({
            isHome: false,
            radius: 20,
            position: { x: 100, y: 0 },
            items: [item]
        });

        context.controller.handleCanvasInput({
            type: 'pointerdown',
            pointerType: 'touch',
            point: { x: 500, y: 240 },
            displayPoint: { x: 250, y: 120 }
        });

        expect(context.uiController.showDeliveryCargoInfo).toHaveBeenCalledWith(
            {
                facilityType: 'TRADING_POST',
                itemId: 'cargo_safe'
            },
            { x: 250, y: 120 }
        );
        expect(context.cameraController.pan).not.toHaveBeenCalled();
        expect(context.cameraController.rotate).not.toHaveBeenCalled();
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

    it('updates launch angle from AIM input and launches from the home launch offset', async () => {
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
        expect(rocket.position.y).toBeCloseTo(52);
        expect(context.worldRenderer.setPredictionPath).toHaveBeenCalled();
    });

    it('updates the predicted trajectory during AIM without consuming selected flight parts', async () => {
        await context.controller.start();
        context.sessionState.returnBonus = 0.2;
        context.controller.buildFlowController.currentBuildSelection = {
            rocket: 'stack_rocket_ready',
            launcher: 'stack_launcher_ready',
            booster: 'stack_booster_ready'
        };

        context.controller.handleCanvasInput({
            type: 'pointerdown',
            point: { x: 40, y: 0 }
        });

        expect(context.trajectoryPredictor.predictPath).toHaveBeenCalledWith(
            expect.objectContaining({
                rocketItem: context.rocketItem,
                launcher: context.readyLauncher,
                booster: context.boosterItem,
                position: { x: 52, y: 0 },
                velocity: expect.objectContaining({ x: expect.closeTo(17.28) })
            }),
            context.controller.currentSector
        );
        expect(context.worldRenderer.setAimRocket).toHaveBeenCalledWith(expect.objectContaining({
            rocketItem: context.rocketItem,
            launcher: context.readyLauncher,
            booster: context.boosterItem,
            position: { x: 52, y: 0 }
        }));
        expect(context.worldRenderer.enableSonar).toHaveBeenCalled();
        expect(context.worldRenderer.setPredictionPath).toHaveBeenCalledWith([
            { x: 52, y: 0 },
            { x: 0, y: 0 },
            { x: 12, y: 24 }
        ]);
        expect(context.sessionState.inventory.popItemByUid).not.toHaveBeenCalledWith('stack_rocket_ready');
        expect(context.sessionState.inventory.popItemByUid).not.toHaveBeenCalledWith('stack_launcher_ready');
        expect(context.sessionState.inventory.popItemByUid).not.toHaveBeenCalledWith('stack_booster_ready');
    });

    it('rejects AIM prediction results that contain no trail points', async () => {
        await context.controller.start();
        context.trajectoryPredictor.predictPath.mockReturnValue({ actualTrail: [] });
        context.controller.buildFlowController.currentBuildSelection = {
            rocket: 'stack_rocket_ready',
            launcher: 'stack_launcher_ready'
        };

        expect(() => context.controller.handleCanvasInput({
            type: 'pointerdown',
            point: { x: 40, y: 0 }
        })).toThrow('[MapInteractionController] AIM-ready prediction must return at least one trail point.');
    });
});
