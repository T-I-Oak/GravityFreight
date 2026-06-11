import { describe, it, expect, vi } from 'vitest';
import WorldRenderer from '../../../../src/systems/core/WorldRenderer.js';

function createCanvas() {
    const context = {
        canvas: null,
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        fillText: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn()
    };
    const canvas = {
        width: 640,
        height: 480,
        clientWidth: 640,
        clientHeight: 480,
        getContext: vi.fn(() => context)
    };
    context.canvas = canvas;
    return { canvas, context };
}

function createFakePixiFactory() {
    const calls = {
        appInit: vi.fn(),
        stageAddChild: vi.fn(),
        containerAddChild: vi.fn(),
        graphics: [],
        texts: []
    };

    class FakeApplication {
        constructor() {
            this.stage = {
                addChild: calls.stageAddChild
            };
        }

        init(options) {
            calls.appInit(options);
            return Promise.resolve();
        }
    }

    class FakeContainer {
        addChild(child) {
            calls.containerAddChild(child);
        }

        removeChildren() {
            calls.containerRemoveChildren?.();
        }
    }

    class FakeGraphics {
        constructor() {
            this.clear = vi.fn(() => this);
            this.rect = vi.fn(() => this);
            this.circle = vi.fn(() => this);
            this.arc = vi.fn(() => this);
            this.fill = vi.fn(() => this);
            this.stroke = vi.fn(() => this);
            this.moveTo = vi.fn(() => this);
            this.lineTo = vi.fn(() => this);
            calls.graphics.push(this);
        }
    }

    class FakeText {
        constructor(options) {
            this.options = options;
            this.anchor = { set: vi.fn() };
            this.position = { set: vi.fn() };
            this.rotation = 0;
            this.alpha = 1;
            calls.texts.push(this);
        }
    }

    return {
        factory: {
            Application: FakeApplication,
            Container: FakeContainer,
            Graphics: FakeGraphics,
            Text: FakeText
        },
        calls
    };
}

describe('WorldRenderer', () => {
    it('initializes PIXI layers and renders a sector snapshot', async () => {
        const { canvas, context } = createCanvas();
        const { factory, calls } = createFakePixiFactory();
        const backgroundManager = {
            initialize: vi.fn(),
            renderPixi: vi.fn(),
            update: vi.fn(),
            handleResize: vi.fn(),
            startWarpEffect: vi.fn(),
            stopWarpEffect: vi.fn()
        };
        const renderer = new WorldRenderer({ backgroundManager, pixiFactory: factory });
        const sector = {
            exits: [
                {
                    angle: 20,
                    width: 60,
                    radius: 900,
                    getFacilityType: () => 'TRADING_POST'
                }
            ],
            bodies: [
                {
                    position: { x: 0, y: 0 },
                    radius: 40,
                    isHome: true,
                    isRepulsion: false,
                    items: [{ category: 'COIN' }]
                }
            ]
        };

        await renderer.initialize(canvas);
        renderer.setSector(sector);

        expect(renderer.targetSector).toBe(sector);
        expect(calls.appInit).toHaveBeenCalledWith(expect.objectContaining({
            canvas,
            backgroundAlpha: 0
        }));
        expect(calls.stageAddChild).toHaveBeenCalledTimes(2);
        expect(backgroundManager.initialize).toHaveBeenCalledWith(expect.objectContaining({ width: 640, height: 480 }));
        expect(backgroundManager.update).toHaveBeenCalled();
        expect(backgroundManager.renderPixi).toHaveBeenCalledWith(
            calls.graphics[0],
            expect.objectContaining({ width: 640, height: 480 })
        );
        expect(calls.graphics.some(graphics => graphics.arc.mock.calls.length > 0)).toBe(true);
        expect(calls.texts.map(text => text.options.text).join('')).toContain('TRADINGPOST');
        expect(context.arc).not.toHaveBeenCalled();
    });

    it('can still render through the explicit Canvas 2D mode', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = {
            initialize: vi.fn(),
            render: vi.fn(),
            update: vi.fn(),
            handleResize: vi.fn(),
            startWarpEffect: vi.fn(),
            stopWarpEffect: vi.fn()
        };
        const renderer = new WorldRenderer({
            backgroundManager,
            renderingMode: 'canvas2d'
        });

        await renderer.initialize(canvas);

        expect(canvas.getContext).toHaveBeenCalledWith('2d');
        expect(backgroundManager.render).toHaveBeenCalledWith(
            context,
            expect.objectContaining({ width: 640, height: 480 })
        );
    });

    it('delegates warp background effects to BackgroundManager', async () => {
        const { canvas } = createCanvas();
        const { factory } = createFakePixiFactory();
        const backgroundManager = {
            initialize: vi.fn(),
            renderPixi: vi.fn(),
            update: vi.fn(),
            handleResize: vi.fn(),
            startWarpEffect: vi.fn(),
            stopWarpEffect: vi.fn()
        };
        const renderer = new WorldRenderer({ backgroundManager, pixiFactory: factory });

        await renderer.initialize(canvas);
        renderer.startWarpEffect();
        renderer.stopWarpEffect();

        expect(backgroundManager.startWarpEffect).toHaveBeenCalled();
        expect(backgroundManager.stopWarpEffect).toHaveBeenCalled();
    });

    it('uses CameraController projection when rendering map objects', async () => {
        const { canvas, context } = createCanvas();
        const { factory, calls } = createFakePixiFactory();
        const backgroundManager = {
            initialize: vi.fn(),
            renderPixi: vi.fn(),
            update: vi.fn(),
            handleResize: vi.fn(),
            startWarpEffect: vi.fn(),
            stopWarpEffect: vi.fn()
        };
        const camera = {
            zoomLevel: 2,
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 100,
                y: point.y + 200
            }))
        };
        const renderer = new WorldRenderer({ backgroundManager, camera, pixiFactory: factory });

        await renderer.initialize(canvas);
        renderer.setSector({
            exits: [],
            bodies: [
                {
                    position: { x: 10, y: 20 },
                    radius: 5,
                    isHome: true,
                    isRepulsion: false,
                    items: []
                }
            ]
        });

        expect(camera.handleResize).toHaveBeenCalledWith(640, 480);
        expect(camera.toScreen).toHaveBeenCalledWith({ x: 10, y: 20 });
        expect(calls.graphics.some(graphics => (
            graphics.circle.mock.calls.some(call => call[0] === 110 && call[1] === 220 && call[2] === 10)
        ))).toBe(true);
        expect(context.arc).not.toHaveBeenCalled();
    });

    it('applies camera rotation to exit arc angles', async () => {
        const { canvas } = createCanvas();
        const { factory, calls } = createFakePixiFactory();
        const backgroundManager = {
            initialize: vi.fn(),
            renderPixi: vi.fn(),
            update: vi.fn(),
            handleResize: vi.fn(),
            startWarpEffect: vi.fn(),
            stopWarpEffect: vi.fn()
        };
        const camera = {
            zoomLevel: 1,
            rotation: Math.PI / 2,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 320,
                y: point.y + 240
            }))
        };
        const renderer = new WorldRenderer({ backgroundManager, camera, pixiFactory: factory });

        await renderer.initialize(canvas);
        renderer.setSector({
            exits: [
                {
                    angle: 0,
                    width: 60,
                    radius: 900,
                    getFacilityType: () => 'TRADING_POST'
                }
            ],
            bodies: []
        });

        const exitArcCall = calls.graphics
            .flatMap(graphics => graphics.arc.mock.calls)
            .find(call => call[2] === 900);

        expect(exitArcCall[3]).toBeCloseTo(Math.PI / 2 - Math.PI / 6);
        expect(exitArcCall[4]).toBeCloseTo(Math.PI / 2 + Math.PI / 6);
    });

    it('draws facility labels as zoom-scaled curved text along the exit arc', async () => {
        const { canvas } = createCanvas();
        const { factory, calls } = createFakePixiFactory();
        const backgroundManager = {
            initialize: vi.fn(),
            renderPixi: vi.fn(),
            update: vi.fn(),
            handleResize: vi.fn(),
            startWarpEffect: vi.fn(),
            stopWarpEffect: vi.fn()
        };
        const camera = {
            zoomLevel: 2,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 320,
                y: point.y + 240
            }))
        };
        const renderer = new WorldRenderer({ backgroundManager, camera, pixiFactory: factory });

        await renderer.initialize(canvas);
        renderer.setSector({
            exits: [
                {
                    angle: 0,
                    width: 60,
                    radius: 900,
                    getFacilityType: () => 'REPAIR_DOCK'
                }
            ],
            bodies: []
        });

        const labelChars = calls.texts.map(text => text.options.text);
        const charPositions = calls.texts.map(text => text.position.set.mock.calls.at(-1));

        expect(labelChars.join('')).toBe('REPAIRDOCK');
        expect(calls.texts.every(text => text.options.style.fontSize === 60)).toBe(true);
        expect(new Set(charPositions.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)).size)
            .toBeGreaterThan(1);
    });
});
