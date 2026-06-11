import { describe, it, expect, vi } from 'vitest';
import CameraController from '../../../../src/systems/core/CameraController.js';

function createRepository() {
    return {
        getSavedCameraState: vi.fn(migrationMap => migrationMap.init()),
        setSavedCameraState: vi.fn(),
        getMasterConfig: vi.fn(() => ({
            boundaryRadius: 900
        }))
    };
}

describe('CameraController', () => {
    it('loads default camera state and tracks viewport size', () => {
        const repository = createRepository();
        const camera = new CameraController(repository);

        camera.initialize();
        camera.handleResize(800, 600);

        expect(repository.getSavedCameraState).toHaveBeenCalled();
        expect(camera.position).toEqual({ x: 0, y: 0 });
        expect(camera.rotation).toBe(0);
        expect(camera.zoomLevel).toBe(1);
        expect(camera.viewportSize).toEqual({ x: 800, y: 600 });
    });

    it('converts between world and screen coordinates', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(800, 600);
        camera.position = { x: 100, y: -50 };
        camera.zoomLevel = 2;

        const screen = camera.toScreen({ x: 120, y: -40 });
        const world = camera.toWorld(screen);

        expect(screen).toEqual({ x: 440, y: 320 });
        expect(world.x).toBeCloseTo(120);
        expect(world.y).toBeCloseTo(-40);
    });

    it('zooms around a screen anchor without moving the anchor world point', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(800, 600);
        const anchor = { x: 500, y: 350 };
        const before = camera.toWorld(anchor);

        camera.zoom(2, anchor);
        const after = camera.toWorld(anchor);

        expect(camera.zoomLevel).toBe(2);
        expect(after.x).toBeCloseTo(before.x);
        expect(after.y).toBeCloseTo(before.y);
    });

    it('zooms around a screen anchor without moving the anchor world point after rotation', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(800, 600);
        camera.position = { x: 80, y: -30 };
        camera.rotation = Math.PI / 4;
        const anchor = { x: 520, y: 260 };
        const before = camera.toWorld(anchor);

        camera.zoom(1.5, anchor);
        const after = camera.toWorld(anchor);

        expect(after.x).toBeCloseTo(before.x);
        expect(after.y).toBeCloseTo(before.y);
    });

    it('clamps zoom level to the supported map interaction range', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(800, 600);
        camera.zoom(100, { x: 400, y: 300 });
        expect(camera.zoomLevel).toBe(2);

        camera.zoom(0.001, { x: 400, y: 300 });
        expect(camera.zoomLevel).toBe(0.1);
    });

    it('updates pan and rotation from screen interaction values', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(800, 600);
        camera.pan({ x: 40, y: -20 });
        camera.rotate({ x: 400, y: 300 }, { x: 0, y: 40 });

        expect(camera.position).toEqual({ x: -40, y: 20 });
        expect(camera.rotation).toBeCloseTo(-0.5191461142465229);
    });

    it('rotates around the current screen position of the world origin after panning', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(800, 600);
        camera.position = { x: 100, y: 0 };

        camera.rotate({ x: 300, y: 200 }, { x: 100, y: 0 });

        expect(camera.rotation).toBeCloseTo(Math.PI / 4);
    });

    it('keeps panning aligned to the screen axes after rotation', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(800, 600);
        camera.rotation = Math.PI / 2;
        camera.pan({ x: 40, y: -20 });

        expect(camera.position.x).toBeCloseTo(-40);
        expect(camera.position.y).toBeCloseTo(20);
    });

    it('checks map area using the configured boundary radius and saves state explicitly', () => {
        const repository = createRepository();
        const camera = new CameraController(repository);

        camera.initialize();
        camera.handleResize(800, 600);
        camera.save();

        expect(camera.isInMapArea({ x: 400, y: 300 })).toBe(true);
        expect(camera.isInMapArea({ x: 1400, y: 300 })).toBe(false);
        expect(repository.setSavedCameraState).toHaveBeenCalledWith({
            position: { x: 0, y: 0 },
            rotation: 0,
            zoomLevel: 1
        });
    });
});
