class SettingsDialogView {
    constructor(options = {}) {
        this.document = options.document || document;
        this.operationBinder = options.operationBinder;
        this.overlay = this.document.querySelector('#settings-overlay');
        this.titleButton = this.document.querySelector('#title-settings-btn');

        if (!this.operationBinder) {
            throw new Error('[SettingsDialogView] operationBinder is required.');
        }
    }

    initialize() {
        if (this.titleButton) {
            this.operationBinder(this.titleButton, () => this.#show());
        }

        ['#close-settings-btn', '#settings-done-btn'].forEach(selector => {
            const button = this.document.querySelector(selector);
            if (button) {
                this.operationBinder(button, () => this.#hide());
            }
        });
    }

    #show() {
        if (this.overlay) {
            this.overlay.hidden = false;
            this.overlay.classList.remove('state-hidden');
        }
    }

    #hide() {
        if (this.overlay) {
            this.overlay.hidden = true;
            this.overlay.classList.add('state-hidden');
        }
    }
}

export default SettingsDialogView;
