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
        strokeStyle: '',
        lineWidth: 1,
        shadowBlur: 0,
        shadowColor: '',
        font: '',
        textAlign: '',
        textBaseline: ''
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

function createBackgroundManager() {
    return {
        initialize: vi.fn(),
        render: vi.fn(),
        update: vi.fn(),
        handleResize: vi.fn(),
        startWarpEffect: vi.fn(),
        stopWarpEffect: vi.fn()
    };
}

describe('WorldRenderer', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('initializes Canvas 2D context and renders the background', async () => {
        const { canvas, context } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const renderer = new WorldRenderer({ backgroundManager });

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
        const renderer = new WorldRenderer({ backgroundManager });

        await renderer.initialize(canvas);
        renderer.startWarpEffect();
        renderer.stopWarpEffect();

        expect(backgroundManager.startWarpEffect).toHaveBeenCalled();
        expect(backgroundManager.stopWarpEffect).toHaveBeenCalled();
    });

    it('keeps rendering on requestAnimationFrame so the background can animate', async () => {
        const { canvas } = createCanvas();
        const backgroundManager = createBackgroundManager();
        const frameCallbacks = [];
        vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
            frameCallbacks.push(callback);
            return frameCallbacks.length;
        }));
        const renderer = new WorldRenderer({ backgroundManager });

        await renderer.initialize(canvas);
        const initialRenderCount = backgroundManager.render.mock.calls.length;

        frameCallbacks.shift()();

        expect(backgroundManager.render.mock.calls.length).toBeGreaterThan(initialRenderCount);
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
        const renderer = new WorldRenderer({ backgroundManager, camera });

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
        const renderer = new WorldRenderer({ backgroundManager, camera });

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
        const renderer = new WorldRenderer({ backgroundManager, camera });

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
});
