import { describe, it, expect, vi } from 'vitest';
import NavigationLoopController from '../../../../src/systems/logic/NavigationLoopController.js';

function createController(overrides = {}) {
    const physicsEngine = {
        step: vi.fn(() => ({
            ticks: 1,
            collision: null,
            avoidance: null
        }))
    };
    const uiController = {
        updateHUDValue: vi.fn(),
        updateNavigationProbe: vi.fn()
    };
    const worldRenderer = {
        render: vi.fn()
    };
    const requestFrame = vi.fn(callback => {
        requestFrame.callback = callback;
        return 1;
    });
    const cancelFrame = vi.fn();
    const controller = new NavigationLoopController({
        physicsEngine,
        gameDataRepository: {
            getMasterConfig: vi.fn(() => ({
                simulationTickSeconds: 0.002
            }))
        },
        uiController,
        worldRenderer,
        requestFrame,
        cancelFrame,
        ...overrides
    });

    return {
        controller,
        physicsEngine,
        uiController,
        worldRenderer,
        requestFrame,
        cancelFrame,
        rocket: { id: 'rocket' },
        sector: { id: 'sector' }
    };
}

describe('NavigationLoopController', () => {
    it('requires a PhysicsEngine dependency', () => {
        expect(() => new NavigationLoopController()).toThrow('[NavigationLoopController] physicsEngine is required.');
    });

    it('starts the frame loop and advances physics with the same fixed timestep accumulator as v1', () => {
        const context = createController();

        context.controller.start({
            rocket: context.rocket,
            sector: context.sector,
            onNavigationEnd: vi.fn()
        });
        context.requestFrame.callback(16);

        expect(context.physicsEngine.step).toHaveBeenCalledWith(context.rocket, context.sector);
        expect(context.physicsEngine.step).toHaveBeenCalledTimes(8);
        expect(context.uiController.updateHUDValue).toHaveBeenCalledWith('score', 1);
        expect(context.worldRenderer.render).toHaveBeenCalled();
        expect(context.requestFrame).toHaveBeenCalledTimes(2);
    });

    it('caps accumulated physics steps per frame', () => {
        const context = createController();

        context.controller.start({
            rocket: context.rocket,
            sector: context.sector,
            onNavigationEnd: vi.fn()
        });
        const steps = context.controller.advance(1);

        expect(steps).toBe(30);
        expect(context.physicsEngine.step).toHaveBeenCalledTimes(30);
    });

    it('reports navigation probe metrics so frame-rate driven slowdown can be measured', () => {
        const context = createController();

        context.controller.start({
            rocket: context.rocket,
            sector: context.sector,
            onNavigationEnd: vi.fn()
        });
        context.controller.advance(1 / 30);

        expect(context.uiController.updateNavigationProbe).toHaveBeenCalledWith(expect.objectContaining({
            fps: 30,
            tickProgressRate: 0.96,
            lastExpectedSteps: expect.closeTo(16.666, 2),
            lastSteps: 16,
            maxStepsPerFrame: 30,
            cappedFrames: 0,
            frames: 1
        }));
    });

    it('stops the loop and reports navigation end when physics returns a collision', () => {
        const collision = { type: 'arc' };
        const context = createController({
            physicsEngine: {
                step: vi.fn(() => ({
                    ticks: 8,
                    collision,
                    avoidance: null
                }))
            }
        });
        const onNavigationEnd = vi.fn();

        context.controller.start({
            rocket: context.rocket,
            sector: context.sector,
            onNavigationEnd
        });
        const result = context.controller.step();

        expect(result.collision).toBe(collision);
        expect(onNavigationEnd).toHaveBeenCalledWith(collision);
        expect(context.uiController.updateHUDValue).toHaveBeenCalledWith('score', 8);
        expect(context.cancelFrame).toHaveBeenCalledWith(1);
        expect(context.controller.isRunning()).toBe(false);
    });

    it('requires rocket, sector, and navigation end callback at start', () => {
        const context = createController();

        expect(() => context.controller.start({
            rocket: context.rocket,
            sector: context.sector
        })).toThrow('[NavigationLoopController] onNavigationEnd is required.');
        expect(() => context.controller.start({
            rocket: null,
            sector: context.sector,
            onNavigationEnd: vi.fn()
        })).toThrow('[NavigationLoopController] rocket and sector are required.');
    });
});
