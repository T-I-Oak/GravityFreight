const DEFAULT_TRANSITION_DURATION_MS = 260;

class TutorialCameraFocusController {
    constructor({
        cameraController,
        mapInteractionController,
        worldRenderer,
        worldBoundsResolver,
        focusPadding = 120,
        transitionDurationMs = DEFAULT_TRANSITION_DURATION_MS,
        requestAnimationFrame = globalThis.requestAnimationFrame?.bind(globalThis),
        now = () => globalThis.performance?.now?.() ?? Date.now()
    } = {}) {
        if (!cameraController) {
            throw new Error('[TutorialCameraFocusController] cameraController is required.');
        }

        this.cameraController = cameraController;
        this.mapInteractionController = mapInteractionController || null;
        this.worldRenderer = worldRenderer || null;
        this.worldBoundsResolver = worldBoundsResolver || null;
        this.focusPadding = focusPadding;
        this.transitionDurationMs = transitionDurationMs;
        this.now = now;
        this.requestAnimationFrame = requestAnimationFrame
            ?? (callback => setTimeout(() => callback(this.now()), 16));
        this.savedCameraState = null;
        this.scenarioActive = false;
    }

    setWorldBoundsResolver(resolver) {
        this.worldBoundsResolver = resolver;
    }

    setMapInteractionController(mapInteractionController) {
        this.mapInteractionController = mapInteractionController;
    }

    beginScenario() {
        this.scenarioActive = true;
        this.mapInteractionController?.setInputLocked?.(true);
    }

    async focusPage(context = {}) {
        const highlights = Array.isArray(context.highlights) ? context.highlights : [];
        const canvasHighlights = highlights.filter(highlight => highlight.targetType);
        if (canvasHighlights.length === 0) {
            await this.#restoreCameraState();
            return false;
        }

        if (!this.worldBoundsResolver) {
            throw new Error('[TutorialCameraFocusController] worldBoundsResolver is required.');
        }

        if (!this.savedCameraState) {
            this.savedCameraState = this.cameraController.getState();
        }

        if (!this.scenarioActive) {
            this.mapInteractionController?.setInputLocked?.(true);
        }
        const focusBounds = this.#mergeBounds(
            canvasHighlights.map(highlight => this.#resolveBounds(highlight))
        );
        const targetState = this.cameraController.calculateFocusState(focusBounds, { padding: this.focusPadding });
        await this.#transitionToState(targetState);
        return true;
    }

    async restore() {
        return this.endScenario();
    }

    async endScenario() {
        const restored = await this.#restoreCameraState();
        this.scenarioActive = false;
        this.mapInteractionController?.setInputLocked?.(false);
        return restored;
    }

    async #restoreCameraState() {
        if (!this.savedCameraState) {
            return false;
        }

        await this.#transitionToState(this.savedCameraState);
        this.savedCameraState = null;
        return true;
    }

    #resolveBounds(highlight) {
        const bounds = this.worldBoundsResolver(highlight);
        if (!bounds) {
            throw new Error(`[TutorialCameraFocusController] Canvas focus target not found: ${highlight.targetType}`);
        }
        return this.#normalizeBounds(bounds, highlight.targetType);
    }

    #mergeBounds(boundsList) {
        if (!boundsList.length) {
            throw new Error('[TutorialCameraFocusController] focus bounds are required.');
        }

        const left = Math.min(...boundsList.map(bounds => bounds.left));
        const top = Math.min(...boundsList.map(bounds => bounds.top));
        const right = Math.max(...boundsList.map(bounds => bounds.left + bounds.width));
        const bottom = Math.max(...boundsList.map(bounds => bounds.top + bounds.height));
        return {
            left,
            top,
            width: right - left,
            height: bottom - top
        };
    }

    #normalizeBounds(bounds, targetType) {
        const left = bounds.left ?? bounds.x;
        const top = bounds.top ?? bounds.y;
        const width = bounds.width;
        const height = bounds.height;
        if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
            throw new Error(`[TutorialCameraFocusController] Invalid canvas focus bounds: ${targetType}`);
        }

        return { left, top, width, height };
    }

    async #transitionToState(targetState) {
        const duration = Number.isFinite(this.transitionDurationMs)
            ? Math.max(0, this.transitionDurationMs)
            : DEFAULT_TRANSITION_DURATION_MS;
        if (duration === 0) {
            this.cameraController.applyState(targetState);
            this.worldRenderer?.render?.();
            return;
        }

        const startState = this.cameraController.getState();
        const startTime = this.now();
        await new Promise(resolve => {
            const step = timestamp => {
                const elapsed = Math.max(0, timestamp - startTime);
                const progress = Math.min(1, elapsed / duration);
                const eased = this.#easeInOut(progress);
                this.cameraController.applyState(this.#interpolateState(startState, targetState, eased));
                this.worldRenderer?.render?.();
                if (progress >= 1) {
                    resolve();
                    return;
                }

                this.requestAnimationFrame(step);
            };

            this.requestAnimationFrame(step);
        });
    }

    #interpolateState(from, to, progress) {
        return {
            position: {
                x: this.#lerp(from.position.x, to.position.x, progress),
                y: this.#lerp(from.position.y, to.position.y, progress)
            },
            rotation: this.#lerp(from.rotation, to.rotation, progress),
            zoomLevel: this.#lerp(from.zoomLevel, to.zoomLevel, progress)
        };
    }

    #lerp(from, to, progress) {
        return from + (to - from) * progress;
    }

    #easeInOut(progress) {
        return progress < 0.5
            ? 2 * progress * progress
            : 1 - ((-2 * progress + 2) ** 2) / 2;
    }
}

export default TutorialCameraFocusController;
