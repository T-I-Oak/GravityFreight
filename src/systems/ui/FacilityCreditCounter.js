class FacilityCreditCounter {
    constructor({
        requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
        cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
        durationMs = 900,
        formatNumber = value => new Intl.NumberFormat('en-US').format(value ?? 0)
    } = {}) {
        this.requestFrame = requestFrame;
        this.cancelFrame = cancelFrame;
        this.durationMs = durationMs;
        this.formatNumber = formatNumber;
        this.animationFrameId = null;
    }

    update(element, value) {
        const previousValue = Number(element.dataset.facilityCreditsValue ?? 0);
        this.cancel();

        if (!this.requestFrame || this.durationMs <= 0 || previousValue === value) {
            this.#render(element, value);
            return;
        }

        let startTime = null;
        const step = timestamp => {
            startTime ??= timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / this.durationMs);
            const currentValue = Math.round(previousValue + ((value - previousValue) * this.#easeOutCubic(progress)));
            this.#render(element, currentValue);

            if (progress < 1) {
                this.animationFrameId = this.requestFrame(step);
            } else {
                this.#render(element, value);
                this.animationFrameId = null;
            }
        };

        this.animationFrameId = this.requestFrame(step);
    }

    cancel() {
        if (this.animationFrameId !== null && this.cancelFrame) {
            this.cancelFrame(this.animationFrameId);
        }
        this.animationFrameId = null;
    }

    #render(element, value) {
        element.textContent = `${this.formatNumber(value)} c`;
        element.dataset.facilityCreditsValue = String(value);
    }

    #easeOutCubic(value) {
        return 1 - ((1 - value) ** 3);
    }
}

export default FacilityCreditCounter;
