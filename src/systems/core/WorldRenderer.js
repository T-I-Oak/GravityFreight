import BackgroundManager from './BackgroundManager.js';

const WORLD_VIEW_SCALE = 0.5;
const MAP_COLORS = {
    boundary: 'rgba(255, 255, 255, 0.24)',
    homeStar: '#ff6600',
    normalStar: '#ffcc00',
    repulsiveStar: '#e100ff',
    categories: {
        CHASSIS: '#90a4ae',
        LOGIC: '#4488ff',
        LAUNCHERS: '#4caf50',
        MODULES: '#9c27b0',
        BOOSTERS: '#8d6e63',
        ROCKETS: '#81ecec',
        COIN: '#ffd700',
        CARGO: '#00e5ff',
        MARKET: '#ff4d4d'
    },
    facilities: {
        TRADING_POST: '#00e676',
        REPAIR_DOCK: '#2979ff',
        BLACK_MARKET: '#ff1744'
    }
};

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
        this.backgroundManager = options.backgroundManager || new BackgroundManager();
        this.lastRenderTimestamp = null;
        this.animationFrameId = null;
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

    startNavigation() {}

    enableSonar() {}

    disableSonar() {}

    playFinishAnimation() {
        return Promise.resolve();
    }

    handleResize() {
        this.#fitCanvas();
        this.camera?.handleResize?.(this.canvas.width, this.canvas.height);
        this.backgroundManager.handleResize(this.#getView());
        this.render();
    }

    render() {
        if (!this.canvas || !this.context) {
            return;
        }

        this.#fitCanvas();
        this.backgroundManager.update?.(this.#consumeDeltaSeconds());
        this.backgroundManager.render(this.context, this.#getView());
        if (!this.targetSector) {
            return;
        }

        this.#drawBoundary();
        this.#drawExits();
        this.#drawBodies();
    }

    startWarpEffect() {
        this.backgroundManager.startWarpEffect();
        this.render();
    }

    stopWarpEffect() {
        this.backgroundManager.stopWarpEffect();
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
        if (this.animationFrameId !== null || typeof globalThis.requestAnimationFrame !== 'function') {
            return;
        }

        this.animationFrameId = globalThis.requestAnimationFrame(() => this.#renderFrame());
    }

    #renderFrame() {
        this.animationFrameId = null;
        this.render();
        this.#startRenderLoop();
    }

    #createTransform() {
        if (this.camera) {
            return {
                scale: this.camera.zoomLevel,
                rotation: this.camera.rotation ?? 0,
                toScreen: point => this.camera.toScreen(point),
                radius: value => value * this.camera.zoomLevel
            };
        }

        return {
            scale: WORLD_VIEW_SCALE,
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

    #drawBoundary() {
        const exit = this.targetSector.exits[0];
        if (!exit) {
            return;
        }

        const transform = this.#createTransform();
        const center = transform.toScreen({ x: 0, y: 0 });

        this.context.save();
        this.context.beginPath();
        this.context.arc(center.x, center.y, transform.radius(exit.radius), 0, Math.PI * 2);
        this.context.strokeStyle = MAP_COLORS.boundary;
        this.context.lineWidth = Math.max(1, transform.scale);
        this.context.stroke();
        this.context.restore();
    }

    #drawExits() {
        const transform = this.#createTransform();
        const center = transform.toScreen({ x: 0, y: 0 });

        this.targetSector.exits.forEach(exit => {
            const start = (exit.angle - exit.width / 2) * Math.PI / 180 + transform.rotation;
            const end = (exit.angle + exit.width / 2) * Math.PI / 180 + transform.rotation;
            const color = this.#facilityColor(exit.getFacilityType());

            this.context.save();
            this.context.beginPath();
            this.context.arc(center.x, center.y, transform.radius(exit.radius), start, end);
            this.context.strokeStyle = color;
            this.context.lineWidth = Math.max(2, 6 * transform.scale);
            this.context.shadowBlur = 15 * transform.scale;
            this.context.shadowColor = color;
            this.context.stroke();
            this.context.restore();

            this.#drawFacilityLabel(exit, transform, center);
        });
    }

    #drawFacilityLabel(exit, transform, center) {
        const type = exit.getFacilityType();
        const label = FACILITY_LABELS[type] || type;
        const angle = exit.angle * Math.PI / 180 + transform.rotation;
        const color = this.#facilityColor(type);
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

    #drawBodies() {
        const transform = this.#createTransform();

        this.targetSector.bodies.forEach(body => {
            const position = transform.toScreen(body.position);
            const radius = Math.max(4, transform.radius(body.radius));
            const color = this.#bodyColor(body);

            this.context.save();
            this.context.shadowBlur = 20 * transform.scale;
            this.context.shadowColor = color;
            this.context.fillStyle = color;
            this.context.beginPath();
            this.context.arc(position.x, position.y, radius, 0, Math.PI * 2);
            this.context.fill();
            this.context.restore();

            if (body.items.length > 0) {
                this.#drawItemRings(body, position, radius, transform);
            }
        });
    }

    #drawItemRings(body, position, radius, transform) {
        const items = body.items || [];
        const angleStep = (Math.PI * 2) / items.length;

        items.forEach((item, index) => {
            const category = this.#resolveItemCategory(item);
            const color = MAP_COLORS.categories[category];
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

    #facilityColor(type) {
        return MAP_COLORS.facilities[type] || '#ffffff';
    }

    #bodyColor(body) {
        if (body.isHome) return MAP_COLORS.homeStar;
        if (body.isRepulsion) return MAP_COLORS.repulsiveStar;
        return MAP_COLORS.normalStar;
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
