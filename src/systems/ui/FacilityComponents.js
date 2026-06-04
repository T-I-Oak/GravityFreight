import { UIComponents } from './UIComponents.js';

export class FacilityComponents {
    static generateHTML(viewData) {
        const sectionsHTML = viewData.sections
            .map(section => this.generateSectionHTML(section))
            .join('');

        return `
            <section class="Panel ${viewData.themeClass}">
                <header class="panel-header">
                    <div class="FacilityBadge">${viewData.icon}</div>
                    <div class="facility-title-group">
                        <h1 class="panel-title">${viewData.name}</h1>
                        <span class="panel-subtitle">${viewData.description}</span>
                    </div>
                </header>

                <div class="panel-body">
                    <div class="Well">
                        <div class="ColumnSet">
                            ${sectionsHTML}
                        </div>
                    </div>
                </div>

                <footer class="panel-footer">
                    <div class="player-credits">
                        <span class="credits-label">${viewData.creditsLabel}</span>
                        <span class="credits-value coin">${UIComponents.formatNumber(viewData.coins)} c</span>
                    </div>
                    <button class="Button state-primary button-large facility-depart-button ${viewData.themeClass}">
                        <span class="btn-main-label">${viewData.departLabel}</span>
                    </button>
                </footer>
            </section>
        `;
    }

    static generateSectionHTML(section) {
        const entriesHTML = section.entries.length > 0
            ? section.entries.map(entry => this.generateEntryHTML(entry)).join('')
            : UIComponents.generatePlaceholderHTML(section.emptyText, section.emptySubtext, { category: section.themeClass });

        return `
            <section class="Column ScrollArea" data-section="${section.id}">
                <header class="section-header">
                    <h3 class="section-title">${section.title}</h3>
                    <span class="section-subtitle">${section.subtitle}</span>
                </header>

                <div class="item-list">${entriesHTML}</div>
            </section>
        `;
    }

    static generateEntryHTML(entry) {
        const disabledClass = entry.disabled ? 'state-disabled' : '';
        const discountHTML = entry.discountPercent > 0
            ? `<div class="Badge discount ${this.#discountLevel(entry.discountPercent)}"><span class="sticker-num">${entry.discountPercent}</span><span class="sticker-pct">% OFF</span></div>`
            : '';

        return `
            <div class="trade-entry SplitRow" data-action="${entry.action}" data-uid="${entry.uid}">
                <div class="trade-item-area">
                    ${UIComponents.generateCardHTML(entry.itemViewData, entry.cardOptions || {})}
                </div>
                <div class="trade-action-area SplitColumn">
                    <div class="trade-action-group">
                        <div class="trade-price coin">${UIComponents.formatNumber(entry.price)} c</div>
                        ${discountHTML}
                    </div>
                    <button class="Button state-primary facility-action-button ${disabledClass}"
                            data-action="${entry.action}"
                            data-uid="${entry.uid}">
                        ${entry.actionLabel}
                    </button>
                </div>
            </div>
        `;
    }

    static #discountLevel(percent) {
        if (percent >= 50) {
            return 'high';
        }
        if (percent >= 30) {
            return 'mid';
        }
        return 'low';
    }
}
