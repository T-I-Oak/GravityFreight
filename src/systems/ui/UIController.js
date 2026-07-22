import { FacilityComponents } from './FacilityComponents.js';
import { ArchiveComponents } from './ArchiveComponents.js';
import ArchiveDialogView from './ArchiveDialogView.js';
import AchievementToastView from './AchievementToastView.js';
import AppMetadataView from './AppMetadataView.js';
import MapInputController from './MapInputController.js';
import SettingsDialogView from './SettingsDialogView.js';
import StarInfoPanel from './StarInfoPanel.js';
import BuildPanelView from './BuildPanelView.js';
import FlightResultScreenView from './FlightResultScreenView.js';
import ReplayProtectFlow from './ReplayProtectFlow.js';
import ReplayScreenView from './ReplayScreenView.js';
import GameEndScreenView from './GameEndScreenView.js';
import HowToPlayDiagrams from './HowToPlayDiagrams.js';
import HowToPlayUI from './HowToPlayUI.js';
import ShareImageRenderer from './ShareImageRenderer.js';
import ShareService from './ShareService.js';
import FacilityCreditCounter from './FacilityCreditCounter.js';
import HudView from './HudView.js';
import StoryModalView from './StoryModalView.js';
import UIOperationBinder from './UIOperationBinder.js';
import UIShareCoordinator from './UIShareCoordinator.js';
import { UIComponents } from './UIComponents.js';

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
        this.replayScreenView = options.replayScreenView || new ReplayScreenView({ document: this.document });
        this.archiveDialogView = options.archiveDialogView || new ArchiveDialogView({
            document: this.document,
            operationBinder: (element, handler) => this.setOperationHandler(element, handler),
            replayProtectFlow: this.replayProtectFlow
        });
        this.appMetadataView = options.appMetadataView || new AppMetadataView({ document: this.document });
        this.settingsDialogView = options.settingsDialogView || new SettingsDialogView({ document: this.document, operationBinder: (element, handler) => this.setOperationHandler(element, handler) });
        this.howToPlayDiagrams = options.howToPlayDiagrams || new HowToPlayDiagrams({
            gameDataRepository: this.gameDataRepository,
            uiComponents: UIComponents,
            requestFrame: options.requestFrame,
            cancelFrame: options.cancelFrame
        });
        this.howToPlayUI = options.howToPlayUI || new HowToPlayUI({
            rootElement: this.document.querySelector('#how-to-play-overlay'),
            gameDataRepository: this.gameDataRepository,
            uiComponents: UIComponents,
            diagrams: this.howToPlayDiagrams,
            operationBinder: (element, handler, seId) => this.setOperationHandler(element, handler, seId)
        });
        this.starInfoPanel = options.starInfoPanel || new StarInfoPanel({ document: this.document });
        this.shareService = options.shareService || new ShareService();
        this.shareImageRenderer = options.shareImageRenderer || new ShareImageRenderer({ documentRef: this.document });
        this.operationBinder = options.operationBinder || new UIOperationBinder({
            getSoundController: () => this.soundController
        });
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
            operationBinder: (element, handler, seId) => this.setOperationHandler(element, handler, seId),
            playSE: seId => this.soundController?.playSE?.(seId)
        });
        this.soundController = options.soundController || null;
        this.canvasInputHandler = null;
        this.tutorialBuildPanelHidden = false;
        this.tutorialBuildPanelWasVisible = false;

        this.titleScreen = this.document.querySelector('#title-screen');
        this.resultScreen = this.flightResultScreenView.resultScreen;
        this.facilityScreen = this.#requiredElement('#facility-screen');
        this.playScene = this.document.querySelector('#play-scene-container');
        this.replayOverlay = this.document.querySelector('#replay-overlay');
        this.hud = this.document.querySelector('#play-hud');
        this.mapCanvas = this.document.querySelector('#gameCanvas');
        this.shareCoordinator = options.shareCoordinator || new UIShareCoordinator({
            shareImageRenderer: this.shareImageRenderer,
            shareService: this.shareService,
            gameDataRepository: this.gameDataRepository,
            mapCanvas: this.mapCanvas
        });
        this.facilityCreditCounter = options.facilityCreditCounter || new FacilityCreditCounter({
            requestFrame: options.requestFrame,
            cancelFrame: options.cancelFrame,
            durationMs: options.facilityCreditCountDurationMs,
            formatNumber: value => this.#formatNumber(value)
        });
        this.sectorNotification = this.document.querySelector('#sector-notification');
        this.sectorNotificationTimer = null;
        this.currentDeliveryCargoInfo = null;
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
        this.hudView = options.hudView || new HudView({
            valueElements: this.hudValues,
            mailButtons: this.mailButtons,
            operationBinder: this.operationBinder,
            formatNumber: value => this.#formatNumber(value)
        });
        this.achievementToastView = options.achievementToastView || new AchievementToastView({
            document: this.document,
            gameDataRepository: this.gameDataRepository,
            archiveComponents: this.archiveComponents,
            durationMs: options.achievementToastDurationMs,
            formatNumber: value => this.#formatNumber(value)
        });
        this.storyModalView = options.storyModalView || new StoryModalView({
            document: this.document,
            gameDataRepository: this.gameDataRepository,
            operationBinder: (element, handler) => this.setOperationHandler(element, handler)
        });
        this.settingsDialogView.initialize();
        this.howToPlayUI.initialize();
        this.archiveDialogView.initialize();
        this.buildPanelView.initialize();
        this.flightResultScreenView.setShareHandler(viewData => this.shareCoordinator.shareFlightResult(viewData));
        this.gameEndScreenView.setShareHandler(payload => this.shareCoordinator.shareGameEnd(payload));
    }

    showTitleScreen() {
        this.hideStarInfo();
        this.#hide(this.replayOverlay);
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
        this.#hide(this.replayOverlay);
        this.flightResultScreenView.clearMapActionDock();
        this.gameEndScreenView.hide();
        this.#hide(this.titleScreen);
        this.flightResultScreenView.hide();
        this.#hide(this.facilityScreen);
        this.#show(this.playScene);
        this.#show(this.hud);
        this.buildPanelView.setFlightMode(false);
        this.buildPanelView.show(viewData);
    }

    showSectorTransitionScreen() {
        this.hideStarInfo();
        this.#hide(this.replayOverlay);
        this.flightResultScreenView.clearMapActionDock();
        this.gameEndScreenView.hide();
        this.#hide(this.titleScreen);
        this.flightResultScreenView.hide();
        this.#hide(this.facilityScreen);
        this.#show(this.playScene);
        this.#show(this.hud);
        this.buildPanelView.hide();
    }

    showSectorTitle(sectorNumber, isAnomaly = false, options = {}) {
        if (!this.sectorNotification) {
            return;
        }

        this.sectorNotification.textContent = options.type === 'home'
            ? `HOME SECTOR ${sectorNumber} READY`
            : isAnomaly
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
        this.hudView.initialize(sessionState);
    }

    updateHUDValue(key, value) {
        this.hudView.updateValue(key, value);
    }

    updateMailStatus(index, type, isUnread = false) {
        this.hudView.updateMailStatus(index, type, isUnread);
    }

    setMailHandler(handler) {
        this.hudView.setMailHandler(handler);
    }

    showStoryModal(storyId) {
        this.storyModalView.show(storyId);
    }

    showAchievementToasts(events = []) {
        this.achievementToastView.show(events);
    }

    setFlightMode(isFlight) {
        this.buildPanelView.setFlightMode(isFlight);
    }

    hideBuildPanelForTutorialFocus() {
        if (this.tutorialBuildPanelHidden) {
            return;
        }

        this.tutorialBuildPanelWasVisible = this.buildPanelView.isVisible();
        this.tutorialBuildPanelHidden = true;
        if (this.tutorialBuildPanelWasVisible) {
            this.buildPanelView.hideForTutorialFocus();
        }
    }

    restoreBuildPanelAfterTutorialFocus() {
        if (!this.tutorialBuildPanelHidden) {
            return;
        }

        if (this.tutorialBuildPanelWasVisible) {
            this.buildPanelView.restoreAfterTutorialFocus();
        }
        this.tutorialBuildPanelHidden = false;
        this.tutorialBuildPanelWasVisible = false;
    }

    playFlightEndSE(status) {
        const seId = {
            cleared: 'flight-exit',
            returned: 'flight-return',
            crashed: 'flight-crash',
            lost: 'flight-lost'
        }[status];
        if (seId) {
            this.soundController?.playSE?.(seId);
        }
    }

    getMapCanvas() { return this.mapCanvas; }
    getTitleCanvases() { return { background: this.#requiredElement('#title-bg-canvas'), foreground: this.#requiredElement('#title-fg-canvas') }; }
    setAppMetadata(metadata) { this.appMetadataView.setMetadata(metadata); }
    configureSettings(config) { this.settingsDialogView.configure(config); }
    setStartHandler(handler) { this.setOperationHandler(this.#requiredElement('#start-game-btn'), handler); }
    setManualHandler(handler) { this.setOperationHandler(this.#requiredElement('#how-to-play-btn'), handler); }
    showManualScreen() { this.howToPlayUI.show(); }
    refreshManualLanguage() { this.howToPlayUI.refreshLanguage(); }
    setRecordHandler(handler) { this.archiveDialogView.setOpenHandler(handler); }
    showRecordScreen(viewData, options = {}) { this.archiveDialogView.show(viewData, this.archiveComponents, options); }
    hideRecordScreen() { this.archiveDialogView.hide(); }
    getRecordScreenState() { return this.archiveDialogView.getState?.() ?? { visible: false, activeTab: null }; }
    setReplayStartHandler(handler) { this.archiveDialogView.setReplayStartHandler(handler); }
    setArchiveStoryHandler(handler) { this.archiveDialogView.setStoryOpenHandler(handler); }
    setReplayProtectHandler(handler) { this.replayProtectFlow.setCommitHandler(handler); }
    setReplayProtectRecordsProvider(provider) { this.replayProtectFlow.setRecordsProvider(provider); }
    setReplayExitHandler(handler) { this.setOperationHandler(this.#requiredElement('#exit-replay-btn'), handler); }
    showReplayScreen(record = {}, buildViewData = null) {
        this.hideRecordScreen();
        this.hideStarInfo();
        this.flightResultScreenView.clearMapActionDock();
        this.gameEndScreenView.hide();
        this.flightResultScreenView.hide();
        this.#hide(this.titleScreen);
        this.#hide(this.facilityScreen);
        this.#show(this.playScene);
        this.#show(this.hud);
        this.buildPanelView.hide();
        this.replayScreenView.show(buildViewData, record);
    }
    hideReplayScreen() {
        this.replayScreenView.hide();
        this.buildPanelView.hide();
    }
    showResultScreen(viewData) {
        this.hideStarInfo();
        this.#hide(this.replayOverlay);
        this.gameEndScreenView.hide();
        this.buildPanelView.close();
        this.#hide(this.hud);
        this.buildPanelView.hide();
        this.#hide(this.playScene);
        this.#hide(this.titleScreen);
        this.#hide(this.facilityScreen);
        this.flightResultScreenView.show(viewData);
    }

    setResultStoryHandler(handler) {
        this.flightResultScreenView.setStoryHandler(handler);
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

    showFacilityScreen(type, viewData, buildViewData = null, options = {}) {
        this.hideStarInfo();
        this.facilityCreditCounter.cancel();
        this.flightResultScreenView.clearMapActionDock();
        const collapseBuildPanel = options.collapseBuildPanel !== false;
        if (collapseBuildPanel) {
            this.buildPanelView.close();
        }
        this.flightResultScreenView.hide();
        this.#hide(this.hud);
        this.#show(this.playScene);
        this.buildPanelView.showReadOnly(buildViewData, { collapse: collapseBuildPanel });
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
                this.operationBinder.runLocked(element, () => {
                    handler(element.dataset.action, { uid: element.dataset.uid });
                });
            }, this.operationBinder.getFacilityActionSE(button.dataset.action));
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

    setBuildTabChangeHandler(handler) {
        this.buildPanelView.setTabChangeHandler(handler);
    }

    setCanvasInputHandler(handler) {
        this.canvasInputHandler = handler;
        this.mapInputController.setHandler(handler);
    }

    showStarInfo(body, point) {
        this.currentDeliveryCargoInfo = null;
        this.starInfoPanel.show(body, point, this.mapCanvas);
    }

    showDeliveryCargoInfo({ facilityType, itemId }, point) {
        this.currentDeliveryCargoInfo = { facilityType, itemId, point };
        const facility = this.gameDataRepository.getFacilityDefinition(facilityType);
        const item = this.gameDataRepository.getItemDefinition(itemId);
        this.starInfoPanel.showMessage({
            key: `delivery:${facilityType}:${itemId}`,
            title: this.gameDataRepository.getUiText('map.deliveryCargo.title'),
            body: this.#formatText(
                this.gameDataRepository.getUiText('map.deliveryCargo.body'),
                {
                    itemName: item.name,
                    facilityName: facility.name
                }
            )
        }, point, this.mapCanvas);
    }

    hideStarInfo() {
        this.currentDeliveryCargoInfo = null;
        this.starInfoPanel.hide();
    }

    refreshLanguageDependentUI() {
        this.storyModalView.refreshLanguage();
        this.achievementToastView.refresh();

        if (this.currentDeliveryCargoInfo) {
            const { facilityType, itemId, point } = this.currentDeliveryCargoInfo;
            this.showDeliveryCargoInfo({ facilityType, itemId }, point);
            return;
        }

        this.starInfoPanel.refreshCurrent?.();
    }

    #formatText(template, values) {
        return Object.entries(values).reduce(
            (text, [key, value]) => text.replaceAll(`{${key}}`, value),
            template
        );
    }

    updateFacilityCredits(value) {
        const creditsValue = this.#requiredFacilityElement('.credits-value');
        this.facilityCreditCounter.update(creditsValue, value);
    }

    setOperationHandler(element, handler, seId = 'click') {
        this.operationBinder.bind(element, handler, seId);
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
