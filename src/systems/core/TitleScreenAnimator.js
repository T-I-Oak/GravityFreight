import CanvasColorPalette from './CanvasColorPalette.js';

const TRAIL_LIMIT = 60;
const ORBIT_SHORT_AXIS_RATIO = 0.35;
const ORBIT_DIAMETER_RATIO = 0.64;
const ORBIT_SAFE_MARGIN = 48;
const BACK_ORBIT_SCALE = 0.72;
const ANGULAR_SPEED = 0.9;
const CARGO_TRAIL_GAP = 4;
const ROCKET_NOSE_X = 10;
const ROCKET_TAIL_X = -6;
const ROCKET_HALF_HEIGHT = 5;
const CARGO_RADIUS = 3;
const MIN_DIRECTION_DISTANCE = 0.001;

class TitleScreenAnimator {
    constructor(options = {}) {
        this.backgroundCanvas = null;
        this.foregroundCanvas = null;
        this.backgroundContext = null;
        this.foregroundContext = null;
        this.backgroundManager = null;
        this.colorPalette = options.colorPalette || new CanvasColorPalette();
        this.requestAnimationFrame = options.requestAnimationFrame || globalThis.requestAnimationFrame?.bind(globalThis);
        this.cancelAnimationFrame = options.cancelAnimationFrame || globalThis.cancelAnimationFrame?.bind(globalThis);
        this.now = options.now || (() => globalThis.performance?.now?.() ?? Date.now());
        this.phase = 0;
        this.trail = [];
        this.isRunning = false;
        this.animationFrameId = null;
        this.lastTimestamp = null;
    }

    initialize(canvases, backgroundManager) {
        if (!canvases?.background?.getContext || !canvases?.foreground?.getContext) {
            throw new Error('[TitleScreenAnimator] title canvases are required.');
        }
        if (!backgroundManager) {
            throw new Error('[TitleScreenAnimator] backgroundManager is required.');
        }

        this.backgroundCanvas = canvases.background;
        this.foregroundCanvas = canvases.foreground;
        this.backgroundContext = this.backgroundCanvas.getContext('2d');
        this.foregroundContext = this.foregroundCanvas.getContext('2d');
        if (!this.backgroundContext || !this.foregroundContext) {
            throw new Error('[TitleScreenAnimator] 2D contexts are required.');
        }

        this.backgroundManager = backgroundManager;
        this.#fitCanvases();
        if (!Array.isArray(this.backgroundManager.stars) || this.backgroundManager.stars.length === 0) {
            this.backgroundManager.initialize?.(this.#createTitleView(this.now()));
        }
    }

    start() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        this.lastTimestamp = this.now();
        this.animationFrameId = this.#requestFrame(timestamp => this.#renderFrame(timestamp));
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId !== null && this.cancelAnimationFrame) {
            this.cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = null;
    }

    handleResize() {
        this.#fitCanvases();
        this.backgroundManager?.handleResize?.(this.#createTitleView(this.now()));
    }

    render(deltaSeconds = 0, timestamp = this.now()) {
        if (!this.backgroundCanvas || !this.foregroundCanvas) {
            return;
        }

        this.#fitCanvases();
        const view = this.#createTitleView(timestamp);
        this.backgroundManager.update?.(deltaSeconds);
        this.backgroundManager.render?.(this.backgroundContext, view);
        this.foregroundContext.clearRect(0, 0, view.width, view.height);
        this.#updateOrbit(deltaSeconds, view);
        this.#drawTrail(this.backgroundContext, false);
        this.#drawTrail(this.foregroundContext, true);
        this.#drawCargo(false);
        this.#drawCargo(true);
        this.#drawRocket(false);
        this.#drawRocket(true);
    }

    #renderFrame(timestamp) {
        if (!this.isRunning) {
            return;
        }

        const currentTimestamp = Number.isFinite(timestamp) ? timestamp : this.now();
        const deltaSeconds = this.lastTimestamp === null
            ? 0
            : Math.min(0.1, Math.max(0, (currentTimestamp - this.lastTimestamp) / 1000));
        this.lastTimestamp = currentTimestamp;
        this.render(deltaSeconds, currentTimestamp);
        this.animationFrameId = this.#requestFrame(nextTimestamp => this.#renderFrame(nextTimestamp));
    }

    #requestFrame(callback) {
        if (this.requestAnimationFrame) {
            return this.requestAnimationFrame(callback);
        }

        return globalThis.setTimeout(() => callback(this.now()), 16);
    }

    #fitCanvases() {
        [this.backgroundCanvas, this.foregroundCanvas].forEach(canvas => {
            if (!canvas) {
                return;
            }
            const width = canvas.clientWidth || canvas.width || 960;
            const height = canvas.clientHeight || canvas.height || 720;
            const scale = globalThis.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
        });
    }

    #createTitleView(timestamp) {
        return {
            width: this.backgroundCanvas?.width ?? 960,
            height: this.backgroundCanvas?.height ?? 720,
            rotation: 0,
            offset: { x: 0, y: 0 },
            zoomLevel: 1,
            timestamp
        };
    }

    #updateOrbit(deltaSeconds, view) {
        this.phase += ANGULAR_SPEED * deltaSeconds;
        const orbit = this.#createOrbit(view);
        const cosPhase = Math.cos(this.phase);
        const sinPhase = Math.sin(this.phase);
        const depthScale = this.#depthScale(sinPhase);
        const localX = orbit.majorRadius * cosPhase * depthScale;
        const localY = orbit.minorRadius * sinPhase * depthScale;
        const tangentX = -orbit.majorRadius * sinPhase;
        const tangentY = orbit.minorRadius * cosPhase;
        const cos = Math.cos(orbit.angle);
        const sin = Math.sin(orbit.angle);
        const x = orbit.centerX + localX * cos - localY * sin;
        const y = orbit.centerY + localX * sin + localY * cos;
        const fallbackAngle = Math.atan2(tangentX * sin + tangentY * cos, tangentX * cos - tangentY * sin);
        const angle = this.#resolveScreenMovementAngle(x, y, fallbackAngle);

        this.trail.push({
            x,
            y,
            angle,
            isFront: sinPhase > 0
        });
        if (this.trail.length > TRAIL_LIMIT) {
            this.trail.shift();
        }
    }

    #resolveScreenMovementAngle(x, y, fallbackAngle) {
        const previous = this.trail.at(-1);
        if (!previous) {
            return fallbackAngle;
        }

        const dx = x - previous.x;
        const dy = y - previous.y;
        if (Math.hypot(dx, dy) <= MIN_DIRECTION_DISTANCE) {
            return fallbackAngle;
        }

        return Math.atan2(dy, dx);
    }

    #createOrbit(view) {
        const diagonal = Math.hypot(view.width, view.height);
        const angle = -Math.atan2(view.height, view.width);
        const safeMajorRadius = this.#safeMajorRadius(view, angle);
        const designMajorRadius = Math.min(
            diagonal * ORBIT_DIAMETER_RATIO * 0.5,
            Math.min(view.width, view.height) * 0.45
        );
        const majorRadius = Math.min(safeMajorRadius, designMajorRadius);
        return {
            centerX: view.width / 2,
            centerY: view.height * 0.52,
            majorRadius,
            minorRadius: majorRadius * ORBIT_SHORT_AXIS_RATIO,
            angle
        };
    }

    #drawTrail(context, isFront) {
        if (this.trail.length < 2) {
            return;
        }

        context.save();
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = this.#getColor('trail', 'rgba(255, 255, 255, 0.52)');
        context.shadowBlur = 6;
        context.shadowColor = context.strokeStyle;
        for (let index = 1; index < this.trail.length; index += 1) {
            const from = this.trail[index - 1];
            const to = this.trail[index];
            if (to.isFront !== isFront) {
                continue;
            }
            const alpha = index / this.trail.length;
            context.globalAlpha = alpha * 0.8;
            context.beginPath();
            context.moveTo(from.x, from.y);
            context.lineTo(to.x, to.y);
            context.stroke();
        }
        context.restore();
    }

    #safeMajorRadius(view, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const ratio = ORBIT_SHORT_AXIS_RATIO;
        const xFactor = Math.hypot(cos, ratio * sin);
        const yFactor = Math.hypot(sin, ratio * cos);
        const horizontal = Math.max(1, (view.width / 2 - ORBIT_SAFE_MARGIN) / xFactor);
        const vertical = Math.max(1, (view.height / 2 - ORBIT_SAFE_MARGIN) / yFactor);
        return Math.min(horizontal, vertical);
    }

    #depthScale(sinPhase) {
        const frontProgress = (sinPhase + 1) / 2;
        return BACK_ORBIT_SCALE + (1 - BACK_ORBIT_SCALE) * frontProgress;
    }

    #drawCargo(isFront) {
        const point = this.trail[this.trail.length - 1 - CARGO_TRAIL_GAP];
        if (!point || point.isFront !== isFront) {
            return;
        }

        const context = isFront ? this.foregroundContext : this.backgroundContext;
        context.save();
        context.fillStyle = this.#getCargoColor();
        context.shadowBlur = 8;
        context.shadowColor = context.fillStyle;
        context.beginPath();
        context.arc(point.x, point.y, CARGO_RADIUS, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    #drawRocket(isFront) {
        const point = this.trail[this.trail.length - 1];
        if (!point || point.isFront !== isFront) {
            return;
        }

        const context = isFront ? this.foregroundContext : this.backgroundContext;
        context.save();
        context.translate(point.x, point.y);
        context.rotate(point.angle);
        context.fillStyle = '#ffffff';
        context.shadowBlur = 15;
        context.shadowColor = this.#getColor('rocket', '#00ffcc');
        context.beginPath();
        context.moveTo(ROCKET_NOSE_X, 0);
        context.lineTo(ROCKET_TAIL_X, ROCKET_HALF_HEIGHT);
        context.lineTo(ROCKET_TAIL_X, -ROCKET_HALF_HEIGHT);
        context.closePath();
        context.fill();
        context.restore();
    }

    #getColor(name, fallback) {
        try {
            return this.colorPalette.get?.(name) || fallback;
        } catch {
            return fallback;
        }
    }

    #getCargoColor() {
        try {
            return this.colorPalette.createWorldColors?.().categories?.cargo || '#66e6ff';
        } catch {
            return '#66e6ff';
        }
    }
}

export default TitleScreenAnimator;
