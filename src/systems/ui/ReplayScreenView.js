import { UIComponents } from './UIComponents.js';

const REPLAY_LOADOUT_SECTIONS = [
    { id: 'rocket', label: 'ROCKET' },
    { id: 'launcher', label: 'LAUNCHER' },
    { id: 'booster', label: 'BOOSTER' }
];

class ReplayScreenView {
    constructor({ document }) {
        this.document = document;
        this.overlay = this.document.querySelector('#replay-overlay');
        this.loadoutList = this.document.querySelector('#replay-config-list');
    }

    show(buildViewData = null) {
        this.#renderLoadout(buildViewData);
        this.#show(this.overlay);
    }

    hide() {
        this.#hide(this.overlay);
        if (this.loadoutList) {
            this.loadoutList.innerHTML = '';
        }
    }

    #renderLoadout(buildViewData) {
        if (!this.loadoutList) {
            return;
        }

        this.loadoutList.innerHTML = REPLAY_LOADOUT_SECTIONS
            .map(section => this.#createSectionHTML(section, buildViewData?.sections?.[section.id]))
            .join('');
    }

    #createSectionHTML(sectionDefinition, sectionViewData = {}) {
        const entries = sectionViewData.entries ?? [];
        const body = entries.length > 0
            ? entries.map(entry => UIComponents.generateCardHTML(entry.itemViewData, {
                isClickable: false,
                isSelected: false,
                selectedCount: 0
            })).join('')
            : `<p class="replay-empty">NO ${sectionDefinition.label}</p>`;

        return `
            <section class="replay-loadout-section ${sectionDefinition.id}">
                <h3 class="section-title">${sectionDefinition.label}</h3>
                <div class="replay-loadout-items">${body}</div>
            </section>
        `;
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

export default ReplayScreenView;
