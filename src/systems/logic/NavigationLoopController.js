class NavigationLoopController {
    constructor(infrastructure = {}) {
        if (!infrastructure.physicsEngine) {
            throw new Error('[NavigationLoopController] physicsEngine is required.');
        }

        this.physicsEngine = infrastructure.physicsEngine;
        this.gameDataRepository = infrastructure.gameDataRepository;
        this.uiController = infrastructure.uiController;
        this.worldRenderer = infrastructure.worldRenderer;
        this.requestFrame = infrastructure.requestFrame
            || globalThis.requestAnimationFrame?.bind(globalThis)
            || (callback => globalThis.setTimeout(callback, 16));
        this.cancelFrame = infrastructure.cancelFrame
            || globalThis.cancelAnimationFrame?.bind(globalThis)
            || globalThis.clearTimeout?.bind(globalThis);
        this.rocket = null;
        this.sector = null;
        this.onNavigationEnd = null;
        this.frameId = null;
        this.lastFrameTime = null;
        this.accumulator = 0;
        this.maxStepsPerFrame = infrastructure.maxStepsPerFrame ?? 30;
        this.running = false;
    }

    start({ rocket, sector, onNavigationEnd } = {}) {
        if (!rocket || !sector) {
            throw new Error('[NavigationLoopController] rocket and sector are required.');
        }
        if (typeof onNavigationEnd !== 'function') {
            throw new Error('[NavigationLoopController] onNavigationEnd is required.');
        }

        this.stop();
        this.rocket = rocket;
        this.sector = sector;
        this.onNavigationEnd = onNavigationEnd;
        this.lastFrameTime = null;
        this.accumulator = 0;
        this.running = true;
        this.#scheduleNextFrame();
    }

    stop() {
        if (this.frameId !== null) {
            this.cancelFrame(this.frameId);
            this.frameId = null;
        }

        this.running = false;
        this.lastFrameTime = null;
        this.accumulator = 0;
    }

    isRunning() {
        return this.running;
    }

    step() {
        return this.#step(true);
    }

    #step(shouldRender) {
        if (!this.running) {
            return null;
        }

        const result = this.physicsEngine.step(this.rocket, this.sector);
        this.uiController?.updateHUDValue?.('score', result.ticks);
        if (shouldRender) {
            this.worldRenderer?.render?.();
        }

        if (result.collision) {
            this.stop();
            this.onNavigationEnd(result.collision);
        }

        return result;
    }

    advance(elapsedSeconds) {
        if (!this.running) {
            return 0;
        }

        const tickSeconds = this.#getTickSeconds();
        let steps = 0;

        this.accumulator += elapsedSeconds;
        while (this.accumulator >= tickSeconds && steps < this.maxStepsPerFrame && this.running) {
            this.#step(false);
            this.accumulator -= tickSeconds;
            steps += 1;
        }

        if (steps > 0) {
            this.worldRenderer?.render?.();
        }

        return steps;
    }

    #scheduleNextFrame() {
        this.frameId = this.requestFrame(timestamp => {
            this.frameId = null;
            this.advance(this.#resolveElapsedSeconds(timestamp));

            if (this.running) {
                this.#scheduleNextFrame();
            }
        });
    }

    #resolveElapsedSeconds(timestamp) {
        if (!Number.isFinite(timestamp)) {
            return 1 / 60;
        }

        if (this.lastFrameTime === null) {
            this.lastFrameTime = timestamp;
            return 1 / 60;
        }

        const elapsedSeconds = Math.max(0, (timestamp - this.lastFrameTime) / 1000);
        this.lastFrameTime = timestamp;
        return elapsedSeconds;
    }

    #getTickSeconds() {
        const tickSeconds = this.gameDataRepository?.getMasterConfig?.().simulationTickSeconds;
        if (!Number.isFinite(tickSeconds) || tickSeconds <= 0) {
            throw new Error('[NavigationLoopController] simulationTickSeconds must be a positive number.');
        }

        return tickSeconds;
    }
}

export default NavigationLoopController;
