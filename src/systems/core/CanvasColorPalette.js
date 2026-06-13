const COLOR_TOKENS = {
    worldBg: '--color-world-bg',
    boundary: '--color-world-boundary',
    prediction: '--color-world-prediction',
    trail: '--color-world-trail',
    sonar: '--color-world-scanner',
    rocket: '--color-world-rocket',
    homeStar: '--color-world-home-star',
    normalStar: '--color-world-normal-star',
    repulsiveStar: '--color-world-repulsive-star',
    starParticleRgb: '--color-world-star-particle-rgb',
    categories: {
        chassis: '--color-category-chassis',
        logic: '--color-category-logic',
        module: '--color-category-module',
        rocket: '--color-category-rockets',
        launcher: '--color-category-launchers',
        booster: '--color-category-boosters',
        coin: '--color-category-coin',
        cargo: '--color-category-cargo'
    },
    facilities: {
        TRADING_POST: '--color-facility-trading-post',
        REPAIR_DOCK: '--color-facility-repair-dock',
        BLACK_MARKET: '--color-facility-black-market'
    }
};

class CanvasColorPalette {
    constructor(options = {}) {
        this.root = options.root || globalThis.document?.documentElement || null;
        this.computedStyleProvider = options.computedStyleProvider
            || (element => globalThis.getComputedStyle(element));
    }

    get(name) {
        return this.#resolveToken(COLOR_TOKENS[name]);
    }

    createWorldColors() {
        return {
            boundary: this.get('boundary'),
            prediction: this.get('prediction'),
            trail: this.get('trail'),
            sonar: this.get('sonar'),
            rocket: this.get('rocket'),
            homeStar: this.get('homeStar'),
            normalStar: this.get('normalStar'),
            repulsiveStar: this.get('repulsiveStar'),
            categories: this.#resolveGroup(COLOR_TOKENS.categories),
            facilities: this.#resolveGroup(COLOR_TOKENS.facilities)
        };
    }

    createStarParticleColor(alpha) {
        return `rgba(${this.get('starParticleRgb')}, ${alpha})`;
    }

    #resolveGroup(tokens) {
        return Object.fromEntries(
            Object.entries(tokens).map(([key, token]) => [key, this.#resolveToken(token)])
        );
    }

    #resolveToken(token) {
        if (!token) {
            throw new Error('[CanvasColorPalette] CSS color token name is required.');
        }
        if (!this.root || typeof this.computedStyleProvider !== 'function') {
            throw new Error(`[CanvasColorPalette] Cannot resolve CSS color token: ${token}`);
        }

        const value = this.computedStyleProvider(this.root).getPropertyValue(token).trim();
        if (!value) {
            throw new Error(`[CanvasColorPalette] CSS color token is not defined: ${token}`);
        }
        return value;
    }
}

export default CanvasColorPalette;
