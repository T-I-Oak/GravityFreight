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

function createColorPalette() {
    return {
        get: vi.fn(name => ({
            worldBg: 'token-world-bg'
        })[name]),
        createStarParticleColor: vi.fn(alpha => `token-star-rgba-${alpha}`)
    };
}

describe('BackgroundManager', () => {
    it('generates deterministic star layers and renders them behind the map', () => {
        const colorPalette = createColorPalette();
        const manager = new BackgroundManager({ starCount: 8, seed: 7, colorPalette });
        const context = createContext();

        manager.initialize({ width: 640, height: 480 });
        const firstStars = manager.stars.map(star => ({ ...star }));
        manager.render(context, { width: 640, height: 480 });

        expect(manager.stars).toHaveLength(8);
        expect(manager.stars).toEqual(firstStars);
        expect(colorPalette.get).toHaveBeenCalledWith('worldBg');
        expect(context.fillRect).toHaveBeenCalled();
    });

    it('applies camera zoom and parallax offset to Canvas star projection', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 7, colorPalette: createColorPalette() });
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
        const colorPalette = createColorPalette();
        const manager = new BackgroundManager({ starCount: 4, seed: 3, colorPalette });
        const context = createContext();

        manager.initialize({ width: 640, height: 480 });
        manager.startWarpEffect();
        manager.update(0.016);
        manager.render(context, { width: 640, height: 480 });

        expect(manager.warpSpeed).toBeGreaterThan(1);
        expect(colorPalette.createStarParticleColor).toHaveBeenCalled();
        expect(context.moveTo).toHaveBeenCalled();
        expect(context.lineTo).toHaveBeenCalled();
        expect(context.stroke).toHaveBeenCalled();
    });

    it('draws warp streaks from the previous frame depth', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 3, colorPalette: createColorPalette() });
        const context = createContext();

        manager.initialize({ width: 640, height: 480 });
        manager.stars = [{
            x: 100,
            y: 0,
            z: 200,
            previousZ: 300,
            size: 1,
            alpha: 1,
            pulseRate: 0,
            pulseOffset: 0,
            wrapped: false
        }];
        manager.startWarpEffect();
        manager.render(context, { width: 640, height: 480, timestamp: 0 });

        expect(context.moveTo.mock.calls[0][0]).toBeCloseTo(386.6666666666667);
        expect(context.moveTo.mock.calls[0][1]).toBe(240);
        expect(context.lineTo.mock.calls[0][0]).toBe(420);
        expect(context.lineTo.mock.calls[0][1]).toBe(240);
    });

    it('does not draw streaks for stars that wrapped during warp movement', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 3, colorPalette: createColorPalette() });
        const context = createContext();

        manager.initialize({ width: 640, height: 480 });
        manager.stars = [{
            x: 100,
            y: 0,
            z: 200,
            previousZ: 300,
            size: 1,
            alpha: 1,
            pulseRate: 0,
            pulseOffset: 0,
            wrapped: true
        }];
        manager.startWarpEffect();
        manager.render(context, { width: 640, height: 480, timestamp: 0 });

        expect(context.moveTo).not.toHaveBeenCalled();
        expect(context.arc).toHaveBeenCalled();
    });

    it('keeps distant stars visible as points when warp streaks are too short', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 3, colorPalette: createColorPalette() });
        const context = createContext();

        manager.initialize({ width: 640, height: 480 });
        manager.stars = [{
            x: 100,
            y: 0,
            z: 1900,
            previousZ: 1901,
            size: 1,
            alpha: 1,
            pulseRate: 0,
            pulseOffset: 0,
            wrapped: false
        }];
        manager.startWarpEffect();
        manager.render(context, { width: 640, height: 480, timestamp: 0 });

        expect(context.moveTo).not.toHaveBeenCalled();
        expect(context.arc).toHaveBeenCalled();
        expect(context.fill).toHaveBeenCalled();
    });

    it('moves stars through depth over elapsed time', () => {
        const manager = new BackgroundManager({ starCount: 4, seed: 3, colorPalette: createColorPalette() });

        manager.initialize({ width: 640, height: 480 });
        const initialDepth = manager.stars[0].z;
        manager.update(0.5);

        expect(manager.stars[0].z).toBeCloseTo(initialDepth - 3, 6);
    });

    it('wraps stars back to deep space after passing the camera', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 3, colorPalette: createColorPalette() });

        manager.initialize({ width: 640, height: 480 });
        manager.stars[0].z = 0.1;
        manager.update(1);

        expect(manager.stars[0].z).toBeGreaterThan(1000);
    });

    it('interpolates warp speed when a duration is provided', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 3, colorPalette: createColorPalette() });

        manager.initialize({ width: 640, height: 480 });
        manager.startWarpEffect(1000);
        manager.update(0.5);

        expect(manager.warpSpeed).toBeGreaterThan(1);
        expect(manager.warpSpeed).toBeLessThan(100);

        manager.update(0.5);
        expect(manager.warpSpeed).toBe(100);
    });

    it('moves stars toward deeper space during reverse warp', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 3, colorPalette: createColorPalette() });

        manager.initialize({ width: 640, height: 480 });
        const initialDepth = manager.stars[0].z;
        manager.startReverseWarpEffect();
        manager.update(0.5);

        expect(manager.warpSpeed).toBe(-100);
        expect(manager.stars[0].z).toBeCloseTo(initialDepth + 300, 6);
    });

    it('draws reverse warp streaks and replenishes stars that move beyond deep space', () => {
        const manager = new BackgroundManager({ starCount: 1, seed: 3, colorPalette: createColorPalette() });
        const context = createContext();

        manager.initialize({ width: 640, height: 480 });
        manager.stars = [{
            x: 100,
            y: 0,
            z: 200,
            previousZ: 100,
            size: 1,
            alpha: 1,
            pulseRate: 0,
            pulseOffset: 0,
            wrapped: false
        }];
        manager.startReverseWarpEffect();
        manager.render(context, { width: 640, height: 480, timestamp: 0 });

        expect(context.moveTo).toHaveBeenCalled();
        expect(context.lineTo).toHaveBeenCalled();

        manager.stars[0].z = 1990;
        manager.update(0.5);

        expect(manager.stars[0].z).toBeLessThan(500);
        expect(manager.stars[0].wrapped).toBe(true);
    });

    it('smoothly returns star brightness to normal while warp speed slows down', () => {
        const colorPalette = createColorPalette();
        const manager = new BackgroundManager({ starCount: 1, seed: 3, colorPalette });
        const context = createContext();

        manager.initialize({ width: 640, height: 480 });
        manager.stars = [{
            x: 100,
            y: 0,
            z: 1900,
            previousZ: 1901,
            size: 1,
            alpha: 1,
            pulseRate: 0,
            pulseOffset: 0,
            wrapped: false
        }];
        manager.startWarpEffect();
        manager.stopWarpEffect(1000);
        manager.update(0.5);
        manager.render(context, { width: 640, height: 480, timestamp: 0 });
        const slowingAlpha = Number(colorPalette.createStarParticleColor.mock.calls.at(-1)[0]);

        manager.update(0.5);
        manager.render(context, { width: 640, height: 480, timestamp: 0 });
        const normalAlpha = Number(colorPalette.createStarParticleColor.mock.calls.at(-1)[0]);

        expect(slowingAlpha).toBeGreaterThan(normalAlpha);
        expect(slowingAlpha).toBeLessThan(1);
    });

    it('returns to normal speed when warp effect stops', () => {
        const manager = new BackgroundManager({ starCount: 4, seed: 3, colorPalette: createColorPalette() });

        manager.initialize({ width: 640, height: 480 });
        manager.startWarpEffect();
        manager.stopWarpEffect();

        expect(manager.warpSpeed).toBe(1);
    });
});
