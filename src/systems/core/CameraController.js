const DEFAULT_CAMERA_STATE = {
    position: { x: 0, y: 0 },
    rotation: 0,
    zoomLevel: 0.5
};
const MIN_ZOOM_LEVEL = 0.1;
const MAX_ZOOM_LEVEL = 2.0;
const FOCUS_VIEWPORT_PADDING = 96;

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

    getState() {
        return {
            position: { ...this.position },
            rotation: this.rotation,
            zoomLevel: this.zoomLevel
        };
    }

    applyState(state) {
        if (!state || typeof state !== 'object') {
            throw new Error('[CameraController] camera state is required.');
        }
        if (!state.position || !Number.isFinite(state.position.x) || !Number.isFinite(state.position.y)) {
            throw new Error('[CameraController] camera state position must be finite.');
        }
        if (!Number.isFinite(state.rotation) || !Number.isFinite(state.zoomLevel)) {
            throw new Error('[CameraController] camera state rotation and zoomLevel must be finite.');
        }

        this.position = { ...state.position };
        this.rotation = state.rotation;
        this.zoomLevel = Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, state.zoomLevel));
    }

    focusWorldBounds(bounds, options = {}) {
        const state = this.calculateFocusState(bounds, options);
        this.applyState(state);
        return state;
    }

    calculateFocusState(bounds, options = {}) {
        const normalized = this.#normalizeBounds(bounds);
        const padding = Number.isFinite(options.padding) ? options.padding : FOCUS_VIEWPORT_PADDING;
        const availableWidth = Math.max(1, this.viewportSize.x - padding * 2);
        const availableHeight = Math.max(1, this.viewportSize.y - padding * 2);
        const rotatedBounds = this.#getRotatedBounds(normalized, this.rotation);
        const zoomLevel = Math.max(
            MIN_ZOOM_LEVEL,
            Math.min(
                MAX_ZOOM_LEVEL,
                availableWidth / rotatedBounds.width,
                availableHeight / rotatedBounds.height
            )
        );

        return {
            position: rotatedBounds.center,
            rotation: this.rotation,
            zoomLevel
        };
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

    reset(options = {}) {
        this.position = { ...DEFAULT_CAMERA_STATE.position };
        this.rotation = DEFAULT_CAMERA_STATE.rotation;
        this.zoomLevel = DEFAULT_CAMERA_STATE.zoomLevel;
        if (options.persist !== false) {
            this.save();
        }
    }

    save() {
        this.gameDataRepository.setSavedCameraState({
            position: { ...this.position },
            rotation: this.rotation,
            zoomLevel: this.zoomLevel
        });
    }

    #normalizeBounds(bounds) {
        if (!bounds || typeof bounds !== 'object') {
            throw new Error('[CameraController] focus bounds are required.');
        }

        const left = bounds.left ?? bounds.x;
        const top = bounds.top ?? bounds.y;
        const width = bounds.width;
        const height = bounds.height;
        if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
            throw new Error('[CameraController] focus bounds must have finite positive dimensions.');
        }

        return { left, top, width, height };
    }

    #getRotatedBounds(bounds, angle) {
        const points = [
            { x: bounds.left, y: bounds.top },
            { x: bounds.left + bounds.width, y: bounds.top },
            { x: bounds.left, y: bounds.top + bounds.height },
            { x: bounds.left + bounds.width, y: bounds.top + bounds.height }
        ].map(point => this.#rotate(point, angle));
        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        const right = Math.max(...xs);
        const bottom = Math.max(...ys);

        return {
            left,
            top,
            width: right - left,
            height: bottom - top,
            center: {
                x: left + (right - left) / 2,
                y: top + (bottom - top) / 2
            }
        };
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
