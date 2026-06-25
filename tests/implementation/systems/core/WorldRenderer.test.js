import { afterEach, describe, it, expect, vi } from 'vitest';
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
        closePath: vi.fn(),
        measureText: vi.fn(text => ({ width: String(text).length * 18 })),
        fillStyle: '',
        strokeStyles: [],
        lineWidth: 1,
        globalAlpha: 1,
        shadowBlur: 0,
        shadowColor: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        lineCap: '',
        lineJoin: ''
    };
    let strokeStyle = '';
    let globalAlpha = 1;
    Object.defineProperty(context, 'strokeStyle', {
        get: () => strokeStyle,
        set: value => {
            strokeStyle = value;
            context.strokeStyles.push(value);
        }
    });
    context.globalAlphas = [];
    Object.defineProperty(context, 'globalAlpha', {
        get: () => globalAlpha,
        set: value => {
            globalAlpha = value;
            context.globalAlphas.push(value);
        }
    });
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

function createBackgroundManager() {
    return {
        initialize: vi.fn(),
        render: vi.fn(),
        update: vi.fn(),
        handleResize: vi.fn(),
        startWarpEffect: vi.fn(),
        startReverseWarpEffect: vi.fn(),
        stopWarpEffect: vi.fn()
    };
}

const TEST_WORLD_COLORS = {
    boundary: 'token-boundary',
    prediction: 'token-prediction',
    trail: 'token-trail',
    sonar: 'token-sonar',
    rocket: 'token-rocket',
    homeStar: 'token-home-star',
    normalStar: 'token-normal-star',
    repulsiveStar: 'token-repulsive-star',
    categories: {
        chassis: 'token-category-chassis',
        logic: 'token-category-logic',
        module: 'token-category-module',
        rocket: 'token-category-rocket',
        launcher: 'token-category-launcher',
        booster: 'token-category-booster',
        coin: 'token-category-coin',
        cargo: 'token-category-cargo'
    },
    facilities: {
        TRADING_POST: 'token-facility-trading-post',
        REPAIR_DOCK: 'token-facility-repair-dock',
        BLACK_MARKET: 'token-facility-black-market'
    }
};

function createColorPalette() {
    return {
        createWorldColors: vi.fn(() => TEST_WORLD_COLORS)
    };
}

function createRenderer(options = {}) {
    return new WorldRenderer({
        colorPalette: createColorPalette(),
        ...options
    });
}

describe('WorldRenderer', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('initializes Canvas 2D context and renders the background', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const renderer = createRenderer({ backgroundManager });

        await renderer.initialize(canvas);

        expect(canvas.getContext).toHaveBeenCalledWith('2d');
        expect(backgroundManager.initialize).toHaveBeenCalledWith(expect.objectContaining({ width: 640, height: 480 }));
        expect(backgroundManager.update).toHaveBeenCalled();
        expect(backgroundManager.render).toHaveBeenCalledWith(
            context,
            expect.objectContaining({ width: 640, height: 480 })
        );
    });

    it('delegates warp background effects to BackgroundManager', async () => {
        const { canvas } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const renderer = createRenderer({ backgroundManager });

        await renderer.initialize(canvas);
        renderer.startWarpEffect(1400);
        renderer.stopWarpEffect(1400);

        expect(backgroundManager.startWarpEffect).toHaveBeenCalledWith(1400);
        expect(backgroundManager.stopWarpEffect).toHaveBeenCalledWith(1400);
    });

    it('runs the game-end exit warp as a reverse map zoom and slows it for title return', async () => {
        const { canvas } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const renderer = createRenderer({ backgroundManager });

        await renderer.initialize(canvas);
        await renderer.playGameEndExitAnimation();
        expect(backgroundManager.startReverseWarpEffect).toHaveBeenCalledWith(3200);
        expect(backgroundManager.startWarpEffect).not.toHaveBeenCalled();
        expect(renderer.mapWarp.scale).toBeGreaterThan(0.9);
        expect(renderer.mapWarp.transition).toEqual(expect.objectContaining({
            fromScale: 1,
            toScale: 0.01
        }));
        expect(renderer.mapWarp.alpha).toBe(1);

        await renderer.stopGameEndExitAnimation();
        expect(backgroundManager.stopWarpEffect).toHaveBeenCalledWith(1600);
        expect(renderer.mapWarp.transition).toEqual(expect.objectContaining({
            toScale: 1
        }));
        expect(renderer.mapWarp.alpha).toBe(1);
    });

    it('fades the map after the game-end exit zoom has moved it away', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const renderer = createRenderer({ backgroundManager });

        await renderer.initialize(canvas);
        renderer.setSector({
            exits: [],
            bodies: [
                {
                    position: { x: 0, y: 0 },
                    radius: 40,
                    isHome: true,
                    isRepulsion: false,
                    items: []
                }
            ]
        });

        await renderer.playGameEndExitAnimation();
        renderer.mapWarp.scale = 0.04;
        renderer.mapWarp.transition = null;
        context.globalAlphas.length = 0;
        renderer.render();

        expect(context.globalAlphas).toContain(0);
    });

    it('applies map warp scale around the canvas center', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 1,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 320,
                y: point.y + 240
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });

        await renderer.initialize(canvas);
        renderer.setSector({
            exits: [],
            bodies: [
                {
                    position: { x: 10, y: 0 },
                    radius: 5,
                    isHome: true,
                    isRepulsion: false,
                    items: []
                }
            ]
        });
        renderer.startWarpEffect();

        expect(context.arc).toHaveBeenLastCalledWith(1320, 240, 500, 0, Math.PI * 2);

        renderer.stopWarpEffect();

        expect(context.arc).toHaveBeenLastCalledWith(330, 240, 5, 0, Math.PI * 2);
    });

    it('keeps rendering on requestAnimationFrame so the background can animate', async () => {
        const { canvas } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const frameCallbacks = [];
        vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
            frameCallbacks.push(callback);
            return frameCallbacks.length;
        }));
        const renderer = createRenderer({ backgroundManager });

        await renderer.initialize(canvas);
        const initialRenderCount = backgroundManager.render.mock.calls.length;

        frameCallbacks.shift()();

        expect(backgroundManager.render.mock.calls.length).toBeGreaterThan(initialRenderCount);
        expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it('can pause and resume the render loop for title screen ownership of the shared background', async () => {
        const { canvas } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const frameCallbacks = [];
        vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
            frameCallbacks.push(callback);
            return frameCallbacks.length;
        }));
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
        const renderer = createRenderer({ backgroundManager });

        await renderer.initialize(canvas);
        renderer.setRenderLoopActive(false);
        const renderCount = backgroundManager.render.mock.calls.length;
        frameCallbacks.shift()();

        expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(1);
        expect(backgroundManager.render.mock.calls.length).toBe(renderCount);

        renderer.setRenderLoopActive(true);
        expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it('uses CameraController projection when rendering map objects', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 2,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 100,
                y: point.y + 200
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });

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
        expect(context.arc).toHaveBeenCalledWith(110, 220, 10, 0, Math.PI * 2);
    });

    it('renders item rings for lowercase item categories placed on bodies', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 2,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 100,
                y: point.y + 200
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });

        await renderer.initialize(canvas);
        renderer.setSector({
            exits: [],
            bodies: [
                {
                    position: { x: 10, y: 20 },
                    radius: 5,
                    isHome: false,
                    isRepulsion: false,
                    items: [{ category: 'coin' }]
                }
            ]
        });

        expect(context.arc).toHaveBeenCalledWith(110, 220, 18, 0, Math.PI * 2);
        expect(context.strokeStyles).toContain('token-category-coin');
        expect(context.stroke).toHaveBeenCalled();
    });

    it('uses the UI category color tokens for item rings', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 1,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 100,
                y: point.y + 200
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });

        await renderer.initialize(canvas);
        renderer.setSector({
            exits: [],
            bodies: [
                {
                    position: { x: 10, y: 20 },
                    radius: 5,
                    isHome: false,
                    isRepulsion: false,
                    items: [
                        { category: 'chassis' },
                        { category: 'logic' },
                        { category: 'module' },
                        { category: 'rocket' },
                        { category: 'launcher' },
                        { category: 'booster' },
                        { category: 'coin' },
                        { category: 'cargo' }
                    ]
                }
            ]
        });

        [
            'token-category-chassis',
            'token-category-logic',
            'token-category-module',
            'token-category-rocket',
            'token-category-launcher',
            'token-category-booster',
            'token-category-coin',
            'token-category-cargo'
        ].forEach(color => {
            expect(context.strokeStyles).toContain(color);
        });
    });

    it('applies camera rotation to exit arc angles', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
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
        const renderer = createRenderer({ backgroundManager, camera });

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

        const exitArcCall = context.arc.mock.calls.find(call => (
            call[0] === 320 && call[1] === 240 && call[2] === 900 && call[3] !== 0
        ));

        expect(exitArcCall[3]).toBeCloseTo(Math.PI / 2 - Math.PI / 6);
        expect(exitArcCall[4]).toBeCloseTo(Math.PI / 2 + Math.PI / 6);
    });

    it('draws facility labels as zoom-scaled curved text along the exit arc', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
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
        const renderer = createRenderer({ backgroundManager, camera });

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

        const labelChars = context.fillText.mock.calls.map(call => call[0]);
        const charPositions = context.translate.mock.calls;

        expect(labelChars.join('')).toBe('REPAIRDOCK');
        expect(context.font).toBe('bold 60px Orbitron, sans-serif');
        expect(new Set(charPositions.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)).size)
            .toBeGreaterThan(1);
    });

    it('draws a cargo icon on the matching exit arc when delivery cargo is on the map', async () => {
        vi.stubGlobal('performance', { now: vi.fn(() => 0) });
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 1,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 320,
                y: point.y + 240
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });

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
            bodies: [
                {
                    position: { x: 0, y: 0 },
                    radius: 40,
                    isHome: true,
                    isRepulsion: false,
                    items: [
                        { category: 'cargo', deliveryGoalId: 'TRADING_POST' },
                        { category: 'cargo' }
                    ]
                }
            ]
        });

        expect(context.strokeStyles).toContain('token-facility-trading-post');
        expect(context.translate).toHaveBeenCalledWith(1305, 240);
        expect(context.globalAlphas).toContain(0.5);
        expect(context.moveTo).toHaveBeenCalledWith(15, -13.5);
        expect(context.lineTo).toHaveBeenCalledWith(-15, -9);
        expect(context.lineTo).toHaveBeenCalledWith(30, 13.5);
    });

    it('does not draw an exit cargo icon for cargo targeting another facility', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 1,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 320,
                y: point.y + 240
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });

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
            bodies: [
                {
                    position: { x: 0, y: 0 },
                    radius: 40,
                    isHome: true,
                    isRepulsion: false,
                    items: [{ category: 'cargo', deliveryGoalId: 'REPAIR_DOCK' }]
                }
            ]
        });

        expect(context.translate).not.toHaveBeenCalledWith(1186, 240);
    });

    it('renders navigation rocket, trail, cargo, and sonar using camera projection', async () => {
        vi.stubGlobal('performance', { now: vi.fn(() => 1000) });
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 2,
            rotation: Math.PI / 4,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 320,
                y: point.y + 240
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });
        const rocket = {
            position: { x: 30, y: 40 },
            velocity: { x: 8, y: 0 },
            angle: 0,
            actualTrail: [
                { x: 0, y: 0 },
                { x: 4, y: 8 },
                { x: 8, y: 16 },
                { x: 12, y: 24 },
                { x: 16, y: 32 },
                { x: 20, y: 40 },
                { x: 24, y: 48 },
                { x: 28, y: 56 },
                { x: 10, y: 20 },
                { x: 30, y: 40 }
            ],
            heldCargo: [
                { category: 'cargo' },
                { getViewData: () => ({ category: 'coin' }) }
            ],
            getCollectionRange: vi.fn(() => 80)
        };

        await renderer.initialize(canvas);
        renderer.setSector({ exits: [], bodies: [] });
        renderer.startNavigation(rocket);
        renderer.enableSonar();

        expect(camera.toScreen).toHaveBeenCalledWith({ x: 30, y: 40 });
        expect(context.moveTo).toHaveBeenCalledWith(320, 240);
        expect(context.lineTo).toHaveBeenCalledWith(330, 260);
        expect(context.globalAlphas).toContain(0.1);
        expect(context.globalAlphas).toContain(0.9);
        expect(context.translate).toHaveBeenCalledWith(350, 280);
        expect(context.rotate).toHaveBeenCalledWith(Math.PI / 4);
        expect(context.arc).toHaveBeenCalledWith(350, 280, 80, 0, Math.PI * 2);
        expect(context.arc).toHaveBeenCalledWith(324, 248, 8, 0, Math.PI * 2);
        expect(context.arc).toHaveBeenCalledWith(320, 240, 8, 0, Math.PI * 2);
    });

    it('renders prediction path independently from the navigation rocket trail', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 1,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 100,
                y: point.y + 200
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });

        await renderer.initialize(canvas);
        renderer.setSector({ exits: [], bodies: [] });
        renderer.setPredictionPath([
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 20 }
        ]);

        expect(context.moveTo).toHaveBeenCalledWith(100, 200);
        expect(context.lineTo).toHaveBeenCalledWith(120, 200);
        expect(context.lineTo).toHaveBeenCalledWith(120, 220);
    });

    it('renders AIM rocket and sonar before navigation starts', async () => {
        vi.stubGlobal('performance', { now: vi.fn(() => 1000) });
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 1,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 320,
                y: point.y + 240
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });
        const aimRocket = {
            position: { x: 40, y: 0 },
            velocity: { x: 8, y: 0 },
            angle: 0,
            actualTrail: [],
            heldCargo: [],
            getCollectionRange: vi.fn(() => 80)
        };

        await renderer.initialize(canvas);
        renderer.setSector({ exits: [], bodies: [] });
        renderer.setAimRocket(aimRocket);
        renderer.enableSonar();

        expect(context.translate).toHaveBeenCalledWith(360, 240);
        expect(context.arc).toHaveBeenCalledWith(360, 240, 40, 0, Math.PI * 2);
    });

    it('keeps existing sonar ripples after disabling sonar until they naturally finish', async () => {
        vi.stubGlobal('performance', { now: vi.fn(() => 1000) });
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 1,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 320,
                y: point.y + 240
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });
        const rocket = {
            position: { x: 40, y: 0 },
            velocity: { x: 8, y: 0 },
            angle: 0,
            actualTrail: [],
            heldCargo: [],
            getCollectionRange: vi.fn(() => 80)
        };

        await renderer.initialize(canvas);
        renderer.setSector({ exits: [], bodies: [] });
        renderer.startNavigation(rocket);
        renderer.enableSonar();
        renderer.disableSonar();

        vi.stubGlobal('performance', { now: vi.fn(() => 1500) });
        renderer.render();

        expect(context.arc).toHaveBeenCalledWith(360, 240, 60, 0, Math.PI * 2);
    });

    it('stops drawing sonar ripples after the disabled ripples have completed one cycle', async () => {
        vi.stubGlobal('performance', { now: vi.fn(() => 1000) });
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const camera = {
            zoomLevel: 1,
            rotation: 0,
            position: { x: 0, y: 0 },
            handleResize: vi.fn(),
            toScreen: vi.fn(point => ({
                x: point.x + 320,
                y: point.y + 240
            }))
        };
        const renderer = createRenderer({ backgroundManager, camera });
        const rocket = {
            position: { x: 40, y: 0 },
            velocity: { x: 8, y: 0 },
            angle: 0,
            actualTrail: [],
            heldCargo: [],
            getCollectionRange: vi.fn(() => 80)
        };

        await renderer.initialize(canvas);
        renderer.setSector({ exits: [], bodies: [] });
        renderer.startNavigation(rocket);
        renderer.enableSonar();
        renderer.disableSonar();
        context.arc.mockClear();

        vi.stubGlobal('performance', { now: vi.fn(() => 3100) });
        renderer.render();

        expect(context.arc).not.toHaveBeenCalledWith(360, 240, expect.any(Number), 0, Math.PI * 2);
    });

    it('continues finish animation with fixed rocket position until trail and cargo converge', async () => {
        const frameCallbacks = [];
        vi.stubGlobal('performance', { now: vi.fn(() => 0) });
        vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
            frameCallbacks.push(callback);
            return frameCallbacks.length;
        }));
        const { canvas } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const renderer = createRenderer({ backgroundManager });
        const rocket = {
            position: { x: 30, y: 40 },
            velocity: { x: 8, y: 0 },
            angle: 0,
            actualTrail: [
                { x: 0, y: 0 },
                { x: 10, y: 10 }
            ],
            heldCargo: [{ category: 'cargo' }],
            getCollectionRange: vi.fn(() => 80),
            recordTrailPoint: vi.fn(function recordTrailPoint(point) {
                rocket.actualTrail.push({ ...point });
            })
        };

        await renderer.initialize(canvas);
        frameCallbacks.length = 0;
        renderer.setSector({ exits: [], bodies: [] });
        renderer.startNavigation(rocket);

        const finish = renderer.playFinishAnimation();
        frameCallbacks.shift()(0);
        frameCallbacks.shift()(1000);
        frameCallbacks.shift()(2000);
        await finish;

        expect(rocket.recordTrailPoint).toHaveBeenCalledWith({ x: 30, y: 40 });
        expect(rocket.position).toEqual({ x: 30, y: 40 });
        expect(backgroundManager.render.mock.calls.length).toBeGreaterThan(3);
    });

    it('hides the rocket body during finish animation while keeping trail and cargo rendering', async () => {
        const frameCallbacks = [];
        vi.stubGlobal('performance', { now: vi.fn(() => 0) });
        vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
            frameCallbacks.push(callback);
            return frameCallbacks.length;
        }));
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const renderer = createRenderer({ backgroundManager });
        const rocket = {
            position: { x: 30, y: 40 },
            velocity: { x: 8, y: 0 },
            angle: 0,
            actualTrail: [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
                { x: 20, y: 20 },
                { x: 30, y: 40 },
                { x: 30, y: 40 }
            ],
            heldCargo: [{ category: 'cargo' }],
            getCollectionRange: vi.fn(() => 80),
            recordTrailPoint: vi.fn(function recordTrailPoint(point) {
                rocket.actualTrail.push({ ...point });
            })
        };

        await renderer.initialize(canvas);
        frameCallbacks.length = 0;
        renderer.setSector({ exits: [], bodies: [] });
        renderer.startNavigation(rocket);
        context.translate.mockClear();
        context.lineTo.mockClear();
        context.arc.mockClear();

        const finish = renderer.playFinishAnimation({ type: 'boundary' });
        frameCallbacks.shift()(0);

        expect(context.translate).not.toHaveBeenCalledWith(350, 280);
        expect(context.lineTo).toHaveBeenCalled();
        expect(context.arc).toHaveBeenCalledWith(320, 240, 3, 0, Math.PI * 2);

        frameCallbacks.shift()(2000);
        await finish;
    });

    it('clears navigation visuals after finish animation so result map does not redisplay rocket or cargo', async () => {
        const frameCallbacks = [];
        vi.stubGlobal('performance', { now: vi.fn(() => 0) });
        vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
            frameCallbacks.push(callback);
            return frameCallbacks.length;
        }));
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const renderer = createRenderer({ backgroundManager });
        const rocket = {
            position: { x: 30, y: 40 },
            velocity: { x: 8, y: 0 },
            angle: 0,
            actualTrail: [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
                { x: 20, y: 20 },
                { x: 30, y: 40 },
                { x: 30, y: 40 }
            ],
            heldCargo: [{ category: 'cargo' }],
            getCollectionRange: vi.fn(() => 80),
            recordTrailPoint: vi.fn(function recordTrailPoint(point) {
                rocket.actualTrail.push({ ...point });
            })
        };

        await renderer.initialize(canvas);
        frameCallbacks.length = 0;
        renderer.setSector({ exits: [], bodies: [] });
        renderer.startNavigation(rocket);

        const finish = renderer.playFinishAnimation({ type: 'boundary' });
        frameCallbacks.shift()(0);
        frameCallbacks.shift()(2000);
        await finish;

        context.translate.mockClear();
        context.lineTo.mockClear();
        context.arc.mockClear();
        renderer.render();

        expect(context.translate).not.toHaveBeenCalledWith(350, 280);
        expect(context.lineTo).not.toHaveBeenCalled();
        expect(context.arc).not.toHaveBeenCalledWith(320, 240, 3, 0, Math.PI * 2);
    });
});
