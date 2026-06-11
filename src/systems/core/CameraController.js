const DEFAULT_CAMERA_STATE = {
    position: { x: 0, y: 0 },
    rotation: 0,
    zoomLevel: 1
};
const MIN_ZOOM_LEVEL = 0.1;
const MAX_ZOOM_LEVEL = 2.0;

class CameraController {
    constructor(gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[CameraController] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.position = { ...DEFAULT_CAMERA_STATE.position };
        this.rotation = DEFAULT_CAMERA_STATE.rotation;
        this.zoomLevel = DEFAULT_CAMERA_STATE.zoomLevel;
        this.viewportSize = { x: 1, y: 1 };
    }

    initialize() {
        const state = this.gameDataRepository.getSavedCameraState({
            init: () => ({
                position: { ...DEFAULT_CAMERA_STATE.position },
                rotation: DEFAULT_CAMERA_STATE.rotation,
                zoomLevel: DEFAULT_CAMERA_STATE.zoomLevel
            })
        });

        this.position = { ...state.position };
        this.rotation = state.rotation;
        this.zoomLevel = state.zoomLevel;
    }

    handleResize(width, height) {
        this.viewportSize = { x: width, y: height };
    }

    toScreen(worldPos) {
        const rotated = this.#rotate(worldPos, this.rotation);
        return {
            x: (rotated.x - this.position.x) * this.zoomLevel + this.viewportSize.x / 2,
            y: (rotated.y - this.position.y) * this.zoomLevel + this.viewportSize.y / 2
        };
    }

    toWorld(screenPos) {
        const rotated = {
            x: (screenPos.x - this.viewportSize.x / 2) / this.zoomLevel + this.position.x,
            y: (screenPos.y - this.viewportSize.y / 2) / this.zoomLevel + this.position.y
        };

        return this.#rotate(rotated, -this.rotation);
    }

    isInMapArea(screenPos) {
        const worldPos = this.toWorld(screenPos);
        const radius = this.gameDataRepository.getMasterConfig().boundaryRadius;
        return Math.hypot(worldPos.x, worldPos.y) <= radius;
    }

    getWorldToScreenMatrix() {
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const scale = this.zoomLevel;

        return {
            a: cos * scale,
            b: sin * scale,
            c: -sin * scale,
            d: cos * scale,
            tx: this.viewportSize.x / 2 - this.position.x * scale,
            ty: this.viewportSize.y / 2 - this.position.y * scale
        };
    }

    zoom(factor) {
        const pivot = this.toScreen({ x: 0, y: 0 });
        this.zoomLevel = Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, this.zoomLevel * factor));

        this.position = {
            x: -(pivot.x - this.viewportSize.x / 2) / this.zoomLevel,
            y: -(pivot.y - this.viewportSize.y / 2) / this.zoomLevel
        };
    }

    rotate(anchor, delta) {
        const pivot = this.toScreen({ x: 0, y: 0 });
        const previousAngle = Math.atan2(anchor.y - pivot.y, anchor.x - pivot.x);
        const nextAngle = Math.atan2(
            anchor.y + delta.y - pivot.y,
            anchor.x + delta.x - pivot.x
        );
        this.rotation += nextAngle - previousAngle;
    }

    pan(screenDelta) {
        this.position.x -= screenDelta.x / this.zoomLevel;
        this.position.y -= screenDelta.y / this.zoomLevel;
    }

    save() {
        this.gameDataRepository.setSavedCameraState({
            position: { ...this.position },
            rotation: this.rotation,
            zoomLevel: this.zoomLevel
        });
    }

    #rotate(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: point.x * cos - point.y * sin,
            y: point.x * sin + point.y * cos
        };
    }
}

export default CameraController;
