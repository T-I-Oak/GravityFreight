class SettingsDialogView {
    constructor(options = {}) {
        this.document = options.document || document;
        this.operationBinder = options.operationBinder;
        this.overlay = this.document.querySelector('#settings-overlay');
        this.openButtons = [...this.document.querySelectorAll('#title-settings-btn, #build-settings-btn')];
        this.volumeSlider = this.document.querySelector('#se-volume-slider');
        this.volumeValue = this.document.querySelector('#volume-value-display');
        this.cameraResetButton = this.document.querySelector('#camera-reset-btn');
        this.tutorialResetButton = this.document.querySelector('#tutorial-reset-btn');
        this.languageSelect = this.document.querySelector('#language-select');
        this.config = {};
        this.volumeReady = false;
        this.cameraReady = false;
        this.tutorialReady = false;
        this.languageReady = false;

        if (!this.operationBinder) {
            throw new Error('[SettingsDialogView] operationBinder is required.');
        }
    }

    initialize() {
        this.openButtons.forEach(button => this.operationBinder(button, () => this.#show()));

        ['#close-settings-btn', '#settings-done-btn'].forEach(selector => {
            const button = this.document.querySelector(selector);
            if (button) {
                this.operationBinder(button, () => this.#hide());
            }
        });
    }

    configure(config = {}) {
        this.config = { ...this.config, ...config };
        this.#syncVolume(this.config.seVolume);
        this.#bindVolume();
        this.#bindCameraReset();
        this.#bindTutorialReset();
        this.#bindLanguageSelector();
    }

    #show() {
        if (this.overlay) {
            this.overlay.hidden = false;
            this.overlay.classList.remove('state-hidden');
        }
        this.config.onOpen?.();
    }

    #hide() {
        if (this.overlay) {
            this.overlay.hidden = true;
            this.overlay.classList.add('state-hidden');
        }
        this.config.onClose?.();
    }

    #bindVolume() {
        if (!this.volumeSlider || this.volumeReady) {
            return;
        }

        this.volumeReady = true;
        this.volumeSlider.addEventListener('input', event => {
            const value = this.#volumeFromSlider(event.currentTarget.value);
            this.#syncVolume(value);
            this.config.onSEVolumeChange?.(value);
        });
    }

    #bindCameraReset() {
        if (!this.cameraResetButton || this.cameraReady) {
            return;
        }

        this.cameraReady = true;
        this.operationBinder(this.cameraResetButton, () => this.config.onCameraReset?.());
    }

    #bindTutorialReset() {
        if (!this.tutorialResetButton || this.tutorialReady) {
            return;
        }

        this.tutorialReady = true;
        this.operationBinder(this.tutorialResetButton, () => this.config.onTutorialReset?.());
    }

    #bindLanguageSelector() {
        if (!this.languageSelect || this.languageReady || !this.config.setupLanguageSelector) {
            return;
        }

        this.languageReady = true;
        this.config.setupLanguageSelector(this.languageSelect, ['ja', 'en'], this.config.onLanguageChange);
    }

    #syncVolume(volume) {
        if (!this.volumeSlider || volume === undefined) {
            return;
        }

        const percent = Math.round(this.#clampVolume(volume) * 100);
        this.volumeSlider.value = String(percent);
        if (this.volumeValue) {
            this.volumeValue.textContent = `${percent}%`;
        }
    }

    #volumeFromSlider(value) {
        return this.#clampVolume(Number(value) / 100);
    }

    #clampVolume(value) {
        if (!Number.isFinite(value)) {
            return 0.5;
        }
        return Math.max(0, Math.min(1, value));
    }
}

export default SettingsDialogView;
