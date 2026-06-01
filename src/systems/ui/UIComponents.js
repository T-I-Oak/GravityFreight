/**
 * UIComponents.js
 * Standardized HTML generation logic for Gravity Freight.
 */
import DataManager from '../../core/DataManager.js';

export class UIComponents {
    /**
     * Generates a complete item card HTML string.
     * @param {Object} item - Item data (V1-style flat structure)
     * @param {Object} options - { isClickable, isEnhanced, isActive, isCompact, isMini, status }
     */
    static generateCardHTML(item, options = {}) {
        // --- 1. Preparation (Contextual Data) ---
        const category = item.category ? item.category.toLowerCase() : '';
        const clickableClass = (options.isClickable || item.isClickable) ? 'state-clickable' : '';
        const activeClass = options.isActive ? 'state-active' : '';
        const compactClass = options.isCompact ? 'state-compact' : '';
        const miniClass = options.isMini ? 'state-mini' : '';
        const categoryClass = category ? `${category}` : '';
        const instanceId = item.uid || '';
        const displayName = item.name || `[MISSING_NAME: ${item.id}]`;

        // --- 2. Parts Generation (Sub-components) ---
        const headerRight = this.generateHeaderRightHTML(item, options);
        const headerHTML = `
            <header class="item-card-header SplitRow">
                <h3 class="item-card-title">${displayName}</h3>
                <div class="item-card-header-right">${headerRight}</div>
            </header>
        `;

        const bodyHTML = item.description
            ? `<div class="item-card-description">${item.description}</div>`
            : '';

        const footerHTML = this.generateFooterHTML(item, options);
        const detailsHTML = (category === 'rocket' && Array.isArray(item.modules))
            ? this.generateRocketDetailsHTML(item.modules)
            : '';

        // --- 3. Final Assembly (Isomorphic Frame) ---
        return `
            <article class="ItemCard ${clickableClass} ${categoryClass} ${activeClass} ${compactClass} ${miniClass}"
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
        const miniClass = options.isMini ? 'state-mini' : '';

        // Durability Gauge (Explicit data only)
        if (item.maxCharges !== undefined && item.maxCharges > 0) {
            const isDurableEnhanced = !!(options.isEnhanced || (item.enhancement && item.enhancement.charges > 0));
            html += this.generateHPGauge(item.charges, item.maxCharges, isDurableEnhanced, miniClass);
        }

        // Stack Badge
        if (item.count > 1) {
            html += `<div class="Badge item-count ${miniClass}">x${item.count}</div>`;
        }

        // Status Badge
        if (options.status) {
            const status = options.status.toLowerCase();
            const statusMiniClass = options.isMini ? 'state-mini' : '';
            html += `<span class="item-card-status state-${status} ${statusMiniClass}">${status.toUpperCase()}</span>`;
        }

        return html;
    }

    /**
     * Internal: Generates the property footer area.
     */
    static generateFooterHTML(item, options) {
        // Defined list of displayed properties and their semantic types
        const displayProps = [
            { key: 'slots', label: 'SLOTS', type: 'additive' },
            { key: 'slotsMax', label: 'MAX SLOTS', type: 'additive' },
            { key: 'precisionMultiplier', label: 'PRECISION', type: 'multiplier' },
            { key: 'pickupMultiplier', label: 'PICKUP', type: 'multiplier' },
            { key: 'gravityMultiplier', label: 'GRAVITY', type: 'multiplier' }
        ];

        let propItems = '';
        displayProps.forEach(config => {
            const val = item[config.key];
            if (val !== undefined) {
                const isEnhanced = item.enhancement && item.enhancement[config.key] > 0;
                const enhancedClass = isEnhanced ? 'state-enhanced' : '';

                propItems += `
                    <div class="item-card-prop ${enhancedClass} ${config.type}">
                        <span class="item-card-prop-label">${config.label}</span>
                        <span class="item-card-prop-value">${val}</span>
                    </div>`;
            }
        });

        return propItems ? `<footer class="item-card-footer"><div class="item-card-prop-group">${propItems}</div></footer>` : '';
    }

    /**
     * Generates a segmented durability gauge for UI.
     */
    static generateHPGauge(current, max, isEnhanced = false, sizeClass = '') {
        let segments = '';
        const enhancedClass = isEnhanced ? 'state-enhanced' : '';
        for (let i = 0; i < max; i++) {
            const isActive = i < current ? 'state-active' : '';
            segments += `<div class="durability-segment ${isActive}"></div>`;
        }
        return `<div class="DurabilityGauge ${enhancedClass} ${sizeClass}">${segments}</div>`;
    }

    /**
     * Generates the module list area for a Rocket card.
     * @param {Array} modules - Array of item objects
     */
    static generateRocketDetailsHTML(modules) {
        let cards = '';
        modules.forEach(mod => {
            // Generate each module as a compact mini card
            cards += this.generateCardHTML(mod, {
                isCompact: true,
                isMini: true
            });
        });

        return `<div class="rocket-details">${cards}</div>`;
    }

    /**
     * Generates a story card HTML string.
     * @param {string} storyId - Key for STORY_DATA (e.g., 'T')
     * @param {boolean} isNew - Whether to apply a "new" pulse animation
     */
    static generateStoryCardHTML(storyId, isNew = false) {
        const story = DataManager.getStoryById(storyId);
        const facilityClass = DataManager.getFacilityById(story.branch).className;

        return `
            <article class="ItemCard story-card state-active state-clickable ${facilityClass}">
                <header class="item-card-header SplitRow">
                    <h3 class="item-card-title">${story.title}</h3>
                    <div class="item-card-header-right">
                        <span class="Icon mail ${isNew ? 'state-new' : ''}"></span>
                    </div>
                </header>
                <div class="item-card-description">${story.discovery}</div>
            </article>
        `;
    }

    /**
     * Generates a complete story modal HTML string.
     * @param {string} storyId - Key for STORY_DATA
     */
    static generateStoryModalHTML(storyId) {
        const story = DataManager.getStoryById(storyId);

        const facility = DataManager.getFacilityById(story.branch);
        const facilityClass = facility.className;
        const icon = facility.icon;

        return `
            <article class="Panel ${facilityClass} story-card">
                <header class="panel-header">
                    <div class="FacilityBadge">${icon}</div>
                    <h1 class="panel-title">${story.title}</h1>
                </header>

                <div class="panel-body ScrollArea">
                    <div class="intro">${story.discovery}</div>
                    <div class="Well">${story.content}</div>
                </div>

                <footer class="panel-footer">
                    <button class="Button button-large" id="story-modal-close">CLOSE</button>
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
        const category = options.category ? `${options.category}` : '';
        const notable = options.isNotable ? 'state-notable' : '';
        const clickable = options.isClickable ? 'state-clickable' : '';

        return `
            <article class="ItemCard placeholder-card ${category} ${notable} ${clickable}">
                <div class="placeholder-text">${text}</div>
                <div class="placeholder-subtext">${subtext}</div>
            </article>
        `;
    }

    /**
     * Generates a single achievement card wrapped in local printing style.
     * @param {Object} achievement - Achievement definition from ACHIEVEMENT_DATA
     * @param {number} statsValue - Current user stat value
     */
    static generateAchievementCardHTML(achievement, statsValue) {
        // 1. Identify tiers (Assuming Hardest to Easiest definition in Data.js)
        const tiers = achievement.tiers;

        let currentTier = null;
        let currentLevel = 0;
        let nextTier = null;

        for (let i = 0; i < tiers.length; i++) {
            if (statsValue >= tiers[i].goal) {
                currentTier = tiers[i];
                currentLevel = i + 1; // Index 0 -> Level 1
                nextTier = tiers[i - 1] || null; // The tier just above current
                break;
            }
        }

        // If not even the easiest tier is reached
        if (!currentTier) {
            nextTier = tiers[tiers.length - 1];
        }

        // 2. Prepare Display Data
        const isLocked = !currentTier;
        const title = isLocked ? 'NOT ACHIEVED' : currentTier.title;
        const tierClass = isLocked ? 'state-locked' : `tier-${currentLevel}`;

        // Roman numeral conversion (Simplified for level 1-3)
        const roman = ['-', 'I', 'II', 'III'][currentLevel] || '';

        // Progress Calculation
        let progressPercent = 0;
        let statsLabel = '';

        if (isLocked) {
            progressPercent = (statsValue / nextTier.goal) * 100;
            statsLabel = `${statsValue} / ${nextTier.goal}`;
        } else if (!nextTier) {
            progressPercent = 100;
            statsLabel = `${statsValue} / MAX`;
        } else {
            // Use absolute progress towards next goal (Intuitive: 12 / 20 = 60%)
            progressPercent = (statsValue / nextTier.goal) * 100;
            statsLabel = `${statsValue} / ${nextTier.goal}`;
        }
        progressPercent = Math.min(100, Math.max(0, progressPercent));

        // 3. Assemble HTML
        const sealHTML = isLocked ? '' : `
            <div class="log-bg-seal-group ${tierClass}">
                <span class="seal-label-tier">TIER</span>
                <span class="seal-num">${roman}</span>
            </div>
        `;

        return `
            <div class="theme-printing">
                <div class="AchievementCard ${tierClass}">
                    ${sealHTML}
                    <div class="log-title">${title}</div>
                    <div class="log-data-group">
                        <div class="log-method-row">
                            <span class="log-method">${achievement.label}</span>
                            <span class="log-stats ${tierClass}">${statsLabel}</span>
                        </div>
                        <div class="log-gauge-area">
                            <div class="log-gauge-fill ${tierClass}" style="width: ${progressPercent}%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generates a scrollable grid of achievement cards.
     * @param {Object} allAchievements - ACHIEVEMENT_DATA object
     * @param {Object} userStats - User stats object (e.g., { stat_runs: 12, ... })
     */
    static generateAchievementGridHTML(allAchievements, userStats) {
        let cardsHTML = '';
        for (const [key, achievement] of Object.entries(allAchievements)) {
            const statsValue = userStats[key] || 0;
            cardsHTML += this.generateAchievementCardHTML(achievement, statsValue);
        }

        return `
            <div class="achievement-showcase ScrollArea">
                ${cardsHTML}
            </div>
        `;
    }
}
