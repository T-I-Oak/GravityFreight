class UIOperationBinder {
    constructor({ getSoundController = () => null } = {}) {
        this.getSoundController = getSoundController;
    }

    bind(element, handler, seId = 'click') {
        element.addEventListener('click', event => {
            if (event.currentTarget.disabled || event.currentTarget.classList.contains('state-disabled')) {
                event.preventDefault();
                return;
            }
            this.getSoundController()?.playSE?.(seId);
            handler(event.currentTarget, event);
        });
    }

    runLocked(button, handler) {
        if (button.dataset.operationLocked === 'true') {
            return null;
        }

        button.dataset.operationLocked = 'true';
        button.disabled = true;
        button.classList.add('state-disabled');

        try {
            return handler();
        } catch (error) {
            delete button.dataset.operationLocked;
            button.disabled = false;
            button.classList.remove('state-disabled');
            throw error;
        }
    }

    getFacilityActionSE(action) {
        return new Set(['buy', 'sell', 'repair', 'dismantle', 'buy_normal', 'buy_premium']).has(action)
            ? 'cashier'
            : 'click';
    }
}

export default UIOperationBinder;
