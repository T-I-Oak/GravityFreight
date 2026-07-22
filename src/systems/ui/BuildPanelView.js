import { UIComponents } from './UIComponents.js';

class BuildPanelView {
    constructor({ document, operationBinder }) {
        this.document = document;
        this.operationBinder = operationBinder;
        this.selectionHandler = null;
        this.assembleHandler = null;
        this.launchHandler = null;
        this.tabChangeHandler = null;
        this.selectionEnabled = true;
        this.panel = this.document.querySelector('#inventory-panel');
        this.buildButton = this.document.querySelector('#build-btn');
        this.launchControl = this.document.querySelector('#launch-control');
        this.launchButton = this.document.querySelector('#launch-btn');
        this.launchBonus = this.document.querySelector('#launch-return-bonus');
        this.lists = {
            rocket: this.document.querySelector('#list-rocket'),
            launcher: this.document.querySelector('#list-launcher'),
            booster: this.document.querySelector('#list-booster'),
            chassis: this.document.querySelector('#list-chassis'),
            logic: this.document.querySelector('#list-logic'),
            module: this.document.querySelector('#list-module')
        };
    }

    initialize() {
        this.#wireTabs();
        this.#wirePanelToggle();
    }

    show(viewData = null) {
        this.setSelectionEnabled(true);
        this.#open();
        this.#activateTab('flight');
        this.#show(this.panel);
        if (viewData) {
            this.render(viewData);
            this.#show(this.launchControl);
        } else {
            this.#hide(this.launchControl);
        }
    }

    hide() {
        this.setSelectionEnabled(true);
        this.#hide(this.panel);
        this.#hide(this.launchControl);
    }

    isVisible() {
        return !!this.panel
            && !this.panel.hidden
            && !this.panel.classList.contains('state-hidden');
    }

    hideForTutorialFocus() {
        this.#hide(this.panel);
    }

    restoreAfterTutorialFocus() {
        this.#show(this.panel);
    }

    showReadOnly(viewData = null, options = {}) {
        this.setSelectionEnabled(false);
        if (viewData) {
            this.render(viewData);
        }
        if (options.activeTab) {
            this.#activateTab(options.activeTab);
        }
        if (options.collapse !== false) {
            this.close();
        }
        this.#show(this.panel);
        this.#show(this.launchControl);
        this.#disableActionButton(this.buildButton);
        this.#disableActionButton(this.launchButton);
    }

    close() {
        this.panel?.classList.add('state-collapsed');
    }

    setSelectionEnabled(isEnabled) {
        this.selectionEnabled = !!isEnabled;
        this.panel?.classList.toggle('state-readonly', !this.selectionEnabled);
    }

    setFlightMode(isFlight) {
        this.panel?.classList.toggle('state-locked', !!isFlight);
        this.launchControl?.classList.toggle('state-locked', !!isFlight);
    }

    render(viewData) {
        Object.entries(this.lists).forEach(([sectionId, container]) => {
            if (!container) {
                return;
            }
            const section = viewData.sections?.[sectionId];
            container.innerHTML = this.#generateSectionHTML(section, sectionId);
        });

        this.#updateBuildButton(viewData.assembly);
        this.#updateLaunchButton(viewData.launch);
        this.#wirePlaceholderHandlers();
        this.#wireItemSelectionHandlers();
    }

    setItemSelectionHandler(handler) {
        this.selectionHandler = handler;
        this.#wireItemSelectionHandlers();
    }

    setAssembleHandler(handler) {
        this.assembleHandler = handler;
        if (!this.buildButton) {
            return;
        }
        if (this.buildButton.dataset.assembleHandlerReady === 'true') {
            return;
        }

        this.buildButton.dataset.assembleHandlerReady = 'true';
        this.operationBinder(this.buildButton, element => {
            return this.#runLockedOperation(element, () => {
                const result = this.assembleHandler?.(element);
                this.#activateTab('flight');
                return result;
            });
        });
    }

    setLaunchHandler(handler) {
        this.launchHandler = handler;
        if (this.launchButton) {
            if (this.launchButton.dataset.launchHandlerReady === 'true') {
                return;
            }

            this.launchButton.dataset.launchHandlerReady = 'true';
            this.operationBinder(this.launchButton, element => (
                this.#runLockedOperation(element, () => this.launchHandler?.())
            ));
        }
    }

    setTabChangeHandler(handler) {
        this.tabChangeHandler = handler;
    }

    #runLockedOperation(button, handler) {
        if (button.dataset.operationLocked === 'true') {
            return null;
        }

        button.dataset.operationLocked = 'true';
        button.disabled = true;
        button.classList.add('state-disabled');
        button.classList.remove('state-notable');

        try {
            return handler();
        } catch (error) {
            delete button.dataset.operationLocked;
            button.disabled = false;
            button.classList.remove('state-disabled');
            throw error;
        }
    }

    #generateSectionHTML(section, sectionId) {
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
        this.#unlockOperationButton(this.launchButton);
        this.launchButton.disabled = !ready;
        this.launchButton.classList.remove('state-hidden');
        this.launchButton.classList.toggle('state-disabled', !ready);
        this.launchButton.classList.toggle('state-notable', !ready);
        this.#setButtonText(this.launchButton, launch);
        this.#updateLaunchBonus(launch.bonusText);
    }

    #disableActionButton(button) {
        if (!button) {
            return;
        }

        button.disabled = true;
        button.classList.add('state-disabled');
        button.classList.remove('state-notable');
    }

    #updateLaunchBonus(bonusText = '') {
        if (!this.launchBonus) {
            return;
        }

        this.launchBonus.textContent = bonusText;
        this.launchBonus.hidden = !bonusText;
        this.launchBonus.classList.toggle('state-hidden', !bonusText);
    }

    #updateBuildButton(assembly = {}) {
        if (!this.buildButton) {
            return;
        }

        const ready = !!assembly.ready;
        this.#unlockOperationButton(this.buildButton);
        this.buildButton.disabled = !ready;
        this.buildButton.classList.toggle('state-disabled', !ready);
        this.buildButton.classList.toggle('state-notable', !ready);
        this.#setButtonText(this.buildButton, assembly);
    }

    #unlockOperationButton(button) {
        delete button.dataset.operationLocked;
    }

    #setButtonText(button, viewData) {
        const label = button.querySelector('.btn-main-label');
        const subtext = button.querySelector('.btn-sub-label');
        if (label && viewData.label) {
            label.textContent = viewData.label;
        }
        if (subtext && viewData.subtext) {
            subtext.textContent = viewData.subtext;
        }
    }

    #wireTabs() {
        this.panel?.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', event => {
                this.#activateTab(event.currentTarget.dataset.tab);
            });
        });
    }

    #activateTab(tabId) {
        this.panel?.querySelectorAll('[data-tab]').forEach(tab => {
            tab.classList.toggle('state-active', tab.dataset.tab === tabId);
        });

        const targetMap = {
            flight: 'tab-flight',
            assembly: 'tab-assembly'
        };

        Object.entries(targetMap).forEach(([key, elementId]) => {
            const element = this.document.querySelector(`#${elementId}`);
            element?.classList.toggle('state-hidden', key !== tabId);
        });
        this.tabChangeHandler?.(tabId);
    }

    #wirePanelToggle() {
        const toggle = this.document.querySelector('#btn-toggle-panel');
        if (toggle) {
            this.operationBinder(toggle, () => {
                this.panel?.classList.toggle('state-collapsed');
            });
        }
    }

    #wireItemSelectionHandlers() {
        if (!this.selectionHandler || !this.panel) {
            return;
        }

        this.panel.querySelectorAll('.item-list .ItemCard.state-clickable[data-uid]').forEach(card => {
            if (card.dataset.selectionHandlerReady === 'true') {
                return;
            }

            const list = card.closest('.item-list');
            const category = list?.id?.replace(/^list-/, '');
            if (!category) {
                return;
            }

            card.dataset.selectionHandlerReady = 'true';
            this.operationBinder(card, element => {
                if (!this.selectionEnabled) {
                    return;
                }
                const viewData = this.selectionHandler({
                    category,
                    uid: element.dataset.uid
                });
                if (viewData) {
                    this.render(viewData);
                }
            });
        });
    }

    #wirePlaceholderHandlers() {
        this.panel?.querySelectorAll('.item-list .ItemCard[data-build-action]').forEach(card => {
            if (card.dataset.actionHandlerReady === 'true') {
                return;
            }

            card.dataset.actionHandlerReady = 'true';
            this.operationBinder(card, element => {
                if (element.dataset.buildAction === 'open-assembly') {
                    this.#activateTab('assembly');
                }
            });
        });
    }

    #open() {
        this.panel?.classList.remove('state-collapsed');
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

export default BuildPanelView;
