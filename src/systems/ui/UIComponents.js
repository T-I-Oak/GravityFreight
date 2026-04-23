/**
 * UIComponents.js
 * Standardized HTML generation logic for Gravity Freight.
 */
import { STORY_DATA, FACILITY_INFO, getFacilityById } from '../../core/Data.js';

export class UIComponents {
    /**
     * Generates a complete item card HTML string.
     * @param {Object} item - Item data (V1-style flat structure)
     * @param {Object} options - { isClickable, isEnhanced }
     */
    static generateCardHTML(item, options = {}) {
        // --- 1. Preparation (Contextual Data) ---
        const category = item.category ? item.category.toLowerCase() : '';
        const clickableClass = (options.isClickable || item.isClickable) ? 'is-clickable' : '';
        const activeClass = options.isActive ? 'is-active' : '';
        const categoryClass = category ? `is-${category}` : '';
        const instanceId = item.uid || '';
        const displayName = item.name || `[MISSING_NAME: ${item.id}]`;

        // --- 2. Parts Generation (Sub-components) ---
        const headerRight = this.generateHeaderRightHTML(item, options);
        const headerHTML = `
            <header class="ui-item-card__header ui-split-row">
                <h3 class="ui-item-card__title">${displayName}</h3>
                <div class="ui-item-card__header-right">${headerRight}</div>
            </header>
        `;

        const bodyHTML = item.description 
            ? `<div class="ui-item-card__description">${item.description}</div>` 
            : '';

        const footerHTML = this.generateFooterHTML(item, options);
        const detailsHTML = (category === 'rocket' && Array.isArray(item.modules))
            ? this.generateRocketDetailsHTML(item.modules)
            : '';

        // --- 3. Final Assembly (Isomorphic Frame) ---
        return `
            <article class="ui-item-card ${clickableClass} ${categoryClass} ${activeClass}" 
                     data-id="${item.id}" 
                     data-uid="${instanceId}">
                ${headerHTML}
                ${bodyHTML}
                ${footerHTML}
                ${detailsHTML}
            </article>
        `;
    }

    /**
     * Internal: Generates the right-side content of the header (Badge/HP).
     */
    static generateHeaderRightHTML(item, options) {
        let html = '';

        // Durability Gauge (Explicit data only)
        if (item.maxCharges !== undefined && item.maxCharges > 0) {
            const isDurableEnhanced = !!(options.isEnhanced || (item.enhancement && item.enhancement.charges > 0));
            html += this.generateHPGauge(item.charges, item.maxCharges, isDurableEnhanced);
        }
        
        // Stack Badge
        if (item.count > 1) {
            html += `<div class="ui-badge is-stack">x${item.count}</div>`;
        }

        // Status Badge
        if (options.status) {
            const status = options.status.toLowerCase();
            html += `<span class="ui-item-card__status is-${status}">${status.toUpperCase()}</span>`;
        }

        return html;
    }

    /**
     * Internal: Generates the property footer area.
     */
    static generateFooterHTML(item, options) {
        // Defined list of displayed properties and their semantic types
        const displayProps = [
            { key: 'slots', label: 'SLOTS', type: 'is-additive' },
            { key: 'slotsMax', label: 'MAX SLOTS', type: 'is-additive' },
            { key: 'precisionMultiplier', label: 'PRECISION', type: 'is-multiplier' },
            { key: 'pickupMultiplier', label: 'PICKUP', type: 'is-multiplier' },
            { key: 'gravityMultiplier', label: 'GRAVITY', type: 'is-multiplier' }
        ];

        let propItems = '';
        displayProps.forEach(config => {
            const val = item[config.key];
            if (val !== undefined) {
                const isEnhanced = item.enhancement && item.enhancement[config.key] > 0;
                const enhancedClass = isEnhanced ? 'is-enhanced' : '';
                
                propItems += `
                    <div class="ui-item-card__prop ${enhancedClass} ${config.type}">
                        <span class="ui-item-card__prop-label">${config.label}</span>
                        <span class="ui-item-card__prop-value">${val}</span>
                    </div>`;
            }
        });

        return propItems ? `<footer class="ui-item-card__footer"><div class="ui-item-card__prop-group">${propItems}</div></footer>` : '';
    }

    /**
     * Generates a segmented durability gauge for UI.
     */
    static generateHPGauge(current, max, isEnhanced = false, sizeClass = '') {
        let segments = '';
        const enhancedClass = isEnhanced ? 'is-enhanced' : '';
        for (let i = 0; i < max; i++) {
            const isActive = i < current ? 'is-active' : '';
            segments += `<div class="ui-durability-segment ${isActive}"></div>`;
        }
        return `<div class="ui-durability-gauge ${enhancedClass} ${sizeClass}">${segments}</div>`;
    }

    /**
     * Generates the module list area for a Rocket card.
     * @param {Array} modules - Array of item objects
     */
    static generateRocketDetailsHTML(modules) {
        let rows = '';
        modules.forEach(mod => {
            let meta = '';
            
            // Minimalist gauge for modules (always mini)
            if (mod.maxCharges && mod.maxCharges > 0) {
                const current = mod.charges !== undefined ? mod.charges : mod.maxCharges;
                meta = this.generateHPGauge(current, mod.maxCharges, false, 'is-mini');
            } else if (mod.count && mod.count > 1) {
                // Minimalist badge for stacks (always mini)
                meta = `<div class="ui-badge is-stack is-mini">x${mod.count}</div>`;
            }

            rows += `
                <div class="ui-module-row ui-split-row">
                    <span class="ui-module-name">${mod.name}</span>
                    <div class="ui-module-meta">${meta}</div>
                </div>
            `;
        });

        return `<div class="ui-rocket-details">${rows}</div>`;
    }

    /**
     * Generates a story card HTML string.
     * @param {string} storyId - Key for STORY_DATA (e.g., 'T')
     * @param {boolean} isNew - Whether to apply a "new" pulse animation
     */
    static generateStoryCardHTML(storyId, isNew = false) {
        const story = STORY_DATA[storyId];
        const facilityClass = getFacilityById(story.branch).className;

        return `
            <article class="ui-item-card is-story is-active is-clickable ${facilityClass}">
                <header class="ui-item-card__header ui-split-row">
                    <h3 class="ui-item-card__title">${story.title}</h3>
                    <div class="ui-item-card__header-right">
                        <span class="ui-icon is-icon-mail ${isNew ? 'is-new' : ''}"></span>
                    </div>
                </header>
                <div class="ui-item-card__description">${story.discovery}</div>
            </article>
        `;
    }

    /**
     * Generates a complete story modal HTML string.
     * @param {string} storyId - Key for STORY_DATA
     */
    static generateStoryModalHTML(storyId) {
        const story = STORY_DATA[storyId];

        const facility = getFacilityById(story.branch);
        const facilityClass = facility.className;
        const icon = facility.icon;

        return `
            <article class="ui-panel ${facilityClass} is-story">
                <header class="ui-panel__header">
                    <div class="ui-facility-badge">${icon}</div>
                    <h1 class="ui-panel__title">${story.title}</h1>
                </header>

                <div class="ui-panel__body is-scrollable">
                    <div class="is-intro">${story.discovery}</div>
                    <div class="ui-well">${story.content}</div>
                </div>

                <footer class="ui-panel__footer">
                    <button class="ui-button is-big" id="story-modal-close">CLOSE</button>
                </footer>
            </article>
        `;
    }

    /**
     * Generates a placeholder card HTML string for empty slots.
     * @param {string} text - Main message (e.g., "NO ROCKET EQUIPPED")
     * @param {string} subtext - Guidance message (e.g., "CLICK TO BUILD")
     * @param {Object} options - { category, isNotable, isClickable }
     */
    static generatePlaceholderHTML(text, subtext, options = {}) {
        const category = options.category ? `is-${options.category}` : '';
        const notable = options.isNotable ? 'is-notable' : '';
        const clickable = options.isClickable ? 'is-clickable' : '';

        return `
            <article class="ui-item-card is-placeholder ${category} ${notable} ${clickable}">
                <div class="placeholder-text">${text}</div>
                <div class="placeholder-subtext">${subtext}</div>
            </article>
        `;
    }
}
