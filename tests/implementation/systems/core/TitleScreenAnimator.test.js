import { describe, it, expect, vi } from 'vitest';
import TitleScreenAnimator from '../../../../src/systems/core/TitleScreenAnimator.js';

function createContext() {
    return {
        canvas: { width: 800, height: 600 },
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        arc: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        closePath: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
    };
}

function createCanvas(context) {
    return {
        width: 0,
        height: 0,
        clientWidth: 800,
        clientHeight: 600,
        getContext: vi.fn(() => context)
    };
}

describe('TitleScreenAnimator', () => {
    it('uses an existing shared BackgroundManager without reinitializing stars', () => {
        const bgContext = createContext();
        const fgContext = createContext();
        const backgroundManager = {
            stars: [{ x: 1 }],
            initialize: vi.fn(),
            handleResize: vi.fn(),
            update: vi.fn(),
            render: vi.fn()
        };
        const animator = new TitleScreenAnimator({
            requestAnimationFrame: vi.fn(),
            cancelAnimationFrame: vi.fn(),
            now: () => 1000
        });

        animator.initialize({
            background: createCanvas(bgContext),
            foreground: createCanvas(fgContext)
        }, backgroundManager);
        animator.render(0.016, 1016);

        expect(backgroundManager.initialize).not.toHaveBeenCalled();
        expect(backgroundManager.update).toHaveBeenCalledWith(0.016);
        expect(backgroundManager.render).toHaveBeenCalledWith(bgContext, expect.objectContaining({
            width: 800,
            height: 600,
            rotation: 0,
            offset: { x: 0, y: 0 },
            zoomLevel: 1,
            timestamp: 1016
        }));
    });

    it('initializes the shared BackgroundManager only when stars are empty', () => {
        const backgroundManager = {
            stars: [],
            initialize: vi.fn(),
            handleResize: vi.fn(),
            update: vi.fn(),
            render: vi.fn()
        };
        const animator = new TitleScreenAnimator();

        animator.initialize({
            background: createCanvas(createContext()),
            foreground: createCanvas(createContext())
        }, backgroundManager);

        expect(backgroundManager.initialize).toHaveBeenCalledWith(expect.objectContaining({
            width: 800,
            height: 600
        }));
    });

    it('starts only one animation loop and cancels it on stop', () => {
        const requestAnimationFrame = vi.fn(() => 42);
        const cancelAnimationFrame = vi.fn();
        const backgroundManager = {
            stars: [{ x: 1 }],
            initialize: vi.fn(),
            handleResize: vi.fn(),
            update: vi.fn(),
            render: vi.fn()
        };
        const animator = new TitleScreenAnimator({
            requestAnimationFrame,
            cancelAnimationFrame,
            now: () => 1000
        });
        animator.initialize({
            background: createCanvas(createContext()),
            foreground: createCanvas(createContext())
        }, backgroundManager);

        animator.start();
        animator.start();
        animator.stop();

        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
        expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
    });

    it('keeps the orbit inside the title viewport and uses the opposite diagonal tilt', () => {
        const bgContext = createContext();
        const fgContext = createContext();
        const backgroundManager = {
            stars: [{ x: 1 }],
            initialize: vi.fn(),
            handleResize: vi.fn(),
            update: vi.fn(),
            render: vi.fn()
        };
        const animator = new TitleScreenAnimator({
            now: () => 1000,
            colorPalette: {
                get: vi.fn(() => '#ffffff'),
                createWorldColors: vi.fn(() => ({ categories: { cargo: '#607d8b' } }))
            }
        });
        animator.initialize({
            background: createCanvas(bgContext),
            foreground: createCanvas(fgContext)
        }, backgroundManager);

        animator.phase = 0;
        animator.render(0, 1000);
        const rightEdge = [
            ...bgContext.translate.mock.calls,
            ...fgContext.translate.mock.calls
        ].at(-1);
        expect(rightEdge[0]).toBeGreaterThan(400);
        expect(rightEdge[1]).toBeLessThan(300);

        for (let index = 0; index < 240; index += 1) {
            animator.render(1 / 60, 1000 + index * 16);
        }

        const positions = [
            ...bgContext.translate.mock.calls,
            ...fgContext.translate.mock.calls
        ];
        expect(positions.length).toBeGreaterThan(0);
        positions.forEach(([x, y]) => {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(800);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(600);
        });

        expect(positions.some(([x, y]) => x > 400 && y < 300)).toBe(true);
    });

    it('uses the same trail color token as the game flight visuals', () => {
        const colorPalette = {
            get: vi.fn(name => (name === 'trail' ? 'token-trail' : 'token-rocket')),
            createWorldColors: vi.fn(() => ({ categories: { cargo: 'token-cargo' } }))
        };
        const bgContext = createContext();
        const fgContext = createContext();
        const animator = new TitleScreenAnimator({ colorPalette });
        animator.initialize({
            background: createCanvas(bgContext),
            foreground: createCanvas(fgContext)
        }, {
            stars: [{ x: 1 }],
            initialize: vi.fn(),
            handleResize: vi.fn(),
            update: vi.fn(),
            render: vi.fn()
        });

        animator.render(1 / 60, 1000);
        animator.render(1 / 60, 1016);

        expect(colorPalette.get).toHaveBeenCalledWith('trail');
        expect(bgContext.strokeStyle).toBe('token-trail');
    });

    it('draws the rocket body centered on the trail endpoint like v1', () => {
        const bgContext = createContext();
        const fgContext = createContext();
        const animator = new TitleScreenAnimator({
            colorPalette: {
                get: vi.fn(() => '#ffffff'),
                createWorldColors: vi.fn(() => ({ categories: { cargo: '#607d8b' } }))
            }
        });
        animator.initialize({
            background: createCanvas(bgContext),
            foreground: createCanvas(fgContext)
        }, {
            stars: [{ x: 1 }],
            initialize: vi.fn(),
            handleResize: vi.fn(),
            update: vi.fn(),
            render: vi.fn()
        });

        animator.phase = 0;
        animator.render(0, 1000);

        const rocketTranslate = [
            ...bgContext.translate.mock.calls,
            ...fgContext.translate.mock.calls
        ].at(-1);
        const latestPoint = animator.trail.at(-1);

        expect(rocketTranslate).toEqual([latestPoint.x, latestPoint.y]);
    });

    it('orients the title rocket along the actual screen-space movement', () => {
        const bgContext = createContext();
        const fgContext = createContext();
        const animator = new TitleScreenAnimator({
            colorPalette: {
                get: vi.fn(() => '#ffffff'),
                createWorldColors: vi.fn(() => ({ categories: { cargo: '#607d8b' } }))
            }
        });
        animator.initialize({
            background: createCanvas(bgContext),
            foreground: createCanvas(fgContext)
        }, {
            stars: [{ x: 1 }],
            initialize: vi.fn(),
            handleResize: vi.fn(),
            update: vi.fn(),
            render: vi.fn()
        });

        animator.render(1 / 60, 1000);
        animator.render(1 / 60, 1016);

        const previous = animator.trail.at(-2);
        const current = animator.trail.at(-1);
        const expectedAngle = Math.atan2(current.y - previous.y, current.x - previous.x);
        const actualAngle = [
            ...bgContext.rotate.mock.calls,
            ...fgContext.rotate.mock.calls
        ].at(-1)[0];

        expect(actualAngle).toBeCloseTo(expectedAngle, 5);
    });

    it('uses the compact v1 title rocket silhouette and cargo size', () => {
        const bgContext = createContext();
        const fgContext = createContext();
        const animator = new TitleScreenAnimator({
            colorPalette: {
                get: vi.fn(() => '#ffffff'),
                createWorldColors: vi.fn(() => ({ categories: { cargo: '#607d8b' } }))
            }
        });
        animator.initialize({
            background: createCanvas(bgContext),
            foreground: createCanvas(fgContext)
        }, {
            stars: [{ x: 1 }],
            initialize: vi.fn(),
            handleResize: vi.fn(),
            update: vi.fn(),
            render: vi.fn()
        });

        for (let index = 0; index < 5; index += 1) {
            animator.render(1 / 60, 1000 + index * 16);
        }

        const contexts = [bgContext, fgContext];
        expect(contexts.some(context => context.moveTo.mock.calls.some(call => call[0] === 10 && call[1] === 0))).toBe(true);
        expect(contexts.some(context => context.lineTo.mock.calls.some(call => call[0] === -6 && call[1] === 5))).toBe(true);
        expect(contexts.some(context => context.lineTo.mock.calls.some(call => call[0] === -6 && call[1] === -5))).toBe(true);
        expect(contexts.some(context => context.arc.mock.calls.some(call => call[2] === 3))).toBe(true);
    });
});
