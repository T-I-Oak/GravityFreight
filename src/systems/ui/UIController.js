import { FlightResultComponents } from './FlightResultComponents.js';
import { FacilityComponents } from './FacilityComponents.js';

class UIController {
    constructor(options = {}) {
        this.document = options.document || document;
        this.gameDataRepository = options.gameDataRepository;
        this.flightResultComponents = options.flightResultComponents || FlightResultComponents;
        this.facilityComponents = options.facilityComponents || FacilityComponents;
        this.soundController = options.soundController || null;

        if (!this.gameDataRepository) {
            throw new Error('[UIController] gameDataRepository is required.');
        }

        this.titleScreen = this.document.querySelector('#title-screen');
        this.startButton = this.document.querySelector('#start-game-btn');
        this.resultScreen = this.#requiredElement('#flight-result-screen');
        this.facilityScreen = this.#requiredElement('#facility-screen');
        this.hud = this.document.querySelector('#play-hud, #mission-hud');
        this.buildPanel = this.document.querySelector('#build-overlay, #terminal-panel');
        this.launchControl = this.document.querySelector('#launch-control');
        this.mapCanvas = this.document.querySelector('#gameCanvas');
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
    }

    showTitleScreen() {
        this.#show(this.titleScreen);
        this.#hide(this.resultScreen);
        this.#hide(this.facilityScreen);
        this.#hide(this.hud);
        this.#hide(this.buildPanel);
        this.#hide(this.launchControl);
    }

    showBuildScreen() {
        this.#hide(this.titleScreen);
        this.#hide(this.resultScreen);
        this.#hide(this.facilityScreen);
        this.#show(this.hud);
        this.#show(this.buildPanel);
        this.#hide(this.launchControl);
    }

    initHUD(sessionState) {
        this.updateHUDValue('sector', sessionState.sectorNumber);
        this.updateHUDValue('score', sessionState.totalScore ?? 0);
        this.updateHUDValue('coin', sessionState.coins ?? 0);
        this.mailButtons.forEach(button => {
            button.disabled = true;
            button.classList.remove('type-t', 'type-r', 'type-b', 'state-animating');
            button.classList.add('gray');
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
        this.#hide(this.hud);
        this.#hide(this.buildPanel);
        this.#hide(this.launchControl);
        this.#hide(this.titleScreen);
        this.#hide(this.facilityScreen);
        this.#show(this.resultScreen);
        this.resultScreen.innerHTML = this.flightResultComponents.generateHTML(viewData, this.gameDataRepository);
    }

    showFacilityScreen(type, viewData) {
        this.#hide(this.resultScreen);
        this.#hide(this.hud);
        this.#hide(this.buildPanel);
        this.#hide(this.launchControl);
        this.#hide(this.titleScreen);
        this.#show(this.facilityScreen);
        this.facilityScreen.innerHTML = this.facilityComponents.generateHTML({ ...viewData, type });
    }

    setResultHandler(handler) {
        this.setOperationHandler(this.#requiredResultElement('.flight-result-action-button'), handler);
    }

    setMapToggleHandler(handler) {
        let showMap = false;
        this.setOperationHandler(this.#requiredResultElement('.flight-result-map-button'), () => {
            showMap = !showMap;
            this.resultScreen.querySelector('.Panel').hidden = showMap;
            handler(showMap);
        });
    }

    setProtectHandler(handler) {
        this.setOperationHandler(this.#requiredResultElement('.Badge.favorite'), element => {
            const isProtected = !element.classList.contains('state-active');
            element.classList.toggle('state-active', isProtected);
            element.classList.toggle('state-inactive', !isProtected);
            handler(isProtected);
        });
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

    updateFacilityCredits(value) {
        this.#requiredFacilityElement('.credits-value').textContent = `${this.#formatNumber(value)} c`;
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

    #requiredResultElement(selector) {
        const element = this.resultScreen.querySelector(selector);
        if (!element) {
            throw new Error(`[UIController] Required result element not found: ${selector}`);
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
