const WORLD_VIEW_SCALE = 0.5;

class WorldRenderer {
    constructor() {
        this.canvas = null;
        this.context = null;
        this.targetSector = null;
    }

    initialize(canvas) {
        if (!canvas?.getContext) {
            throw new Error('[WorldRenderer] canvas is required.');
        }

        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        if (!this.context) {
            throw new Error('[WorldRenderer] 2D context is required.');
        }
        this.#fitCanvas();
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
        this.render();
    }

    render() {
        if (!this.context || !this.canvas) {
            return;
        }

        this.#fitCanvas();
        this.#drawBackground();
        if (!this.targetSector) {
            return;
        }

        this.#drawBoundary();
        this.#drawExits();
        this.#drawBodies();
    }

    #fitCanvas() {
        const width = this.canvas.clientWidth || this.canvas.width || 960;
        const height = this.canvas.clientHeight || this.canvas.height || 720;
        const scale = globalThis.devicePixelRatio || 1;

        this.canvas.width = Math.max(1, Math.round(width * scale));
        this.canvas.height = Math.max(1, Math.round(height * scale));
    }

    #createTransform() {
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

    #drawBackground() {
        const ctx = this.context;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
        for (let i = 0; i < 48; i += 1) {
            const x = (i * 97) % this.canvas.width;
            const y = (i * 173) % this.canvas.height;
            ctx.fillRect(x, y, 1 + (i % 2), 1 + (i % 2));
        }
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
            const start = (exit.angle - exit.width / 2) * Math.PI / 180;
            const end = (exit.angle + exit.width / 2) * Math.PI / 180;

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
}

export default WorldRenderer;
