import { FacilityComponents } from './FacilityComponents.js';
import { ArchiveComponents } from './ArchiveComponents.js';
import ArchiveDialogView from './ArchiveDialogView.js';
import AppMetadataView from './AppMetadataView.js';
import MapInputController from './MapInputController.js';
import SettingsDialogView from './SettingsDialogView.js';
import StarInfoPanel from './StarInfoPanel.js';
import BuildPanelView from './BuildPanelView.js';
import FlightResultScreenView from './FlightResultScreenView.js';
import ReplayProtectFlow from './ReplayProtectFlow.js';
import GameEndScreenView from './GameEndScreenView.js';

class UIController {
    constructor(options = {}) {
        this.document = options.document || document;
        this.gameDataRepository = options.gameDataRepository;
        if (!this.gameDataRepository) {
            throw new Error('[UIController] gameDataRepository is required.');
        }

        this.facilityComponents = options.facilityComponents || FacilityComponents;
        this.archiveComponents = options.archiveComponents || ArchiveComponents;
        this.replayProtectFlow = options.replayProtectFlow || new ReplayProtectFlow({
            document: this.document,
            gameDataRepository: this.gameDataRepository,
            operationBinder: (element, handler, seId) => this.setOperationHandler(element, handler, seId)
        });
        this.archiveDialogView = options.archiveDialogView || new ArchiveDialogView({
            document: this.document,
            operationBinder: (element, handler) => this.setOperationHandler(element, handler),
            replayProtectFlow: this.replayProtectFlow
        });
        this.appMetadataView = options.appMetadataView || new AppMetadataView({ document: this.document });
        this.settingsDialogView = options.settingsDialogView || new SettingsDialogView({ document: this.document, operationBinder: (element, handler) => this.setOperationHandler(element, handler) });
        this.starInfoPanel = options.starInfoPanel || new StarInfoPanel({ document: this.document });
        this.buildPanelView = options.buildPanelView || new BuildPanelView({ document: this.document, operationBinder: (element, handler, seId) => this.setOperationHandler(element, handler, seId) });
        this.flightResultScreenView = options.flightResultScreenView || new FlightResultScreenView({
            document: this.document,
            gameDataRepository: this.gameDataRepository,
            operationBinder: (element, handler, seId) => this.setOperationHandler(element, handler, seId),
            components: options.flightResultComponents,
            requestFrame: options.requestFrame,
            cancelFrame: options.cancelFrame,
            countDurationMs: options.flightResultCountDurationMs,
            onEnterMapView: () => this.#showResultMapView(),
            onExitMapView: () => this.#hideResultMapView(),
            replayProtectFlow: this.replayProtectFlow
        });
        this.gameEndScreenView = options.gameEndScreenView || new GameEndScreenView({
            document: this.document,
            gameDataRepository: this.gameDataRepository,
            operationBinder: (element, handler, seId) => this.setOperationHandler(element, handler, seId)
        });
        this.soundController = options.soundController || null;
        this.requestFrame = options.requestFrame || globalThis.requestAnimationFrame?.bind(globalThis);
        this.cancelFrame = options.cancelFrame || globalThis.cancelAnimationFrame?.bind(globalThis);
        this.facilityCreditCountDurationMs = options.facilityCreditCountDurationMs ?? 900;
        this.facilityCreditAnimationFrameId = null;
        this.canvasInputHandler = null;

        this.titleScreen = this.document.querySelector('#title-screen');
        this.resultScreen = this.flightResultScreenView.resultScreen;
        this.facilityScreen = this.#requiredElement('#facility-screen');
        this.playScene = this.document.querySelector('#play-scene-container');
        this.hud = this.document.querySelector('#play-hud');
        this.mapCanvas = this.document.querySelector('#gameCanvas');
        this.sectorNotification = this.document.querySelector('#sector-notification');
        this.sectorNotificationTimer = null;
        this.mapInputController = options.mapInputController || new MapInputController({
            document: this.document,
            canvas: this.mapCanvas
        });
        this.hudValues = {
            sector: this.document.querySelector('#sector-display'),
            score: this.document.querySelector('#score-display'),
            coin: this.document.querySelector('#coin-display')
        };
        this.mailButtons = [
            this.document.querySelector('#mail-btn-0'),
            this.document.querySelector('#mail-btn-1'),
            this.document.querySelector('#mail-btn-2')
        ].filter(Boolean);
        this.settingsDialogView.initialize();
        this.archiveDialogView.initialize();
        this.buildPanelView.initialize();
    }

    showTitleScreen() {
        this.hideStarInfo();
        this.flightResultScreenView.clearMapActionDock();
        this.gameEndScreenView.hide();
        this.#show(this.titleScreen);
        this.#hide(this.playScene);
        this.flightResultScreenView.hide();
        this.#hide(this.facilityScreen);
        this.#hide(this.hud);
        this.buildPanelView.hide();
    }

    showBuildScreen(viewData = null) {
        this.flightResultScreenView.clearMapActionDock();
        this.gameEndScreenView.hide();
        this.#hide(this.titleScreen);
        this.flightResultScreenView.hide();
        this.#hide(this.facilityScreen);
        this.#show(this.playScene);
        this.#show(this.hud);
        this.buildPanelView.show(viewData);
    }

    showSectorTransitionScreen() {
        this.hideStarInfo();
        this.flightResultScreenView.clearMapActionDock();
        this.gameEndScreenView.hide();
        this.#hide(this.titleScreen);
        this.flightResultScreenView.hide();
        this.#hide(this.facilityScreen);
        this.#show(this.playScene);
        this.#show(this.hud);
        this.buildPanelView.hide();
    }

    showSectorTitle(sectorNumber, isAnomaly = false) {
        if (!this.sectorNotification) {
            return;
        }

        this.sectorNotification.textContent = isAnomaly
            ? `ANOMALY SECTOR ${sectorNumber} READY`
            : `SECTOR ${sectorNumber} READY`;
        this.sectorNotification.classList.remove('state-hidden', 'state-active', 'state-anomaly');
        if (isAnomaly) {
            this.sectorNotification.classList.add('state-anomaly');
        }

        void this.sectorNotification.offsetWidth;
        this.sectorNotification.classList.add('state-active');
        if (this.sectorNotificationTimer) {
            clearTimeout(this.sectorNotificationTimer);
        }
        this.sectorNotificationTimer = setTimeout(() => {
            this.sectorNotification?.classList.add('state-hidden');
            this.sectorNotification?.classList.remove('state-active', 'state-anomaly');
            this.sectorNotificationTimer = null;
        }, 3500);
    }

    initHUD(sessionState) {
        this.updateHUDValue('sector', sessionState.sectorNumber);
        this.updateHUDValue('score', sessionState.totalScore ?? 0);
        this.updateHUDValue('coin', sessionState.coins ?? 0);
        this.mailButtons.forEach(button => {
            button.classList.remove('trading-post', 'repair-dock', 'black-market', 'state-new', 'state-clickable');
            button.classList.add('state-disabled');
        });
    }

    updateHUDValue(key, value) {
        const element = this.hudValues[key];
        if (element) {
            element.textContent = this.#formatNumber(value);
        }
    }

    setFlightMode(isFlight) {
        this.buildPanelView.setFlightMode(isFlight);
    }

    getMapCanvas() { return this.mapCanvas; }
    getTitleCanvases() { return { background: this.#requiredElement('#title-bg-canvas'), foreground: this.#requiredElement('#title-fg-canvas') }; }
    setAppMetadata(metadata) { this.appMetadataView.setMetadata(metadata); }
    setStartHandler(handler) { this.setOperationHandler(this.#requiredElement('#start-game-btn'), handler); }
    setRecordHandler(handler) { this.archiveDialogView.setOpenHandler(handler); }
    showRecordScreen(viewData) { this.archiveDialogView.show(viewData, this.archiveComponents); }
    setReplayStartHandler(handler) { this.archiveDialogView.setReplayStartHandler(handler); }
    setReplayProtectHandler(handler) { this.replayProtectFlow.setCommitHandler(handler); }
    setReplayProtectRecordsProvider(provider) { this.replayProtectFlow.setRecordsProvider(provider); }
    showResultScreen(viewData) {
        this.hideStarInfo();
        this.gameEndScreenView.hide();
        this.buildPanelView.close();
        this.#hide(this.hud);
        this.buildPanelView.hide();
        this.#hide(this.playScene);
        this.#hide(this.titleScreen);
        this.#hide(this.facilityScreen);
        this.flightResultScreenView.show(viewData);
    }

    showGameEndSequence(gameResult, gameOver, options = {}) {
        this.hideStarInfo();
        this.flightResultScreenView.clearMapActionDock();
        this.flightResultScreenView.hide();
        this.#hide(this.titleScreen);
        this.#hide(this.facilityScreen);
        this.#show(this.playScene);
        this.#hide(this.hud);
        this.buildPanelView.hide();
        this.gameEndScreenView.show(gameResult, gameOver, options);
    }

    showFacilityScreen(type, viewData) {
        this.hideStarInfo();
        this.#cancelFacilityCreditAnimation();
        this.flightResultScreenView.clearMapActionDock();
        this.buildPanelView.close();
        this.flightResultScreenView.hide();
        this.#hide(this.hud);
        this.buildPanelView.hide();
        this.#hide(this.playScene);
        this.#hide(this.titleScreen);
        this.#show(this.facilityScreen);
        this.facilityScreen.innerHTML = this.facilityComponents.generateHTML({ ...viewData, type });
    }

    setResultHandler(handler) {
        this.flightResultScreenView.setResultHandler(handler);
    }

    setMapToggleHandler(handler) {
        this.flightResultScreenView.setMapToggleHandler(handler);
    }

    setGameEndReturnHandler(handler) {
        this.gameEndScreenView.setReturnHandler(handler);
    }

    setFacilityActionHandler(handler) {
        this.facilityScreen.querySelectorAll('.facility-action-button').forEach(button => {
            this.setOperationHandler(button, element => {
                handler(element.dataset.action, { uid: element.dataset.uid });
            });
        });
    }

    setFacilityDepartHandler(handler) {
        this.setOperationHandler(this.#requiredFacilityElement('.facility-depart-button'), handler);
    }

    setBuildItemSelectionHandler(handler) {
        this.buildPanelView.setItemSelectionHandler(handler);
    }

    setBuildAssembleHandler(handler) {
        this.buildPanelView.setAssembleHandler(handler);
    }

    setLaunchHandler(handler) {
        this.buildPanelView.setLaunchHandler(handler);
    }

    setCanvasInputHandler(handler) {
        this.canvasInputHandler = handler;
        this.mapInputController.setHandler(handler);
    }

    showStarInfo(body, point) {
        this.starInfoPanel.show(body, point, this.mapCanvas);
    }

    hideStarInfo() {
        this.starInfoPanel.hide();
    }

    updateFacilityCredits(value) {
        const creditsValue = this.#requiredFacilityElement('.credits-value');
        const previousValue = Number(creditsValue.dataset.facilityCreditsValue ?? 0);
        this.#cancelFacilityCreditAnimation();

        if (!this.requestFrame || this.facilityCreditCountDurationMs <= 0 || previousValue === value) {
            this.#renderFacilityCredits(creditsValue, value);
            return;
        }

        let startTime = null;
        const step = timestamp => {
            startTime ??= timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / this.facilityCreditCountDurationMs);
            const currentValue = Math.round(previousValue + ((value - previousValue) * this.#easeOutCubic(progress)));
            this.#renderFacilityCredits(creditsValue, currentValue);

            if (progress < 1) {
                this.facilityCreditAnimationFrameId = this.requestFrame(step);
            } else {
                this.#renderFacilityCredits(creditsValue, value);
                this.facilityCreditAnimationFrameId = null;
            }
        };

        this.facilityCreditAnimationFrameId = this.requestFrame(step);
    }

    #renderFacilityCredits(element, value) {
        element.textContent = `${this.#formatNumber(value)} c`;
        element.dataset.facilityCreditsValue = String(value);
    }

    #cancelFacilityCreditAnimation() {
        if (this.facilityCreditAnimationFrameId !== null && this.cancelFrame) {
            this.cancelFrame(this.facilityCreditAnimationFrameId);
        }
        this.facilityCreditAnimationFrameId = null;
    }

    #easeOutCubic(value) {
        return 1 - ((1 - value) ** 3);
    }

    setOperationHandler(element, handler, seId = 'click') {
        element.addEventListener('click', event => {
            this.soundController?.playSE?.(seId);
            handler(event.currentTarget, event);
        });
    }

    #showResultMapView() {
        this.#show(this.playScene);
        this.#show(this.hud);
        this.buildPanelView.showReadOnly();
    }

    #hideResultMapView() {
        this.buildPanelView.hide();
        this.#hide(this.hud);
        this.#hide(this.playScene);
    }

    #requiredElement(selector) {
        const element = this.document.querySelector(selector);
        if (!element) {
            throw new Error(`[UIController] Required element not found: ${selector}`);
        }
        return element;
    }

    #requiredFacilityElement(selector) {
        const element = this.facilityScreen.querySelector(selector);
        if (!element) {
            throw new Error(`[UIController] Required facility element not found: ${selector}`);
        }
        return element;
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

    #formatNumber(value) { return new Intl.NumberFormat('en-US').format(value ?? 0); }

}

export default UIController;
