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
        expect(context.uiController.setGameEndReturnHandler).toHaveBeenCalled();
        expect(context.uiController.setBuildItemSelectionHandler).toHaveBeenCalled();
        expect(context.uiController.setBuildAssembleHandler).toHaveBeenCalled();
        expect(context.uiController.setLaunchHandler).toHaveBeenCalled();
        expect(context.uiController.setCanvasInputHandler).toHaveBeenCalled();
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

        expect(context.worldRenderer.stopGameEndExitAnimation).toHaveBeenCalledTimes(1);
        expect(context.appOrchestrator.returnToTitle).toHaveBeenCalledTimes(1);
    });

    it('delegates build item selection to BuildFlowController', async () => {
        await context.controller.start();
        const handler = context.uiController.setBuildItemSelectionHandler.mock.calls.at(-1)[0];

        handler({ category: 'launcher', uid: 'stack_launcher' });

        expect(context.controller.buildFlowController.currentBuildSelection.launcher).toBe('stack_launcher');
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
            .toThrow('[GameController] rocket and launcher selections are required.');
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
        })).toThrow('[GameController] AIM-ready prediction must return at least one trail point.');
    });
});
