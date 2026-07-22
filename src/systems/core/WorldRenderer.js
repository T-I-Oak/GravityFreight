import BackgroundManager from './BackgroundManager.js';
import CanvasColorPalette from './CanvasColorPalette.js';
import FlightVisualRenderer from './FlightVisualRenderer.js';
import SectorMapRenderer from './SectorMapRenderer.js';

const WORLD_VIEW_SCALE = 0.5;
const WARP_OUT_SCALE = 100;
const WARP_IN_START_SCALE = 0.01;
const GAME_END_EXIT_SCALE = 0.01;
const GAME_END_FADE_START_SCALE = 0.35;
const GAME_END_FADE_END_SCALE = 0.08;
const FINISH_ANIMATION_DURATION = 2000;
const SONAR_RIPPLE_DURATION = 2000;

class WorldRenderer {
    constructor(options = {}) {
        this.canvas = null;
        this.context = null;
        this.targetSector = null;
        this.camera = options.camera || null;
        this.colorPalette = options.colorPalette || new CanvasColorPalette();
        this.backgroundManager = options.backgroundManager || new BackgroundManager({ colorPalette: this.colorPalette });
        this.flightVisualRenderer = options.flightVisualRenderer || new FlightVisualRenderer();
        this.sectorMapRenderer = options.sectorMapRenderer || new SectorMapRenderer();
        this.soundController = options.soundController || null;
        this.lastRenderTimestamp = null;
        this.animationFrameId = null;
        this.renderLoopActive = true;
        this.navigationRocket = null;
        this.aimRocket = null;
        this.predictionPath = [];
        this.hideNavigationRocketBody = false;
        this.sonarEnabled = false;
        this.sonarStopTimestamp = null;
        this.mapWarp = {
            scale: 1,
            alpha: 1,
            transition: null,
            fadeMode: null
        };
    }

    async initialize(canvas, camera = this.camera, backgroundManager = this.backgroundManager) {
        if (!canvas?.getContext) {
            throw new Error('[WorldRenderer] canvas is required.');
        }

        this.canvas = canvas;
        this.camera = camera;
        this.backgroundManager = backgroundManager;
        this.#fitCanvas();
        this.context = canvas.getContext('2d');
        if (!this.context) {
            throw new Error('[WorldRenderer] 2D context is required.');
        }

        this.backgroundManager.initialize(this.#getView());
        this.render();
        this.#startRenderLoop();
    }

    setSector(sector) {
        this.targetSector = sector;
        this.render();
    }

    setSoundController(soundController) {
        this.soundController = soundController || null;
    }

    clearSector() {
        this.targetSector = null;
        this.render();
    }

    startNavigation(rocket) {
        this.navigationRocket = rocket || null;
        this.hideNavigationRocketBody = false;
        this.render();
    }

    setAimRocket(rocket) {
        this.aimRocket = rocket || null;
        this.render();
    }

    clearAimRocket() {
        this.aimRocket = null;
        this.render();
    }

    setPredictionPath(points = []) {
        this.predictionPath = Array.isArray(points)
            ? points.map(point => ({ x: point.x, y: point.y }))
            : [];
        this.render();
    }

    clearPredictionPath() {
        this.predictionPath = [];
        this.render();
    }

    resetMapWarp() {
        this.mapWarp.scale = 1;
        this.mapWarp.alpha = 1;
        this.mapWarp.transition = null;
        this.mapWarp.fadeMode = null;
        this.render();
    }

    enableSonar() {
        this.sonarEnabled = true;
        this.sonarStopTimestamp = null;
        this.render();
    }

    disableSonar() {
        this.sonarEnabled = false;
        this.sonarStopTimestamp = this.#getView().timestamp;
        this.render();
    }

    playFinishAnimation() {
        const rocket = this.navigationRocket;
        if (!rocket) {
            return Promise.resolve();
        }

        this.hideNavigationRocketBody = true;
        const startTimestamp = this.#getView().timestamp;
        return new Promise(resolve => {
            const step = timestamp => {
                const currentTimestamp = Number.isFinite(timestamp)
                    ? timestamp
                    : this.#getView().timestamp;
                rocket.recordTrailPoint?.(rocket.position);
                this.render();

                if (currentTimestamp - startTimestamp >= FINISH_ANIMATION_DURATION) {
                    this.navigationRocket = null;
                    this.hideNavigationRocketBody = false;
                    this.render();
                    resolve();
                    return;
                }

                this.#requestAnimationFrame(step);
            };

            this.#requestAnimationFrame(step);
        });
    }

    handleResize() {
        this.#fitCanvas();
        this.camera?.handleResize?.(this.canvas.width, this.canvas.height);
        this.backgroundManager.handleResize(this.#getView());
        this.render();
    }

    setRenderLoopActive(isActive) {
        const nextActive = !!isActive;
        if (this.renderLoopActive === nextActive) {
            return;
        }

        this.renderLoopActive = nextActive;
        if (!nextActive) {
            if (this.animationFrameId !== null && typeof globalThis.cancelAnimationFrame === 'function') {
                globalThis.cancelAnimationFrame(this.animationFrameId);
            }
            this.animationFrameId = null;
            return;
        }

        this.lastRenderTimestamp = null;
        this.#startRenderLoop();
    }

    render() {
        if (!this.canvas || !this.context) {
            return;
        }

        this.#fitCanvas();
        const colors = this.colorPalette.createWorldColors();
        const deltaSeconds = this.#consumeDeltaSeconds();
        this.backgroundManager.update?.(deltaSeconds);
        this.#updateMapWarp(deltaSeconds);
        this.#expireStoppedSonar();
        this.backgroundManager.render(this.context, this.#getView());
        if (!this.targetSector) {
            return;
        }

        this.context.save();
        this.context.globalAlpha *= this.#getMapWarpAlpha();
        const transform = this.#createTransform();
        const view = this.#getView();
        const activeRocket = this.navigationRocket || this.aimRocket;
        this.sectorMapRenderer.render(this.context, this.targetSector, transform, colors, {
            timestamp: view.timestamp,
            activeRocket
        });
        this.flightVisualRenderer.render(this.context, transform, view, {
            navigationRocket: activeRocket,
            predictionPath: this.predictionPath,
            hideRocketBody: this.hideNavigationRocketBody,
            sonarEnabled: this.sonarEnabled,
            sonarStopTimestamp: this.sonarStopTimestamp
        }, colors);
        this.context.restore();
    }

    worldToViewport(worldPoint) {
        if (!this.canvas) {
            throw new Error('[WorldRenderer] canvas is required to convert world coordinates.');
        }

        const canvasRect = this.canvas.getBoundingClientRect?.();
        if (!canvasRect?.width || !canvasRect?.height) {
            throw new Error('[WorldRenderer] measurable canvas is required to convert world coordinates.');
        }

        const screenPoint = this.#createTransform().toScreen(worldPoint);
        return {
            x: canvasRect.left + screenPoint.x * (canvasRect.width / this.canvas.width),
            y: canvasRect.top + screenPoint.y * (canvasRect.height / this.canvas.height)
        };
    }

    startWarpEffect(duration = 0, options = {}) {
        const direction = options.direction || 'forward';
        if (direction === 'reverse') {
            this.backgroundManager.startReverseWarpEffect(duration);
            this.mapWarp.fadeMode = 'gameEndExit';
            this.#setMapWarpTransition({
                fromScale: this.mapWarp.scale,
                toScale: GAME_END_EXIT_SCALE,
                fromAlpha: this.mapWarp.alpha,
                toAlpha: 1,
                duration,
                easing: progress => 1 - ((1 - progress) ** 3)
            });
        } else {
            this.backgroundManager.startWarpEffect(duration);
            this.mapWarp.fadeMode = null;
            this.#setMapWarpTransition({
                fromScale: this.mapWarp.scale,
                toScale: WARP_OUT_SCALE,
                fromAlpha: this.mapWarp.alpha,
                toAlpha: 0,
                duration,
                easing: progress => progress ** 3
            });
        }

        this.soundController?.startWarpEffect?.(this.#toSeconds(duration), { direction });
        this.render();
    }

    stopWarpEffect(duration = 0, options = {}) {
        this.backgroundManager.stopWarpEffect(duration);
        this.mapWarp.fadeMode = null;
        this.#setMapWarpTransition({
            fromScale: options.fromCurrent ? this.mapWarp.scale : WARP_IN_START_SCALE,
            toScale: 1,
            fromAlpha: options.fromCurrent ? this.mapWarp.alpha : 1,
            toAlpha: 1,
            duration,
            easing: progress => 1 - ((1 - progress) ** 3)
        });
        this.soundController?.stopWarpEffect?.(this.#toSeconds(duration));
        this.render();
    }

    #fitCanvas() {
        const width = this.canvas.clientWidth || this.canvas.width || 960;
        const height = this.canvas.clientHeight || this.canvas.height || 720;
        const scale = globalThis.devicePixelRatio || 1;

        this.canvas.width = Math.max(1, Math.round(width * scale));
        this.canvas.height = Math.max(1, Math.round(height * scale));
        this.camera?.handleResize?.(this.canvas.width, this.canvas.height);
    }

    #getView() {
        return {
            width: this.canvas?.width ?? 960,
            height: this.canvas?.height ?? 720,
            rotation: this.camera?.rotation ?? 0,
            offset: this.camera?.position ?? { x: 0, y: 0 },
            zoomLevel: this.camera?.zoomLevel ?? 1,
            timestamp: globalThis.performance?.now?.() ?? Date.now()
        };
    }

    #consumeDeltaSeconds() {
        const now = globalThis.performance?.now?.() ?? Date.now();
        if (this.lastRenderTimestamp === null) {
            this.lastRenderTimestamp = now;
            return 0;
        }

        const deltaSeconds = Math.max(0, (now - this.lastRenderTimestamp) / 1000);
        this.lastRenderTimestamp = now;
        return Math.min(deltaSeconds, 0.1);
    }

    #startRenderLoop() {
        if (!this.renderLoopActive || this.animationFrameId !== null || typeof globalThis.requestAnimationFrame !== 'function') {
            return;
        }

        this.animationFrameId = globalThis.requestAnimationFrame(() => this.#renderFrame());
    }

    #requestAnimationFrame(callback) {
        if (typeof globalThis.requestAnimationFrame === 'function') {
            return globalThis.requestAnimationFrame(callback);
        }

        return globalThis.setTimeout(() => callback(this.#getView().timestamp), 16);
    }

    #renderFrame() {
        if (!this.renderLoopActive) {
            this.animationFrameId = null;
            return;
        }

        this.animationFrameId = null;
        this.render();
        this.#startRenderLoop();
    }

    #createTransform() {
        const warpScale = this.mapWarp.scale;
        if (this.camera) {
            return {
                scale: this.camera.zoomLevel * warpScale,
                rotation: this.camera.rotation ?? 0,
                toScreen: point => this.#applyMapWarp(this.camera.toScreen(point)),
                radius: value => value * this.camera.zoomLevel * warpScale
            };
        }

        return {
            scale: WORLD_VIEW_SCALE * warpScale,
            rotation: 0,
            centerX: this.canvas.width / 2,
            centerY: this.canvas.height / 2,
            toScreen(point) {
                return {
                    x: this.centerX + point.x * this.scale,
                    y: this.centerY + point.y * this.scale
                };
            },
            radius(value) {
                return value * this.scale;
            }
        };
    }

    #applyMapWarp(point) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        return {
            x: centerX + (point.x - centerX) * this.mapWarp.scale,
            y: centerY + (point.y - centerY) * this.mapWarp.scale
        };
    }

    #setMapWarpTransition({ fromScale, toScale, fromAlpha, toAlpha, duration, easing }) {
        if (!duration || duration <= 0) {
            this.mapWarp.scale = toScale;
            this.mapWarp.alpha = toAlpha;
            this.mapWarp.transition = null;
            return;
        }

        this.mapWarp.scale = fromScale;
        this.mapWarp.alpha = fromAlpha;
        this.mapWarp.transition = {
            fromScale,
            toScale,
            fromAlpha,
            toAlpha,
            elapsed: 0,
            duration: duration / 1000,
            easing
        };
    }

    #updateMapWarp(deltaSeconds) {
        if (!this.mapWarp.transition || deltaSeconds <= 0) {
            return;
        }

        const transition = this.mapWarp.transition;
        transition.elapsed += deltaSeconds;
        const progress = Math.min(1, transition.elapsed / transition.duration);
        const eased = transition.easing(progress);

        this.mapWarp.scale = this.#lerp(transition.fromScale, transition.toScale, eased);
        this.mapWarp.alpha = this.#lerp(transition.fromAlpha, transition.toAlpha, eased);

        if (progress >= 1) {
            this.mapWarp.scale = transition.toScale;
            this.mapWarp.alpha = transition.toAlpha;
            this.mapWarp.transition = null;
        }
    }

    #getMapWarpAlpha() {
        if (this.mapWarp.fadeMode !== 'gameEndExit') {
            return this.mapWarp.alpha;
        }

        if (this.mapWarp.scale >= GAME_END_FADE_START_SCALE) {
            return this.mapWarp.alpha;
        }
        if (this.mapWarp.scale <= GAME_END_FADE_END_SCALE) {
            return 0;
        }

        const progress = (this.mapWarp.scale - GAME_END_FADE_END_SCALE)
            / (GAME_END_FADE_START_SCALE - GAME_END_FADE_END_SCALE);
        return this.mapWarp.alpha * progress;
    }

    #lerp(from, to, progress) {
        return from + (to - from) * progress;
    }

    #toSeconds(durationMs) {
        return Math.max(0, durationMs ?? 0) / 1000;
    }

    #expireStoppedSonar() {
        if (this.sonarEnabled || !Number.isFinite(this.sonarStopTimestamp)) {
            return;
        }

        if (this.#getView().timestamp - this.sonarStopTimestamp >= SONAR_RIPPLE_DURATION) {
            this.sonarStopTimestamp = null;
        }
    }

}

export default WorldRenderer;
