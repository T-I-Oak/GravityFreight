import { describe, it, expect, vi } from 'vitest';
import CameraController from '../../../../src/systems/core/CameraController.js';
import TutorialCameraFocusController from '../../../../src/systems/logic/TutorialCameraFocusController.js';

describe('TutorialCameraFocusController', () => {
    function createContext() {
        const cameraController = {
            getState: vi.fn(() => ({ position: { x: 10, y: 20 }, rotation: 0.5, zoomLevel: 0.8 })),
            calculateFocusState: vi.fn(() => ({ position: { x: 75, y: 65 }, rotation: 0.5, zoomLevel: 2 })),
            applyState: vi.fn()
        };
        const mapInteractionController = {
            setInputLocked: vi.fn()
        };
        const worldRenderer = {
            render: vi.fn()
        };
        const worldBoundsResolver = vi.fn(highlight => ({
            left: highlight.targetType === 'home-star' ? -50 : 100,
            top: highlight.targetType === 'home-star' ? -40 : 80,
            width: 100,
            height: 90
        }));

        return {
            cameraController,
            mapInteractionController,
            worldRenderer,
            worldBoundsResolver,
            controller: new TutorialCameraFocusController({
                cameraController,
                mapInteractionController,
                worldRenderer,
                worldBoundsResolver,
                transitionDurationMs: 0
            })
        };
    }

    it('does not lock map input just because a tutorial scenario starts', () => {
        const context = createContext();

        context.controller.beginScenario();

        expect(context.mapInteractionController.setInputLocked).not.toHaveBeenCalled();
    });

    it('does not lock map input for DOM-only tutorial pages', async () => {
        const context = createContext();

        context.controller.beginScenario();
        const focused = await context.controller.focusPage({ highlights: [{ elementId: 'assembly-inventory-list' }] });

        expect(focused).toBe(false);
        expect(context.mapInteractionController.setInputLocked).not.toHaveBeenCalled();
    });

    it('focuses merged world bounds and locks map input for canvas tutorial pages', async () => {
        const context = createContext();

        context.controller.beginScenario();
        const focused = await context.controller.focusPage({
            highlights: [
                { targetType: 'home-star' },
                { targetType: 'exit-arc' }
            ]
        });

        expect(focused).toBe(true);
        expect(context.cameraController.getState).toHaveBeenCalledTimes(1);
        expect(context.mapInteractionController.setInputLocked).toHaveBeenCalledWith(true);
        expect(context.cameraController.calculateFocusState).toHaveBeenCalledWith(
            { left: -50, top: -40, width: 250, height: 210 },
            { padding: 120 }
        );
        expect(context.cameraController.applyState).toHaveBeenCalledWith({
            position: { x: 75, y: 65 },
            rotation: 0.5,
            zoomLevel: 2
        });
        expect(context.worldRenderer.render).toHaveBeenCalledTimes(1);
    });

    it('restores the original camera state and unlocks input when the tutorial scenario ends', async () => {
        const context = createContext();

        context.controller.beginScenario();
        await context.controller.focusPage({ highlights: [{ targetType: 'home-star' }] });
        const restored = await context.controller.endScenario();

        expect(restored).toBe(true);
        expect(context.cameraController.applyState).toHaveBeenCalledWith({
            position: { x: 10, y: 20 },
            rotation: 0.5,
            zoomLevel: 0.8
        });
        expect(context.mapInteractionController.setInputLocked).toHaveBeenLastCalledWith(false);
        expect(context.worldRenderer.render).toHaveBeenCalledTimes(2);
    });

    it('restores camera without unlocking input when a non-canvas tutorial page follows a focused page', async () => {
        const context = createContext();

        context.controller.beginScenario();
        await context.controller.focusPage({ highlights: [{ targetType: 'home-star' }] });
        const focused = await context.controller.focusPage({ highlights: [{ elementId: 'build-btn' }] });

        expect(focused).toBe(false);
        expect(context.cameraController.applyState).toHaveBeenCalledTimes(2);
        expect(context.mapInteractionController.setInputLocked).not.toHaveBeenLastCalledWith(false);
        await context.controller.endScenario();
        expect(context.mapInteractionController.setInputLocked).toHaveBeenLastCalledWith(false);
    });

    it('keeps restore() as an end-of-scenario compatibility alias', async () => {
        const context = createContext();

        context.controller.beginScenario();
        await context.controller.focusPage({ highlights: [{ targetType: 'home-star' }] });
        await context.controller.restore();

        expect(context.mapInteractionController.setInputLocked).toHaveBeenLastCalledWith(false);
    });

    it('animates camera focus before handing control back to the tutorial manager', async () => {
        const frames = [];
        const context = createContext();
        context.cameraController.getState.mockReturnValue({ position: { x: 0, y: 0 }, rotation: 0, zoomLevel: 1 });
        context.controller = new TutorialCameraFocusController({
            cameraController: context.cameraController,
            mapInteractionController: context.mapInteractionController,
            worldRenderer: context.worldRenderer,
            worldBoundsResolver: context.worldBoundsResolver,
            transitionDurationMs: 100,
            requestAnimationFrame: callback => {
                frames.push(callback);
                return frames.length;
            },
            now: () => 0
        });

        const focusPromise = context.controller.focusPage({ highlights: [{ targetType: 'home-star' }] });
        frames.shift()(50);
        expect(context.cameraController.applyState).toHaveBeenLastCalledWith({
            position: { x: 37.5, y: 32.5 },
            rotation: 0.25,
            zoomLevel: 1.5
        });
        frames.shift()(100);
        await focusPromise;

        expect(context.cameraController.applyState).toHaveBeenLastCalledWith({
            position: { x: 75, y: 65 },
            rotation: 0.5,
            zoomLevel: 2
        });
    });

    it('does not request a larger camera zoom when focus padding is increased', async () => {
        const createController = focusPadding => {
            const cameraController = {
                getState: vi.fn(() => ({ position: { x: 0, y: 0 }, rotation: 0, zoomLevel: 0.5 })),
                calculateFocusState: vi.fn((_bounds, options) => ({
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    zoomLevel: Math.max(0.1, Math.min(2, (720 - options.padding * 2) / 220))
                })),
                applyState: vi.fn()
            };
            return {
                cameraController,
                controller: new TutorialCameraFocusController({
                    cameraController,
                    worldRenderer: { render: vi.fn() },
                    worldBoundsResolver: () => ({ left: 280, top: 115, width: 220, height: 220 }),
                    focusPadding,
                    transitionDurationMs: 0
                })
            };
        };
        const compact = createController(120);
        const roomy = createController(200);

        await compact.controller.focusPage({ highlights: [{ targetType: 'exit-arc' }] });
        await roomy.controller.focusPage({ highlights: [{ targetType: 'exit-arc' }] });

        const compactState = compact.cameraController.applyState.mock.calls.at(-1)[0];
        const roomyState = roomy.cameraController.applyState.mock.calls.at(-1)[0];
        expect(roomyState.zoomLevel).toBeLessThanOrEqual(compactState.zoomLevel);
    });

    it('does not increase real camera zoom when focus padding is increased', async () => {
        const createRepository = () => ({
            getSavedCameraState: vi.fn(({ init }) => init()),
            setSavedCameraState: vi.fn(),
            getMasterConfig: vi.fn(() => ({ boundaryRadius: 900 }))
        });
        const createController = focusPadding => {
            const cameraController = new CameraController(createRepository());
            cameraController.initialize();
            cameraController.handleResize(1280, 720);
            return {
                cameraController,
                controller: new TutorialCameraFocusController({
                    cameraController,
                    worldRenderer: { render: vi.fn() },
                    worldBoundsResolver: () => ({ left: 280, top: 115, width: 220, height: 220 }),
                    focusPadding,
                    transitionDurationMs: 0
                })
            };
        };
        const compact = createController(120);
        const roomy = createController(200);

        await compact.controller.focusPage({ highlights: [{ targetType: 'exit-arc' }] });
        await roomy.controller.focusPage({ highlights: [{ targetType: 'exit-arc' }] });

        expect(roomy.cameraController.zoomLevel).toBeLessThanOrEqual(compact.cameraController.zoomLevel);
    });
});
