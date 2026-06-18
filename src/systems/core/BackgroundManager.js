import CanvasColorPalette from './CanvasColorPalette.js';

const DEFAULT_STAR_COUNT = 400;
const NORMAL_WARP_SPEED = 1;
const ACTIVE_WARP_SPEED = 100;
const STAR_FIELD_RANGE = 2000;
const STAR_MAX_DEPTH = 2000;
const STAR_PROJECTION_SCALE = 200;
const BASE_DEPTH_SPEED = 0.1;
const STAR_WRAP_MIN_DEPTH = 1200;
const STAR_WRAP_DEPTH_RANGE = 800;
const STAR_REVERSE_WRAP_MIN_DEPTH = 80;
const STAR_REVERSE_WRAP_DEPTH_RANGE = 320;
const MIN_STREAK_LENGTH = 1.2;
const MAX_WARP_BRIGHTNESS_BOOST = 0.6;

class BackgroundManager {
    constructor(options = {}) {
        this.starCount = options.starCount ?? DEFAULT_STAR_COUNT;
        this.seed = options.seed ?? 1;
        this.seedState = this.seed;
        this.stars = [];
        this.colorPalette = options.colorPalette || new CanvasColorPalette();
        this.warpSpeed = NORMAL_WARP_SPEED;
        this.targetWarpSpeed = NORMAL_WARP_SPEED;
        this.warpTransition = null;
    }

    initialize(view = {}) {
        this.seedState = this.seed;

        this.stars = Array.from({ length: this.starCount }, () => {
            const star = this.#createStar();
            star.z = Math.max(1, this.#nextRandom() * STAR_MAX_DEPTH);
            return star;
        });
    }

    update(deltaSeconds = 0) {
        if (deltaSeconds <= 0) {
            return;
        }

        this.#updateWarpSpeed(deltaSeconds);
        const depthStep = BASE_DEPTH_SPEED * this.warpSpeed * (deltaSeconds * 60);

        this.stars.forEach(star => {
            star.previousZ = star.z;
            star.wrapped = false;
            star.z -= depthStep;
            if (star.z <= 0) {
                this.#resetStarToDeepSpace(star);
                star.wrapped = true;
            }
            if (this.warpSpeed < 0 && star.z > STAR_MAX_DEPTH) {
                this.#resetStarToNearSpace(star);
                star.wrapped = true;
            }
        });
    }

    render(context, view = {}) {
        const width = view.width ?? context.canvas?.width ?? 960;
        const height = view.height ?? context.canvas?.height ?? 720;
        const projection = this.#createProjection(view);

        context.fillStyle = this.colorPalette.get('worldBg');
        context.fillRect(0, 0, width, height);

        this.stars.forEach(star => {
            const point = projection(star);
            if (!point) {
                return;
            }

            if (!point.wrapped && Math.abs(this.warpSpeed) > 1.1 && point.streakLength >= MIN_STREAK_LENGTH) {
                context.beginPath();
                context.moveTo(point.oldX, point.oldY);
                context.lineTo(point.x, point.y);
                context.strokeStyle = this.colorPalette.createStarParticleColor(point.alpha);
                context.lineWidth = Math.max(0.8, point.size * 0.4);
                context.stroke();
                return;
            }

            this.#drawStarPoint(context, point);
        });
    }

    startWarpEffect(duration = 0) {
        this.#setWarpTarget(ACTIVE_WARP_SPEED, duration);
    }

    startReverseWarpEffect(duration = 0) {
        this.#setWarpTarget(-ACTIVE_WARP_SPEED, duration);
    }

    stopWarpEffect(duration = 0) {
        this.#setWarpTarget(NORMAL_WARP_SPEED, duration);
    }

    handleResize(view = {}) {
        if (this.stars.length === 0) {
            this.initialize(view);
        }
    }

    #nextSeed(value) {
        return (value * 1664525 + 1013904223) >>> 0;
    }

    #normalizeSeed(value) {
        return value / 0xFFFFFFFF;
    }

    #nextRandom() {
        this.seedState = this.#nextSeed(this.seedState);
        return this.#normalizeSeed(this.seedState);
    }

    #createStar() {
        return {
            x: (this.#nextRandom() - 0.5) * STAR_FIELD_RANGE,
            y: (this.#nextRandom() - 0.5) * STAR_FIELD_RANGE,
            z: Math.max(1, this.#nextRandom() * STAR_MAX_DEPTH),
            size: this.#nextRandom() * 1.5 + 0.5,
            alpha: this.#nextRandom() * 0.7 + 0.3,
            pulseRate: 0.5 + this.#nextRandom() * 2.0,
            pulseOffset: this.#nextRandom() * Math.PI * 2,
            previousZ: null,
            wrapped: false
        };
    }

    #resetStarToDeepSpace(star) {
        const nextStar = this.#createStar();
        Object.assign(star, nextStar, {
            z: STAR_WRAP_MIN_DEPTH + this.#nextRandom() * STAR_WRAP_DEPTH_RANGE
        });
    }

    #resetStarToNearSpace(star) {
        const nextStar = this.#createStar();
        Object.assign(star, nextStar, {
            z: STAR_REVERSE_WRAP_MIN_DEPTH + this.#nextRandom() * STAR_REVERSE_WRAP_DEPTH_RANGE
        });
    }

    #setWarpTarget(targetSpeed, duration) {
        this.targetWarpSpeed = targetSpeed;
        if (!duration || duration <= 0) {
            this.warpSpeed = targetSpeed;
            this.warpTransition = null;
            return;
        }

        this.warpTransition = {
            from: this.warpSpeed,
            to: targetSpeed,
            elapsed: 0,
            duration: duration / 1000
        };
    }

    #updateWarpSpeed(deltaSeconds) {
        if (!this.warpTransition) {
            return;
        }

        this.warpTransition.elapsed += deltaSeconds;
        const progress = Math.min(1, this.warpTransition.elapsed / this.warpTransition.duration);
        this.warpSpeed = this.#lerp(this.warpTransition.from, this.warpTransition.to, progress);

        if (progress >= 1) {
            this.warpSpeed = this.warpTransition.to;
            this.warpTransition = null;
        }
    }

    #lerp(from, to, progress) {
        return from + (to - from) * progress;
    }

    #drawStarPoint(context, point) {
        context.fillStyle = this.colorPalette.createStarParticleColor(point.alpha);
        context.beginPath();
        context.arc(point.x, point.y, point.size * 0.45, 0, Math.PI * 2);
        context.fill();
    }

    #createProjection(view = {}) {
        const width = view.width ?? 960;
        const height = view.height ?? 720;
        const centerX = width / 2;
        const centerY = height / 2;
        const rotation = view.rotation ?? 0;
        const offset = view.offset ?? { x: 0, y: 0 };
        const zoomLevel = view.zoomLevel ?? 1;
        const timestamp = view.timestamp ?? 0;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        return star => {
            const scale = STAR_PROJECTION_SCALE / Math.max(1, star.z);
            const oldZ = star.previousZ ?? star.z;
            const oldScale = STAR_PROJECTION_SCALE / Math.max(1, oldZ);
            const rx = star.x * cos - star.y * sin;
            const ry = star.x * sin + star.y * cos;
            const x = centerX + (rx * scale - offset.x * 0.2) * zoomLevel;
            const y = centerY + (ry * scale - offset.y * 0.2) * zoomLevel;

            if (x < 0 || x > width || y < 0 || y > height) {
                return null;
            }

            const twinkle = 0.8 + 0.2 * Math.sin((timestamp / 1000) * star.pulseRate + star.pulseOffset);
            const depthRate = Math.max(0, Math.min(1, 1 - star.z / STAR_MAX_DEPTH));
            const depthBrightness = 0.15 + 0.85 * depthRate;
            const alpha = Math.min(1, depthBrightness * star.alpha * twinkle * this.#getWarpBrightnessMultiplier());
            const size = Math.max(0.8, Math.min(4, star.size * scale * 1.2));

            const oldX = centerX + (rx * oldScale - offset.x * 0.2) * zoomLevel;
            const oldY = centerY + (ry * oldScale - offset.y * 0.2) * zoomLevel;

            return {
                x,
                y,
                oldX,
                oldY,
                alpha,
                size,
                streakLength: Math.hypot(x - oldX, y - oldY),
                wrapped: star.wrapped
            };
        };
    }

    #getWarpBrightnessMultiplier() {
        const warpAmount = Math.max(0, Math.abs(this.warpSpeed) - NORMAL_WARP_SPEED);
        const progress = Math.min(1, warpAmount / (ACTIVE_WARP_SPEED - NORMAL_WARP_SPEED));
        return 1 + MAX_WARP_BRIGHTNESS_BOOST * progress;
    }
}

export default BackgroundManager;
