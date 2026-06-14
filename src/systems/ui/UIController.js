import { FlightResultComponents } from './FlightResultComponents.js';
import { FacilityComponents } from './FacilityComponents.js';
import { UIComponents } from './UIComponents.js';
import MapInputController from './MapInputController.js';
import StarInfoPanel from './StarInfoPanel.js';

class UIController {
    constructor(options = {}) {
        this.document = options.document || document;
        this.gameDataRepository = options.gameDataRepository;
        this.flightResultComponents = options.flightResultComponents || FlightResultComponents;
        this.facilityComponents = options.facilityComponents || FacilityComponents;
        this.starInfoPanel = options.starInfoPanel || new StarInfoPanel({ document: this.document });
        this.soundController = options.soundController || null;
        this.resultHandler = null;
        this.mapToggleHandler = null;
        this.protectHandler = null;
        this.buildItemSelectionHandler = null;
        this.launchHandler = null;
        this.canvasInputHandler = null;

        if (!this.gameDataRepository) {
            throw new Error('[UIController] gameDataRepository is required.');
        }

        this.titleScreen = this.document.querySelector('#title-screen');
        this.startButton = this.document.querySelector('#start-game-btn');
        this.resultScreen = this.#requiredElement('#flight-result-screen');
        this.facilityScreen = this.#requiredElement('#facility-screen');
        this.playScene = this.document.querySelector('#play-scene-container');
        this.hud = this.document.querySelector('#play-hud');
        this.buildPanel = this.document.querySelector('#inventory-panel');
        this.buildButton = this.document.querySelector('#build-btn');
        this.launchControl = this.document.querySelector('#launch-control');
        this.launchButton = this.document.querySelector('#launch-btn');
        this.mapCanvas = this.document.querySelector('#gameCanvas');
        this.sectorNotification = this.document.querySelector('#sector-notification');
        this.sectorNotificationTimer = null;
        this.mapInputController = options.mapInputController || new MapInputController({
            document: this.document,
            canvas: this.mapCanvas
        });
        this.buildLists = {
            rocket: this.document.querySelector('#list-rocket'),
            launcher: this.document.querySelector('#list-launcher'),
            booster: this.document.querySelector('#list-booster'),
            chassis: this.document.querySelector('#list-chassis'),
            logic: this.document.querySelector('#list-logic'),
            module: this.document.querySelector('#list-module')
        };
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
        this.#wireBuildTabs();
        this.#wireBuildPanelToggle();
    }

    showTitleScreen() {
        this.hideStarInfo();
        this.#show(this.titleScreen);
        this.#hide(this.playScene);
        this.#hide(this.resultScreen);
        this.#hide(this.facilityScreen);
        this.#hide(this.hud);
        this.#hide(this.buildPanel);
        this.#hide(this.launchControl);
    }

    showBuildScreen(viewData = null) {
        this.#hide(this.titleScreen);
        this.#hide(this.resultScreen);
        this.#hide(this.facilityScreen);
        this.#show(this.playScene);
        this.#show(this.hud);
        this.#openBuildPanel();
        this.#show(this.buildPanel);
        if (viewData) {
            this.#renderBuildView(viewData);
            this.#show(this.launchControl);
        } else {
            this.#hide(this.launchControl);
        }
    }

    showSectorTransitionScreen() {
        this.hideStarInfo();
        this.#hide(this.titleScreen);
        this.#hide(this.resultScreen);
        this.#hide(this.facilityScreen);
        this.#show(this.playScene);
        this.#show(this.hud);
        this.#hide(this.buildPanel);
        this.#hide(this.launchControl);
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
        this.buildPanel?.classList.toggle('state-locked', !!isFlight);
        this.launchControl?.classList.toggle('state-locked', !!isFlight);
    }

    getMapCanvas() {
        return this.mapCanvas;
    }

    setStartHandler(handler) {
        this.setOperationHandler(this.#requiredElement('#start-game-btn'), handler);
    }

    showResultScreen(viewData) {
        this.hideStarInfo();
        this.#closeBuildPanel();
        this.#hide(this.hud);
        this.#hide(this.buildPanel);
        this.#hide(this.launchControl);
        this.#hide(this.playScene);
        this.#hide(this.titleScreen);
        this.#hide(this.facilityScreen);
        this.#show(this.resultScreen);
        this.resultScreen.innerHTML = this.flightResultComponents.generateHTML(viewData, this.gameDataRepository);
        this.#wireResultHandlers();
    }

    showFacilityScreen(type, viewData) {
        this.hideStarInfo();
        this.#closeBuildPanel();
        this.#hide(this.resultScreen);
        this.#hide(this.hud);
        this.#hide(this.buildPanel);
        this.#hide(this.launchControl);
        this.#hide(this.playScene);
        this.#hide(this.titleScreen);
        this.#show(this.facilityScreen);
        this.facilityScreen.innerHTML = this.facilityComponents.generateHTML({ ...viewData, type });
    }

    setResultHandler(handler) {
        this.resultHandler = handler;
        this.#wireResultHandlers();
    }

    setMapToggleHandler(handler) {
        this.mapToggleHandler = handler;
        this.#wireResultHandlers();
    }

    setProtectHandler(handler) {
        this.protectHandler = handler;
        this.#wireResultHandlers();
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
        this.buildItemSelectionHandler = handler;
        this.#wireBuildItemSelectionHandlers();
    }

    setBuildAssembleHandler(handler) {
        if (this.buildButton) {
            this.setOperationHandler(this.buildButton, element => {
                const result = handler(element);
                this.#activateBuildTab('flight');
                return result;
            });
        }
    }

    setLaunchHandler(handler) {
        this.launchHandler = handler;
        if (this.launchButton) {
            this.setOperationHandler(this.launchButton, () => this.launchHandler());
        }
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
        this.#requiredFacilityElement('.credits-value').textContent = `${this.#formatNumber(value)} c`;
    }

    #renderBuildView(viewData) {
        Object.entries(this.buildLists).forEach(([sectionId, container]) => {
            if (!container) {
                return;
            }
            const section = viewData.sections?.[sectionId];
            container.innerHTML = this.#generateBuildSectionHTML(section, sectionId);
        });

        this.#updateBuildButton(viewData.assembly);
        this.#updateLaunchButton(viewData.launch);
        this.#wireBuildPlaceholderHandlers();
        this.#wireBuildItemSelectionHandlers();
    }

    #generateBuildSectionHTML(section, sectionId) {
        const entries = section?.entries ?? [];
        if (entries.length === 0) {
            return UIComponents.generatePlaceholderHTML(
                section?.emptyText ?? 'NO ITEM',
                section?.emptySubtext ?? '',
                {
                    category: sectionId,
                    isClickable: !!section?.emptyAction,
                    isNotable: !!section?.emptyNotable,
                    action: section?.emptyAction
                }
            );
        }

        return entries.map(entry => UIComponents.generateCardHTML(entry.itemViewData, {
            isClickable: !entry.disabled,
            isSelected: !!entry.selected,
            selectedCount: entry.selectedCount
        })).join('');
    }

    #updateLaunchButton(launch = {}) {
        if (!this.launchButton) {
            return;
        }

        const ready = !!launch.ready;
        this.launchButton.disabled = !ready;
        this.launchButton.classList.remove('state-hidden');
        this.launchButton.classList.toggle('state-disabled', !ready);
        this.launchButton.classList.toggle('state-notable', !ready);
        const label = this.launchButton.querySelector('.btn-main-label');
        const subtext = this.launchButton.querySelector('.btn-sub-label');
        if (label && launch.label) {
            label.textContent = launch.label;
        }
        if (subtext && launch.subtext) {
            subtext.textContent = launch.subtext;
        }
    }

    #updateBuildButton(assembly = {}) {
        if (!this.buildButton) {
            return;
        }

        const ready = !!assembly.ready;
        this.buildButton.disabled = !ready;
        this.buildButton.classList.toggle('state-disabled', !ready);
        this.buildButton.classList.toggle('state-notable', !ready);
        const label = this.buildButton.querySelector('.btn-main-label');
        const subtext = this.buildButton.querySelector('.btn-sub-label');
        if (label && assembly.label) {
            label.textContent = assembly.label;
        }
        if (subtext && assembly.subtext) {
            subtext.textContent = assembly.subtext;
        }
    }

    #wireBuildTabs() {
        this.buildPanel?.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', event => {
                const tabId = event.currentTarget.dataset.tab;
                this.#activateBuildTab(tabId);
            });
        });
    }

    #activateBuildTab(tabId) {
        this.buildPanel?.querySelectorAll('[data-tab]').forEach(tab => {
            const isActive = tab.dataset.tab === tabId;
            tab.classList.toggle('state-active', isActive);
        });

        const targetMap = {
            flight: 'tab-flight',
            assembly: 'tab-assembly'
        };

        Object.entries(targetMap).forEach(([key, elementId]) => {
            const element = this.document.querySelector(`#${elementId}`);
            if (element) {
                element.classList.toggle('state-hidden', key !== tabId);
            }
        });
    }

    #wireResultHandlers() {
        if (this.resultHandler) {
            this.#setResultOperationHandler('.flight-result-action-button', this.resultHandler);
        }

        if (this.mapToggleHandler) {
            let showMap = false;
            this.#setResultOperationHandler('.flight-result-map-button', () => {
                showMap = !showMap;
                this.resultScreen.querySelector('.Panel').hidden = showMap;
                this.mapToggleHandler(showMap);
            });
        }

        if (this.protectHandler) {
            this.#setResultOperationHandler('.Badge.favorite', element => {
                const isProtected = !element.classList.contains('state-active');
                element.classList.toggle('state-active', isProtected);
                element.classList.toggle('state-inactive', !isProtected);
                this.protectHandler(isProtected);
            });
        }
    }

    #wireBuildPanelToggle() {
        const toggle = this.document.querySelector('#btn-toggle-panel');
        if (toggle) {
            this.setOperationHandler(toggle, () => {
                this.buildPanel?.classList.toggle('state-collapsed');
            });
        }
    }

    #wireBuildItemSelectionHandlers() {
        if (!this.buildItemSelectionHandler || !this.buildPanel) {
            return;
        }

        this.buildPanel.querySelectorAll('.item-list .ItemCard.state-clickable[data-uid]').forEach(card => {
            if (card.dataset.selectionHandlerReady === 'true') {
                return;
            }

            const list = card.closest('.item-list');
            const category = list?.id?.replace(/^list-/, '');
            if (!category) {
                return;
            }

            card.dataset.selectionHandlerReady = 'true';
            this.setOperationHandler(card, element => {
                this.buildItemSelectionHandler({
                    category,
                    uid: element.dataset.uid
                });
            }, 'select');
        });
    }

    #wireBuildPlaceholderHandlers() {
        this.buildPanel?.querySelectorAll('.item-list .ItemCard[data-build-action]').forEach(card => {
            if (card.dataset.actionHandlerReady === 'true') {
                return;
            }

            card.dataset.actionHandlerReady = 'true';
            this.setOperationHandler(card, element => {
                if (element.dataset.buildAction === 'open-assembly') {
                    this.#activateBuildTab('assembly');
                }
            });
        });
    }

    #openBuildPanel() {
        this.buildPanel?.classList.remove('state-collapsed');
    }

    #closeBuildPanel() {
        this.buildPanel?.classList.add('state-collapsed');
    }

    #setResultOperationHandler(selector, handler) {
        const element = this.resultScreen.querySelector(selector);
        if (!element || element.dataset.handlerReady === 'true') {
            return;
        }

        element.dataset.handlerReady = 'true';
        this.setOperationHandler(element, handler);
    }

    setOperationHandler(element, handler, seId = 'click') {
        element.addEventListener('click', event => {
            this.soundController?.playSE?.(seId);
            handler(event.currentTarget);
        });
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

    #formatNumber(value) {
        return new Intl.NumberFormat('en-US').format(value ?? 0);
    }

}

export default UIController;
