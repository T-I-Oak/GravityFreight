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
        expect(camera.zoomLevel).toBe(0.5);
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

    it('zooms around the current screen position of the world origin', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(800, 600);
        camera.position = { x: 100, y: -50 };
        camera.zoomLevel = 1;
        const originBefore = camera.toScreen({ x: 0, y: 0 });
        const anchor = { x: 500, y: 350 };
        const anchorWorldBefore = camera.toWorld(anchor);

        camera.zoom(2, anchor);
        const originAfter = camera.toScreen({ x: 0, y: 0 });
        const anchorWorldAfter = camera.toWorld(anchor);

        expect(camera.zoomLevel).toBe(2);
        expect(originAfter.x).toBeCloseTo(originBefore.x);
        expect(originAfter.y).toBeCloseTo(originBefore.y);
        expect(anchorWorldAfter.x).not.toBeCloseTo(anchorWorldBefore.x);
    });

    it('zooms around the world origin after rotation', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(800, 600);
        camera.position = { x: 80, y: -30 };
        camera.rotation = Math.PI / 4;
        const originBefore = camera.toScreen({ x: 0, y: 0 });
        const anchor = { x: 520, y: 260 };

        camera.zoom(1.5, anchor);
        const originAfter = camera.toScreen({ x: 0, y: 0 });

        expect(originAfter.x).toBeCloseTo(originBefore.x);
        expect(originAfter.y).toBeCloseTo(originBefore.y);
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
        camera.zoomLevel = 1;
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
        camera.zoomLevel = 1;

        camera.rotate({ x: 300, y: 200 }, { x: 100, y: 0 });

        expect(camera.rotation).toBeCloseTo(Math.PI / 4);
    });

    it('keeps panning aligned to the screen axes after rotation', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(800, 600);
        camera.rotation = Math.PI / 2;
        camera.zoomLevel = 1;
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
            zoomLevel: 0.5
        });
    });

    it('resets camera state to defaults and persists it', () => {
        const repository = createRepository();
        const camera = new CameraController(repository);

        camera.initialize();
        camera.position = { x: 120, y: -80 };
        camera.rotation = Math.PI / 3;
        camera.zoomLevel = 1.7;

        camera.reset();

        expect(camera.position).toEqual({ x: 0, y: 0 });
        expect(camera.rotation).toBe(0);
        expect(camera.zoomLevel).toBe(0.5);
        expect(repository.setSavedCameraState).toHaveBeenCalledWith({
            position: { x: 0, y: 0 },
            rotation: 0,
            zoomLevel: 0.5
        });
    });

    it('can reset camera state without persisting it for temporary replay views', () => {
        const repository = createRepository();
        const camera = new CameraController(repository);

        camera.initialize();
        camera.position = { x: 120, y: -80 };
        camera.rotation = Math.PI / 3;
        camera.zoomLevel = 1.7;

        camera.reset({ persist: false });

        expect(camera.position).toEqual({ x: 0, y: 0 });
        expect(camera.rotation).toBe(0);
        expect(camera.zoomLevel).toBe(0.5);
        expect(repository.setSavedCameraState).not.toHaveBeenCalled();
    });

    it('applies temporary focus bounds without persisting camera state', () => {
        const repository = createRepository();
        const camera = new CameraController(repository);

        camera.initialize();
        camera.handleResize(800, 600);
        camera.position = { x: 100, y: -50 };
        camera.rotation = 0;
        camera.zoomLevel = 0.5;

        const original = camera.getState();
        const focusState = camera.focusWorldBounds(
            { left: 200, top: 100, width: 300, height: 200 },
            { padding: 100 }
        );

        expect(original).toEqual({ position: { x: 100, y: -50 }, rotation: 0, zoomLevel: 0.5 });
        expect(focusState.position).toEqual({ x: 350, y: 200 });
        expect(focusState.zoomLevel).toBe(2);
        expect(camera.toScreen({ x: 350, y: 200 })).toEqual({ x: 400, y: 300 });
        expect(repository.setSavedCameraState).not.toHaveBeenCalled();
    });

    it('does not increase focus zoom when focus padding is increased', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(1280, 720);

        const bounds = { left: 280, top: 115, width: 220, height: 220 };
        const compactFocus = camera.calculateFocusState(bounds, { padding: 120 });
        const roomyFocus = camera.calculateFocusState(bounds, { padding: 200 });

        expect(roomyFocus.zoomLevel).toBeLessThanOrEqual(compactFocus.zoomLevel);
    });

    it('fits rotated focus bounds within the padded viewport', () => {
        const camera = new CameraController(createRepository());

        camera.initialize();
        camera.handleResize(1280, 720);
        camera.rotation = Math.PI / 4;

        const bounds = { left: -40, top: -40, width: 540, height: 375 };
        const state = camera.calculateFocusState(bounds, { padding: 200 });
        camera.applyState(state);

        const corners = [
            { x: bounds.left, y: bounds.top },
            { x: bounds.left + bounds.width, y: bounds.top },
            { x: bounds.left, y: bounds.top + bounds.height },
            { x: bounds.left + bounds.width, y: bounds.top + bounds.height }
        ].map(point => camera.toScreen(point));
        const xs = corners.map(point => point.x);
        const ys = corners.map(point => point.y);

        expect(Math.min(...xs)).toBeGreaterThanOrEqual(200);
        expect(Math.max(...xs)).toBeLessThanOrEqual(1280 - 200);
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(200);
        expect(Math.max(...ys)).toBeLessThanOrEqual(720 - 200);
    });
});
