import { UIComponents } from './UIComponents.js';

class BuildPanelView {
    constructor({ document, operationBinder }) {
        this.document = document;
        this.operationBinder = operationBinder;
        this.selectionHandler = null;
        this.selectionEnabled = true;
        this.panel = this.document.querySelector('#inventory-panel');
        this.buildButton = this.document.querySelector('#build-btn');
        this.launchControl = this.document.querySelector('#launch-control');
        this.launchButton = this.document.querySelector('#launch-btn');
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

    showReadOnly() {
        this.setSelectionEnabled(false);
        this.#show(this.panel);
        this.#show(this.launchControl);
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
        if (!this.buildButton) {
            return;
        }

        this.operationBinder(this.buildButton, element => {
            const result = handler(element);
            this.#activateTab('flight');
            return result;
        });
    }

    setLaunchHandler(handler) {
        if (this.launchButton) {
            this.operationBinder(this.launchButton, () => handler());
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
        this.launchButton.disabled = !ready;
        this.launchButton.classList.remove('state-hidden');
        this.launchButton.classList.toggle('state-disabled', !ready);
        this.launchButton.classList.toggle('state-notable', !ready);
        this.#setButtonText(this.launchButton, launch);
    }

    #updateBuildButton(assembly = {}) {
        if (!this.buildButton) {
            return;
        }

        const ready = !!assembly.ready;
        this.buildButton.disabled = !ready;
        this.buildButton.classList.toggle('state-disabled', !ready);
        this.buildButton.classList.toggle('state-notable', !ready);
        this.#setButtonText(this.buildButton, assembly);
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
                this.selectionHandler({
                    category,
                    uid: element.dataset.uid
                });
            }, 'select');
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
