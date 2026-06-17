import BackgroundManager from './BackgroundManager.js';
import CanvasColorPalette from './CanvasColorPalette.js';
import FlightVisualRenderer from './FlightVisualRenderer.js';

const WORLD_VIEW_SCALE = 0.5;
const WARP_OUT_SCALE = 100;
const WARP_IN_START_SCALE = 0.01;
const FINISH_ANIMATION_DURATION = 2000;
const SONAR_RIPPLE_DURATION = 2000;

const FACILITY_LABELS = {
    TRADING_POST: 'TRADING POST',
    REPAIR_DOCK: 'REPAIR DOCK',
    BLACK_MARKET: 'BLACK MARKET'
};

class WorldRenderer {
    constructor(options = {}) {
        this.canvas = null;
        this.context = null;
        this.targetSector = null;
        this.camera = options.camera || null;
        this.colorPalette = options.colorPalette || new CanvasColorPalette();
        this.backgroundManager = options.backgroundManager || new BackgroundManager({ colorPalette: this.colorPalette });
        this.flightVisualRenderer = options.flightVisualRenderer || new FlightVisualRenderer();
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
            transition: null
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
        this.context.globalAlpha *= this.mapWarp.alpha;
        this.#drawBoundary(colors);
        this.#drawExits(colors);
        this.#drawBodies(colors);
        this.flightVisualRenderer.render(this.context, this.#createTransform(), this.#getView(), {
            navigationRocket: this.navigationRocket || this.aimRocket,
            predictionPath: this.predictionPath,
            hideRocketBody: this.hideNavigationRocketBody,
            sonarEnabled: this.sonarEnabled,
            sonarStopTimestamp: this.sonarStopTimestamp
        }, colors);
        this.context.restore();
    }

    startWarpEffect(duration = 0) {
        this.backgroundManager.startWarpEffect(duration);
        this.#setMapWarpTransition({
            fromScale: this.mapWarp.scale,
            toScale: WARP_OUT_SCALE,
            fromAlpha: this.mapWarp.alpha,
            toAlpha: 0,
            duration,
            easing: progress => progress ** 3
        });
        this.render();
    }

    stopWarpEffect(duration = 0) {
        this.backgroundManager.stopWarpEffect(duration);
        this.#setMapWarpTransition({
            fromScale: WARP_IN_START_SCALE,
            toScale: 1,
            fromAlpha: 1,
            toAlpha: 1,
            duration,
            easing: progress => 1 - ((1 - progress) ** 3)
        });
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

    #lerp(from, to, progress) {
        return from + (to - from) * progress;
    }

    #expireStoppedSonar() {
        if (this.sonarEnabled || !Number.isFinite(this.sonarStopTimestamp)) {
            return;
        }

        if (this.#getView().timestamp - this.sonarStopTimestamp >= SONAR_RIPPLE_DURATION) {
            this.sonarStopTimestamp = null;
        }
    }

    #drawBoundary(colors) {
        const exit = this.targetSector.exits[0];
        if (!exit) {
            return;
        }

        const transform = this.#createTransform();
        const center = transform.toScreen({ x: 0, y: 0 });

        this.context.save();
        this.context.beginPath();
        this.context.arc(center.x, center.y, transform.radius(exit.radius), 0, Math.PI * 2);
        this.context.strokeStyle = colors.boundary;
        this.context.lineWidth = Math.max(1, transform.scale);
        this.context.stroke();
        this.context.restore();
    }

    #drawExits(colors) {
        const transform = this.#createTransform();
        const center = transform.toScreen({ x: 0, y: 0 });

        this.targetSector.exits.forEach(exit => {
            const start = (exit.angle - exit.width / 2) * Math.PI / 180 + transform.rotation;
            const end = (exit.angle + exit.width / 2) * Math.PI / 180 + transform.rotation;
            const color = this.#facilityColor(exit.getFacilityType(), colors);

            this.context.save();
            this.context.beginPath();
            this.context.arc(center.x, center.y, transform.radius(exit.radius), start, end);
            this.context.strokeStyle = color;
            this.context.lineWidth = Math.max(2, 6 * transform.scale);
            this.context.shadowBlur = 15 * transform.scale;
            this.context.shadowColor = color;
            this.context.stroke();
            this.context.restore();

            this.#drawFacilityLabel(exit, transform, center, colors);
        });
    }

    #drawFacilityLabel(exit, transform, center, colors) {
        const type = exit.getFacilityType();
        const label = FACILITY_LABELS[type] || type;
        const angle = exit.angle * Math.PI / 180 + transform.rotation;
        const color = this.#facilityColor(type, colors);
        const textRadius = transform.radius(exit.radius + 45);
        const fontSize = 30 * transform.scale;

        if (textRadius <= 0 || fontSize <= 0) {
            return;
        }

        this.context.save();
        this.context.font = `bold ${fontSize}px Orbitron, sans-serif`;
        this.context.fillStyle = color;
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        this.context.shadowBlur = 15 * transform.scale;
        this.context.shadowColor = color;

        const charWidths = [...label].map(char => this.context.measureText(char).width + 6 * transform.scale);
        const totalTextAngle = charWidths.reduce((total, width) => total + width, 0) / textRadius;
        const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const isBottom = normalized > 0 && normalized < Math.PI;
        let currentAngle = isBottom ? angle + totalTextAngle / 2 : angle - totalTextAngle / 2;

        [...label].forEach((char, index) => {
            const charWidth = charWidths[index];
            const charAngle = isBottom
                ? currentAngle - (charWidth / 2) / textRadius
                : currentAngle + (charWidth / 2) / textRadius;

            if (char !== ' ') {
                this.context.save();
                this.context.translate(
                    center.x + Math.cos(charAngle) * textRadius,
                    center.y + Math.sin(charAngle) * textRadius
                );
                this.context.rotate(isBottom ? charAngle - Math.PI / 2 : charAngle + Math.PI / 2);
                this.context.fillText(char, 0, 0);
                this.context.restore();
            }

            currentAngle += isBottom
                ? -charWidth / textRadius
                : charWidth / textRadius;
        });

        this.context.restore();
    }

    #drawBodies(colors) {
        const transform = this.#createTransform();

        this.targetSector.bodies.forEach(body => {
            const position = transform.toScreen(body.position);
            const radius = Math.max(4, transform.radius(body.radius));
            const color = this.#bodyColor(body, colors);

            this.context.save();
            this.context.shadowBlur = 20 * transform.scale;
            this.context.shadowColor = color;
            this.context.fillStyle = color;
            this.context.beginPath();
            this.context.arc(position.x, position.y, radius, 0, Math.PI * 2);
            this.context.fill();
            this.context.restore();

            if (body.items.length > 0) {
                this.#drawItemRings(body, position, radius, transform, colors);
            }
        });
    }

    #drawItemRings(body, position, radius, transform, colors) {
        const items = body.items || [];
        const angleStep = (Math.PI * 2) / items.length;

        items.forEach((item, index) => {
            const category = this.#resolveItemCategory(item);
            const color = colors.categories[category];
            if (!color) {
                return;
            }

            const startAngle = index * angleStep;
            const gap = items.length > 1 ? 0.1 : 0;
            this.context.save();
            this.context.strokeStyle = color;
            this.context.lineWidth = Math.max(1, 2 * transform.scale);
            this.context.shadowBlur = 10 * transform.scale;
            this.context.shadowColor = color;
            this.context.beginPath();
            this.context.arc(position.x, position.y, radius + 4 * transform.scale, startAngle, startAngle + angleStep - gap);
            this.context.stroke();
            this.context.restore();
        });
    }

    #facilityColor(type, colors) {
        return colors.facilities[type] || colors.rocket;
    }

    #bodyColor(body, colors) {
        if (body.isHome) return colors.homeStar;
        if (body.isRepulsion) return colors.repulsiveStar;
        return colors.normalStar;
    }

    #resolveItemCategory(item) {
        if (item?.category) {
            return item.category;
        }
        if (item?.getViewData) {
            return item.getViewData().category;
        }
        return null;
    }
}

export default WorldRenderer;
