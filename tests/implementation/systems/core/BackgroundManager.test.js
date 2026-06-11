import { describe, it, expect, vi } from 'vitest';
import BackgroundManager from '../../../../src/systems/core/BackgroundManager.js';

function createContext() {
    return {
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn()
    };
}

describe('BackgroundManager', () => {
    it('generates deterministic star layers and renders them behind the map', () => {
        const manager = new BackgroundManager({ starCount: 8, seed: 7 });
        const context = createContext();

        manager.initialize({ width: 640, height: 480 });
        const firstStars = manager.stars.map(star => ({ ...star }));
        manager.render(context, { width: 640, height: 480 });

        expect(manager.stars).toHaveLength(8);
        expect(manager.stars).toEqual(firstStars);
        expect(context.fillRect).toHaveBeenCalled();
    });

    it('applies camera zoom and parallax offset to Canvas star projection', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 7 });
        const context = createContext();

        manager.initialize({ width: 640, height: 480 });
        manager.stars = [{
            x: 100,
            y: 0,
            z: 200,
            size: 1,
            alpha: 1,
            pulseRate: 0,
            pulseOffset: 0
        }];
        manager.render(context, {
            width: 640,
            height: 480,
            zoomLevel: 2,
            offset: { x: 50, y: 0 },
            timestamp: 0
        });

        expect(context.arc).toHaveBeenCalledWith(500, 240, expect.any(Number), 0, Math.PI * 2);
    });

    it('draws streaks while warp speed is above the normal background speed', () => {
        const manager = new BackgroundManager({ starCount: 4, seed: 3 });
        const context = createContext();

        manager.initialize({ width: 640, height: 480 });
        manager.startWarpEffect();
        manager.render(context, { width: 640, height: 480 });

        expect(manager.warpSpeed).toBeGreaterThan(1);
        expect(context.moveTo).toHaveBeenCalled();
        expect(context.lineTo).toHaveBeenCalled();
        expect(context.stroke).toHaveBeenCalled();
    });

    it('moves stars through depth over elapsed time', () => {
        const manager = new BackgroundManager({ starCount: 4, seed: 3 });

        manager.initialize({ width: 640, height: 480 });
        const initialDepth = manager.stars[0].z;
        manager.update(0.5);

        expect(manager.stars[0].z).toBeCloseTo(initialDepth - 3, 6);
    });

    it('wraps stars back to deep space after passing the camera', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 3 });

        manager.initialize({ width: 640, height: 480 });
        manager.stars[0].z = 0.1;
        manager.update(1);

        expect(manager.stars[0].z).toBeGreaterThan(1000);
    });

    it('interpolates warp speed when a duration is provided', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 3 });

        manager.initialize({ width: 640, height: 480 });
        manager.startWarpEffect(1000);
        manager.update(0.5);

        expect(manager.warpSpeed).toBeGreaterThan(1);
        expect(manager.warpSpeed).toBeLessThan(12);

        manager.update(0.5);
        expect(manager.warpSpeed).toBe(12);
    });

    it('returns to normal speed when warp effect stops', () => {
        const manager = new BackgroundManager({ starCount: 4, seed: 3 });

        manager.initialize({ width: 640, height: 480 });
        manager.startWarpEffect();
        manager.stopWarpEffect();

        expect(manager.warpSpeed).toBe(1);
    });
});
