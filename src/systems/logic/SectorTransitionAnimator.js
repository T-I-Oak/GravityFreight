const DEFAULT_WARP_DURATIONS = {
    warpOut: 1400,
    hold: 700,
    warpIn: 1400
};

class SectorTransitionAnimator {
    constructor(options = {}) {
        this.worldRenderer = options.worldRenderer;
        this.wait = options.wait || (duration => new Promise(resolve => {
            globalThis.setTimeout(resolve, duration);
        }));
        this.durations = {
            ...DEFAULT_WARP_DURATIONS,
            ...(options.durations || {})
        };
    }

    async play(createSector) {
        if (typeof createSector !== 'function') {
            throw new Error('[SectorTransitionAnimator] createSector callback is required.');
        }

        this.worldRenderer?.startWarpEffect?.(this.durations.warpOut);
        await this.#wait(this.durations.warpOut);

        const sector = await createSector();
        await this.#wait(this.durations.hold);

        this.worldRenderer?.stopWarpEffect?.(this.durations.warpIn);
        await this.#wait(this.durations.warpIn);

        return sector;
    }

    #wait(duration) {
        if (!duration || duration <= 0) {
            return Promise.resolve();
        }

        return this.wait(duration);
    }
}

export default SectorTransitionAnimator;
