import { FlightResultComponents } from './FlightResultComponents.js';

class FlightResultScreenView {
    constructor({
        document,
        gameDataRepository,
        operationBinder,
        components = FlightResultComponents,
        requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
        cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
        countDurationMs = 900,
        onEnterMapView = null,
        onExitMapView = null,
        replayProtectFlow = null
    }) {
        this.document = document;
        this.gameDataRepository = gameDataRepository;
        this.operationBinder = operationBinder;
        this.components = components;
        this.requestFrame = requestFrame;
        this.cancelFrame = cancelFrame;
        this.countDurationMs = countDurationMs;
        this.onEnterMapView = onEnterMapView;
        this.onExitMapView = onExitMapView;
        this.countAnimationFrameId = null;
        this.resultHandler = null;
        this.mapToggleHandler = null;
        this.replayProtectFlow = replayProtectFlow;
        this.viewData = null;
        this.resultScreen = this.#requiredElement('#flight-result-screen');
        this.playScene = this.document.querySelector('#play-scene-container');
        this.mapActionDock = this.document.querySelector('#map-action-dock');
    }

    show(viewData) {
        this.clearMapActionDock();
        this.#cancelCountAnimation();
        this.#show(this.resultScreen);
        this.viewData = viewData;
        this.resultScreen.innerHTML = this.components.generateHTML(viewData, this.gameDataRepository);
        this.#startCountAnimation();
        this.#wireHandlers();
    }

    hide() {
        this.#cancelCountAnimation();
        this.#hide(this.resultScreen);
    }

    setResultHandler(handler) {
        this.resultHandler = handler;
        this.#wireHandlers();
    }

    setMapToggleHandler(handler) {
        this.mapToggleHandler = handler;
        this.#wireHandlers();
    }

    clearMapActionDock() {
        if (this.mapActionDock) {
            this.mapActionDock.innerHTML = '';
        }
    }

    #startCountAnimation() {
        const targets = [...this.resultScreen.querySelectorAll('[data-count-to]')];
        if (targets.length === 0) {
            return;
        }

        if (!this.requestFrame) {
            this.#renderCountTargets(targets, 1);
            return;
        }

        if (this.countDurationMs <= 0) {
            this.#renderCountTargets(targets, 1);
            return;
        }

        let startTime = null;
        const step = timestamp => {
            startTime ??= timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / this.countDurationMs);
            this.#renderCountTargets(targets, this.#easeOutCubic(progress));

            if (progress < 1) {
                this.countAnimationFrameId = this.requestFrame(step);
            } else {
                this.countAnimationFrameId = null;
            }
        };

        this.countAnimationFrameId = this.requestFrame(step);
    }

    #renderCountTargets(targets, progress) {
        targets.forEach(element => {
            const target = Number(element.dataset.countTo ?? 0);
            const prefix = element.dataset.countPrefix ?? '';
            const value = Math.round(target * progress);
            element.textContent = `${prefix}${this.#formatNumber(value)}`;
        });
    }

    #cancelCountAnimation() {
        if (this.countAnimationFrameId !== null && this.cancelFrame) {
            this.cancelFrame(this.countAnimationFrameId);
        }
        this.countAnimationFrameId = null;
    }

    #easeOutCubic(value) {
        return 1 - ((1 - value) ** 3);
    }

    #wireHandlers() {
        if (this.resultHandler) {
            this.#setOperationHandler('.flight-result-action-button', this.resultHandler);
        }

        if (this.mapToggleHandler) {
            this.#setOperationHandler('.flight-result-map-button', () => {
                this.#enterMapView();
                this.mapToggleHandler(true);
            });
        }

        if (this.replayProtectFlow) {
            this.#setOperationHandler('.Badge.favorite', element => {
                const isProtected = !element.classList.contains('state-active');
                const result = this.replayProtectFlow.request({
                    source: 'result',
                    recordId: this.viewData?.replay?.id ?? null,
                    favorite: isProtected,
                    root: this.resultScreen,
                    dialogSelector: '.flight-result-favorite-dialog',
                    dialogClassName: 'flight-result-favorite-dialog Panel color-theme-main',
                    messageClassName: 'flight-result-favorite-message',
                    optionsClassName: 'flight-result-favorite-options',
                    cancelClassName: 'flight-result-favorite-cancel',
                    currentRecord: {
                        score: this.viewData?.replay?.score ?? this.viewData?.totalScore ?? 0,
                        reachedSector: this.viewData?.replay?.reachedSector ?? this.viewData?.reachedSector ?? '-',
                        createdAt: this.viewData?.replay?.createdAt ?? null
                    },
                    onComplete: completed => this.#applyProtectResult(element, completed)
                });
                this.#applyProtectResult(element, result);
            });
        }
    }

    #applyProtectResult(element, result) {
        if (!result || result.status === 'pending' || !result.success) {
            return;
        }

        const protectedState = !!result.favorite;
        const replay = this.viewData?.replay;
        if (replay) {
            replay.favorite = protectedState;
            if (protectedState) {
                replay.recorded = true;
                replay.pending = false;
            }
        }

        this.#applyProtectBadgeState(element, protectedState);
        this.#applyRecordedBadgeState(replay?.recorded ?? protectedState);
    }

    #applyProtectBadgeState(element, protectedState) {
        element.classList.toggle('state-active', protectedState);
        element.classList.toggle('state-inactive', !protectedState);
        element.classList.toggle('outline', !protectedState);
        element.textContent = this.gameDataRepository.getUiText(protectedState
            ? 'flightResult.replay.protected'
            : 'flightResult.replay.protectRecord');
    }

    #applyRecordedBadgeState(recorded) {
        const badge = this.resultScreen.querySelector('[data-replay-recorded-status]');
        if (!badge) {
            return;
        }

        badge.classList.toggle('state-recorded', !!recorded);
        badge.classList.toggle('state-not-recorded', !recorded);
        const text = badge.querySelector('.recorded-text');
        if (text) {
            text.textContent = this.gameDataRepository.getUiText(recorded
                ? 'flightResult.replay.recorded'
                : 'flightResult.replay.notRecorded');
        }
    }

    #enterMapView() {
        this.#hide(this.resultScreen);
        this.onEnterMapView?.();
        this.#renderMapReturnButton();
    }

    #exitMapView() {
        this.clearMapActionDock();
        this.onExitMapView?.();
        this.#show(this.resultScreen);
        this.mapToggleHandler?.(false);
    }

    #renderMapReturnButton() {
        if (!this.mapActionDock) {
            return;
        }

        const label = this.gameDataRepository.getUiText('flightResult.actions.backToResult');
        this.mapActionDock.innerHTML = `
            <button class="Button state-primary button-large flight-result-return-button home">
                <span class="btn-main-label">${label}</span>
            </button>
        `;
        this.operationBinder(
            this.mapActionDock.querySelector('.flight-result-return-button'),
            () => this.#exitMapView()
        );
    }

    #setOperationHandler(selector, handler) {
        const element = this.resultScreen.querySelector(selector);
        if (!element || element.dataset.handlerReady === 'true') {
            return;
        }

        element.dataset.handlerReady = 'true';
        this.operationBinder(element, handler);
    }

    #requiredElement(selector) {
        const element = this.document.querySelector(selector);
        if (!element) {
            throw new Error(`[FlightResultScreenView] Required element not found: ${selector}`);
        }
        return element;
    }

    #formatNumber(value) {
        return new Intl.NumberFormat('en-US').format(value ?? 0);
    }

    #hide(element) {
        if (element) {
            element.hidden = true;
            element.classList.add('state-hidden');
        }
    }

    #show(element) {
        if (element) {
            element.hidden = false;
            element.classList.remove('state-hidden');
        }
    }
}

export default FlightResultScreenView;
