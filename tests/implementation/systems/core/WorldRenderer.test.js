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

describe('WorldRenderer', () => {
    it('initializes a canvas and renders a sector snapshot', () => {
        const { canvas, context } = createCanvas();
        const renderer = new WorldRenderer();
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
                    items: []
                }
            ]
        };

        renderer.initialize(canvas);
        renderer.setSector(sector);

        expect(canvas.getContext).toHaveBeenCalledWith('2d');
        expect(renderer.targetSector).toBe(sector);
        expect(context.clearRect).toHaveBeenCalled();
        expect(context.arc).toHaveBeenCalled();
    });
});
