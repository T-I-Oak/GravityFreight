import { UIComponents } from './UIComponents.js';

export class FacilityComponents {
    static generateHTML(viewData) {
        const sectionsHTML = viewData.sections
            .map(section => this.generateSectionHTML(section))
            .join('');

        return `
            <section class="Panel ${viewData.themeClass}">
                <header id="facility-header" class="panel-header">
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
                        <span class="credits-value num-coin" data-facility-credits-value="${viewData.coins}">${UIComponents.formatNumber(viewData.coins)} c</span>
                    </div>
                    <button id="facility-depart-button" class="Button state-primary button-large facility-depart-button ${viewData.themeClass}">
                        <span class="btn-main-label">${viewData.departLabel}</span>
                    </button>
                </footer>
            </section>
        `;
    }

    static generateSectionHTML(section) {
        if (section.sections?.length > 0) {
            const sectionHeaderHTML = section.title
                ? this.generateSectionHeaderHTML(section)
                : '';
            const sectionGroupsHTML = section.sections
                .map(child => `
                    <div id="${this.#sectionElementId(child.id)}" class="facility-subsection" data-section-child="${child.id}">
                        ${this.generateSectionContentHTML(child)}
                    </div>
                `)
                .join('');

            return `
                <section id="${this.#sectionElementId(section.id)}" class="Column ScrollArea" data-section="${section.id}">
                    ${sectionHeaderHTML}
                    ${sectionGroupsHTML}
                </section>
            `;
        }

        return `
            <section id="${this.#sectionElementId(section.id)}" class="Column ScrollArea" data-section="${section.id}">
                ${this.generateSectionContentHTML(section)}
            </section>
        `;
    }

    static generateSectionContentHTML(section) {
        const staggerEntries = this.#shouldStaggerSection(section.id);
        const entriesHTML = section.entries.length > 0
            ? section.entries.map((entry, index) => this.generateEntryHTML(entry, { stagger: staggerEntries, index })).join('')
            : UIComponents.generatePlaceholderHTML(section.emptyText, section.emptySubtext, { category: section.themeClass });
        const listClass = staggerEntries && section.entries.length > 0 ? 'item-list state-staggered-list' : 'item-list';

        return `
            ${this.generateSectionHeaderHTML(section)}

            <div class="${listClass}">${entriesHTML}</div>
        `;
    }

    static generateSectionHeaderHTML(section) {
        const variantClass = section.headerVariant === 'category' ? ' category-header' : '';
        const themeClass = section.headerVariant === 'category' && section.themeClass ? ` ${section.themeClass}` : '';
        const subtitleHTML = section.subtitle
            ? `<span class="section-subtitle">${section.subtitle}</span>`
            : '';
        return `
            <header class="section-header${variantClass}${themeClass}">
                <h3 class="section-title">${section.title}</h3>
                ${subtitleHTML}
            </header>
        `;
    }

    static generateEntryHTML(entry, options = {}) {
        const disabledClass = entry.disabled ? 'state-disabled' : '';
        const disabledAttribute = entry.disabled ? 'disabled' : '';
        const staggerClass = options.stagger ? ' state-staggered-item' : '';
        const staggerStyle = options.stagger ? `style="--item-appear-index: ${options.index};"` : '';
        const discountHTML = entry.discountPercent > 0
            ? `<div class="Badge discount ${this.#discountLevel(entry.discountPercent)}"><span class="sticker-num">${entry.discountPercent}</span><span class="sticker-pct">% OFF</span></div>`
            : '';
        const actionAreaHTML = entry.hideAction
            ? ''
            : `
                <div class="trade-action-area SplitColumn">
                    <div class="trade-action-group">
                        <div class="trade-price num-coin">${UIComponents.formatNumber(entry.price)} c</div>
                        ${discountHTML}
                    </div>
                    <button class="Button state-primary facility-action-button ${entry.buttonClass || ''} ${disabledClass}"
                            data-action="${entry.action}"
                            data-uid="${entry.uid}"
                            ${disabledAttribute}>
                        ${entry.actionLabel}
                    </button>
                </div>
            `;

        return `
            <div class="trade-entry SplitRow${staggerClass}" ${staggerStyle} data-action="${entry.action}" data-uid="${entry.uid}">
                <div class="trade-item-area">
                    ${UIComponents.generateCardHTML(entry.itemViewData, entry.cardOptions || {})}
                </div>
                ${actionAreaHTML}
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

    static #shouldStaggerSection(sectionId) {
        return ['received', 'acquired', 'blackMarketAcquired'].includes(sectionId);
    }

    static #sectionElementId(sectionId) {
        return `facility-section-${String(sectionId).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    }
}
