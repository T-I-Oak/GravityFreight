/**
 * UIComponents.js (V2 Modernized - Explicit View Filtering Version)
 * Standardized HTML generation logic for Gravity Freight V2.
 */
export class UIComponents {
    /**
     * Generates a complete item card HTML string.
     * @param {Object} item - Item data (V1-style flat structure)
     * @param {Object} options - { isClickable, isEnhanced }
     */
    static generateCardHTML(item, options = {}) {
        const category = (item.category || 'unknown').toLowerCase();
        const clickableClass = (options.isClickable || item.isClickable) ? 'is-clickable' : '';
        const activeClass = options.isActive ? 'is-active' : '';
        const categoryClass = `is-${category}`;
        
        let headerRight = '';
        
        // --- 1. Durability/Charges Gauge ---
        // Explicitly using maxCharges and current charges as per V2 logic
        if (item.maxCharges !== undefined && item.maxCharges > 0) {
            const current = item.charges !== undefined ? item.charges : item.maxCharges;
            // Detect enhancement from data or explicit option
            const isDurableEnhanced = !!(options.isEnhanced || (item.enhancement && item.enhancement.charges > 0));
            headerRight += this.generateHPGauge(current, item.maxCharges, isDurableEnhanced);
        }
        
        // --- 2. Stack Badge ---
        const currentCount = item.count || 0;
        if (currentCount > 1) {
            headerRight += `<div class="ui-stack-badge">x${currentCount}</div>`;
        }

        const headerHTML = `
            <header class="ui-item-card__header">
                <h3 class="ui-item-card__title">${item.name || 'Unknown Item'}</h3>
                <div class="ui-item-card__header-right">${headerRight}</div>
            </header>
        `;

        const bodyHTML = item.description ? `<div class="ui-item-card__description">${item.description}</div>` : '';

        // --- 3. Footer (Explicit Property Filtering & Formatting) ---
        // Defined list of displayed properties and their formatting rules
        const displayProps = [
            { key: 'slots', label: 'SLOTS', prefix: '' },
            { key: 'precisionMultiplier', label: 'PRECISION', prefix: 'x' },
            { key: 'pickupMultiplier', label: 'PICKUP', prefix: 'x' },
            { key: 'gravityMultiplier', label: 'GRAVITY', prefix: 'x' }
        ];

        let propItems = '';
        displayProps.forEach(config => {
            const val = item[config.key];
            if (val !== undefined) {
                // Check for enhancement (item.enhancement.[key] > 0)
                const isEnhanced = item.enhancement && item.enhancement[config.key] > 0;
                const enhancedClass = isEnhanced ? 'is-enhanced' : '';
                
                propItems += `
                    <div class="ui-item-card__prop ${enhancedClass}">
                        <span class="ui-item-card__prop-label">${config.label}</span>
                        <span class="ui-item-card__prop-value">${config.prefix}${val}</span>
                    </div>`;
            }
        });

        const footerHTML = propItems ? `<footer class="ui-item-card__footer"><div class="ui-item-card__prop-group">${propItems}</div></footer>` : '';
        
        // --- 4. Rocket Details (Nested Modules) ---
        let detailsHTML = '';
        if (Array.isArray(item.modules) && item.modules.length > 0) {
            detailsHTML = this.generateRocketDetailsHTML(item.modules);
        }

        // Final Assembly
        return `
            <article class="ui-item-card ${clickableClass} ${categoryClass} ${activeClass}">
                ${headerHTML}
                ${bodyHTML}
                ${footerHTML}
                ${detailsHTML}
            </article>
        `;
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
                meta = `<div class="ui-stack-badge is-mini">x${mod.count}</div>`;
            }

            rows += `
                <div class="ui-module-row">
                    <span class="ui-module-name">${mod.name}</span>
                    <div class="ui-module-meta">${meta}</div>
                </div>
            `;
        });

        return `<div class="ui-rocket-details">${rows}</div>`;
    }
}
