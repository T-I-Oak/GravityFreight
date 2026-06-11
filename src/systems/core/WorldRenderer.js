import BackgroundManager from './BackgroundManager.js';
import * as PIXI from 'pixi.js';

const WORLD_VIEW_SCALE = 0.5;
const RENDERING_MODE_PIXI = 'pixi';
const RENDERING_MODE_CANVAS = 'canvas2d';
const MAP_COLORS = {
    background: 0x050510,
    boundary: 0xffffff,
    homeStar: 0xff6600,
    normalStar: 0xffcc00,
    repulsiveStar: 0xe100ff,
    rockets: 0x81ecec,
    categories: {
        CHASSIS: 0x90a4ae,
        LOGIC: 0x4488ff,
        LAUNCHERS: 0x4caf50,
        MODULES: 0x9c27b0,
        BOOSTERS: 0x8d6e63,
        ROCKETS: 0x81ecec,
        COIN: 0xffd700,
        CARGO: 0x00e5ff,
        MARKET: 0xff4d4d
    },
    facilities: {
        TRADING_POST: 0x00e676,
        REPAIR_DOCK: 0x2979ff,
        BLACK_MARKET: 0xff1744
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
        this.app = null;
        this.layers = null;
        this.targetSector = null;
        this.camera = options.camera || null;
        this.backgroundManager = options.backgroundManager || new BackgroundManager();
        this.pixiFactory = options.pixiFactory || PIXI;
        this.renderingMode = options.renderingMode || RENDERING_MODE_PIXI;
        this.lastRenderTimestamp = null;
    }

    async initialize(canvas, camera = this.camera, backgroundManager = this.backgroundManager) {
        if (!canvas?.getContext) {
            throw new Error('[WorldRenderer] canvas is required.');
        }

        this.canvas = canvas;
        this.camera = camera;
        this.backgroundManager = backgroundManager;
        this.#fitCanvas();

        if (this.renderingMode === RENDERING_MODE_PIXI) {
            await this.#initializePixi();
        } else {
            this.context = canvas.getContext('2d');
            if (!this.context) {
                throw new Error('[WorldRenderer] 2D context is required.');
            }
        }

        this.backgroundManager.initialize(this.#getView());
        this.render();
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
        if (!this.canvas) {
            return;
        }

        this.#fitCanvas();
        this.backgroundManager.update?.(this.#consumeDeltaSeconds());
        if (this.renderingMode === RENDERING_MODE_PIXI) {
            this.#renderPixi();
            return;
        }

        if (!this.context) {
            return;
        }
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

    #createTransform() {
        if (this.camera) {
            return {
                scale: this.camera.zoomLevel,
                toScreen: point => this.camera.toScreen(point),
                radius: value => value * this.camera.zoomLevel
            };
        }

        return {
            scale: WORLD_VIEW_SCALE,
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

    async #initializePixi() {
        const Application = this.pixiFactory.Application;
        const Container = this.pixiFactory.Container;
        const Graphics = this.pixiFactory.Graphics;
        const Text = this.pixiFactory.Text;

        if (!Application || !Container || !Graphics) {
            throw new Error('[WorldRenderer] PIXI factory is incomplete.');
        }

        this.app = new Application();
        await this.app.init({
            canvas: this.canvas,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: globalThis.devicePixelRatio || 1,
            resizeTo: this.canvas.parentElement || this.canvas
        });

        const background = new Graphics();
        const boundary = new Graphics();
        const exits = new Graphics();
        const bodies = new Graphics();
        const labels = new Container();
        const world = new Container();

        world.addChild(boundary);
        world.addChild(exits);
        world.addChild(bodies);
        world.addChild(labels);
        this.app.stage.addChild(background);
        this.app.stage.addChild(world);

        this.layers = {
            background,
            boundary,
            exits,
            bodies,
            labels,
            Text,
            world
        };

        this.app.ticker?.add?.(() => this.render());
    }

    #renderPixi() {
        if (!this.layers) {
            return;
        }

        this.backgroundManager.renderPixi(this.layers.background, this.#getView());
        this.layers.boundary.clear();
        this.layers.exits.clear();
        this.layers.bodies.clear();
        this.layers.labels.removeChildren?.();

        if (!this.targetSector) {
            return;
        }

        this.#drawPixiBoundary();
        this.#drawPixiExits();
        this.#drawPixiBodies();
    }

    #drawPixiBoundary() {
        const exit = this.targetSector.exits[0];
        if (!exit) {
            return;
        }

        const transform = this.#createTransform();
        const center = transform.toScreen({ x: 0, y: 0 });

        this.layers.boundary
            .circle(center.x, center.y, transform.radius(exit.radius))
            .stroke({ color: MAP_COLORS.boundary, alpha: 0.1, width: 1 });
    }

    #drawPixiExits() {
        const transform = this.#createTransform();
        const center = transform.toScreen({ x: 0, y: 0 });

        this.targetSector.exits.forEach(exit => {
            const cameraRotation = this.camera?.rotation ?? 0;
            const start = (exit.angle - exit.width / 2) * Math.PI / 180 + cameraRotation;
            const end = (exit.angle + exit.width / 2) * Math.PI / 180 + cameraRotation;
            const color = this.#facilityPixiColor(exit.getFacilityType());

            this.layers.exits
                .arc(center.x, center.y, transform.radius(exit.radius), start, end)
                .stroke({ color, alpha: 0.35, width: 16 });
            this.layers.exits
                .arc(center.x, center.y, transform.radius(exit.radius), start, end)
                .stroke({ color, width: 6 });
            this.#drawPixiFacilityLabel(exit, transform, center);
        });
    }

    #drawPixiBodies() {
        const transform = this.#createTransform();

        this.targetSector.bodies.forEach(body => {
            const position = transform.toScreen(body.position);
            const radius = Math.max(4, transform.radius(body.radius));
            const color = this.#bodyPixiColor(body);

            this.layers.bodies
                .circle(position.x, position.y, radius + Math.max(8, radius * 0.35))
                .fill({ color, alpha: body.isHome ? 0.22 : 0.16 });
            this.layers.bodies
                .circle(position.x, position.y, radius)
                .fill(color);

            if (body.items.length > 0) {
                this.#drawPixiItemRings(body, position, radius);
            }
        });
    }

    #drawPixiFacilityLabel(exit, transform, center) {
        if (!this.layers.Text) {
            return;
        }

        const type = exit.getFacilityType();
        const label = FACILITY_LABELS[type] || type;
        const angle = exit.angle * Math.PI / 180 + (this.camera?.rotation ?? 0);
        const radius = transform.radius(exit.radius + 45);
        const visualAngle = angle;
        const normalized = ((visualAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const isBottom = normalized > 0 && normalized < Math.PI;
        const fontSize = 30 * transform.scale;
        const textRadius = radius;
        const charMetrics = [...label].map(char => ({
            char,
            width: this.#estimateLabelCharWidth(char, fontSize, transform.scale)
        }));
        const totalTextAngle = charMetrics.reduce((total, metric) => total + metric.width, 0) / textRadius;
        let currentAngle = isBottom ? angle + totalTextAngle / 2 : angle - totalTextAngle / 2;

        charMetrics.forEach(metric => {
            const charAngle = isBottom
                ? currentAngle - (metric.width / 2) / textRadius
                : currentAngle + (metric.width / 2) / textRadius;

            if (metric.char !== ' ') {
                const text = new this.layers.Text({
                    text: metric.char,
                    style: {
                        fill: this.#facilityPixiColor(type),
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize,
                        fontWeight: '700',
                        align: 'center'
                    }
                });

                text.anchor?.set?.(0.5);
                text.position?.set?.(
                    center.x + Math.cos(charAngle) * textRadius,
                    center.y + Math.sin(charAngle) * textRadius
                );
                text.rotation = isBottom ? charAngle - Math.PI / 2 : charAngle + Math.PI / 2;
                text.alpha = 0.95;
                this.layers.labels.addChild(text);
            }

            currentAngle += isBottom
                ? -metric.width / textRadius
                : metric.width / textRadius;
        });
    }

    #estimateLabelCharWidth(char, fontSize, scale) {
        if (char === ' ') {
            return fontSize * 0.45 + 6 * scale;
        }

        return fontSize * 0.68 + 6 * scale;
    }

    #drawPixiItemRings(body, position, radius) {
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
            this.layers.bodies
                .arc(position.x, position.y, radius + 4, startAngle, startAngle + angleStep - gap)
                .stroke({ color, alpha: 0.95, width: 2 });
        });
    }

    #drawBoundary() {
        const exit = this.targetSector.exits[0];
        if (!exit) {
            return;
        }

        const transform = this.#createTransform();
        const center = transform.toScreen({ x: 0, y: 0 });

        this.context.beginPath();
        this.context.arc(center.x, center.y, transform.radius(exit.radius), 0, Math.PI * 2);
        this.context.strokeStyle = 'rgba(99, 241, 255, 0.32)';
        this.context.lineWidth = 2;
        this.context.stroke();
    }

    #drawExits() {
        const transform = this.#createTransform();
        const center = transform.toScreen({ x: 0, y: 0 });

        this.targetSector.exits.forEach(exit => {
            const cameraRotation = this.camera?.rotation ?? 0;
            const start = (exit.angle - exit.width / 2) * Math.PI / 180 + cameraRotation;
            const end = (exit.angle + exit.width / 2) * Math.PI / 180 + cameraRotation;

            this.context.beginPath();
            this.context.arc(center.x, center.y, transform.radius(exit.radius), start, end);
            this.context.strokeStyle = this.#facilityColor(exit.getFacilityType());
            this.context.lineWidth = 8;
            this.context.stroke();
        });
    }

    #drawBodies() {
        const transform = this.#createTransform();

        this.targetSector.bodies.forEach(body => {
            const position = transform.toScreen(body.position);
            const radius = Math.max(4, transform.radius(body.radius));

            this.context.beginPath();
            this.context.arc(position.x, position.y, radius, 0, Math.PI * 2);
            this.context.fillStyle = body.isHome ? '#f6d36b' : (body.isRepulsion ? '#ff5c93' : '#63f1ff');
            this.context.fill();

            if (body.items.length > 0) {
                this.context.beginPath();
                this.context.arc(position.x, position.y, radius + 5, 0, Math.PI * 2);
                this.context.strokeStyle = 'rgba(255, 255, 255, 0.78)';
                this.context.lineWidth = 1.5;
                this.context.stroke();
            }
        });
    }

    #facilityColor(type) {
        if (type === 'TRADING_POST') return '#4bd483';
        if (type === 'REPAIR_DOCK') return '#4cb8ff';
        if (type === 'BLACK_MARKET') return '#ff4d8d';
        return '#ffffff';
    }

    #facilityPixiColor(type) {
        if (MAP_COLORS.facilities[type]) return MAP_COLORS.facilities[type];
        return 0xffffff;
    }

    #bodyPixiColor(body) {
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
