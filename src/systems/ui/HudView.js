class HudView {
    constructor({ valueElements = {}, mailButtons = [], operationBinder, formatNumber }) {
        this.valueElements = valueElements;
        this.mailButtons = mailButtons;
        this.operationBinder = operationBinder;
        this.formatNumber = formatNumber;
        this.mailHandler = null;
    }

    initialize(sessionState) {
        this.updateValue('sector', sessionState.sectorNumber);
        this.updateValue('score', sessionState.totalScore ?? 0);
        this.updateValue('coin', sessionState.coins ?? 0);
        this.mailButtons.forEach(button => {
            button.classList.remove('trading-post', 'repair-dock', 'black-market', 'state-new', 'state-clickable');
            button.classList.add('state-disabled');
        });
    }

    updateValue(key, value) {
        const element = this.valueElements[key];
        if (element) {
            element.textContent = this.formatNumber(value);
        }
    }

    updateMailStatus(index, type, isUnread = false) {
        const button = this.mailButtons[index];
        if (!button) {
            return;
        }

        button.classList.remove('trading-post', 'repair-dock', 'black-market', 'state-new');
        const themeClass = {
            T: 'trading-post',
            R: 'repair-dock',
            B: 'black-market'
        }[type];

        if (!themeClass) {
            button.classList.add('state-disabled');
            button.classList.remove('state-clickable');
            return;
        }

        button.classList.add(themeClass, 'state-clickable');
        button.classList.remove('state-disabled');
        if (isUnread) {
            button.classList.add('state-new');
        }
    }

    setMailHandler(handler) {
        this.mailHandler = handler;
        this.mailButtons.forEach((button, index) => {
            if (button.dataset.mailHandlerReady === 'true') {
                return;
            }

            button.dataset.mailHandlerReady = 'true';
            this.operationBinder.bind(button, () => this.mailHandler?.(index));
        });
    }
}

export default HudView;
