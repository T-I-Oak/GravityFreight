import { UIComponents } from './UIComponents.js';

export class FlightResultComponents {
    static generateHTML(viewData, gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[FlightResultComponents] gameDataRepository is required.');
        }

        const replay = viewData.replay || {};
        const recordedLabel = replay.recorded
            ? gameDataRepository.getUiText('flightResult.replay.recorded')
            : gameDataRepository.getUiText('flightResult.replay.notRecorded');
        const recordedState = replay.recorded ? 'state-recorded' : 'state-not-recorded';
        const protectLabel = replay.favorite
            ? gameDataRepository.getUiText('flightResult.replay.protected')
            : gameDataRepository.getUiText('flightResult.replay.protectRecord');
        const protectState = replay.favorite ? 'state-active' : 'state-inactive outline';
        const performanceTitle = gameDataRepository.getUiText('flightResult.sections.performance');
        const assetsTitle = gameDataRepository.getUiText('flightResult.sections.assets');
        const scoreLabel = gameDataRepository.getUiText('flightResult.stats.score');
        const creditsLabel = gameDataRepository.getUiText('flightResult.stats.credits');
        const viewMapLabel = gameDataRepository.getUiText('flightResult.actions.viewMap');
        const shareLabel = gameDataRepository.getUiText('flightResult.actions.share');
        const continueLabel = gameDataRepository.getUiText('flightResult.actions.continue');
        const entriesHTML = (viewData.entries || [])
            .map(entry => this.generateEntryHTML(entry))
            .join('');
        const storyHTML = (viewData.storyCards || [])
            .map(story => UIComponents.generateStoryCardHTML(story.id, gameDataRepository, story.isUnread))
            .join('');
        const itemReportHTML = this.generateItemReportListHTML(viewData.itemReport || [], gameDataRepository);

        return `
            <section class="Panel home">
                <header class="panel-header flight-result-header">
                    <h2 class="panel-title ${viewData.themeClass || 'home'}">${viewData.title}</h2>
                    <div class="flight-report-status">
                        <div class="Badge ${recordedState} capsule" data-replay-recorded-status><span class="recorded-text">${recordedLabel}</span></div>
                        <div class="Badge favorite ${protectState} state-clickable capsule">${protectLabel}</div>
                    </div>
                </header>

                <div class="panel-body ColumnSet">
                    <section class="Column ScrollArea">
                        <header class="section-header">
                            <h3 class="section-title">${performanceTitle}</h3>
                        </header>

                        <div class="flight-report-summary">
                            <div class="Well">
                                <div class="stat-group">
                                    <div class="SplitColumn hero">
                                        <span class="stat-label">${scoreLabel}</span>
                                        <span class="stat-value score" data-count-to="${viewData.totalScore ?? 0}">0</span>
                                    </div>
                                    <div class="SplitColumn hero">
                                        <span class="stat-label">${creditsLabel}</span>
                                        <span class="stat-value num-coin" data-count-to="${viewData.totalCoins ?? 0}">0</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${entriesHTML}
                    </section>

                    <section class="Column ScrollArea">
                        <header class="section-header">
                            <h3 class="section-title">${assetsTitle}</h3>
                        </header>

                        <div class="item-list">
                            <div class="story-item-container">${storyHTML}</div>
                            <div class="acquired-items-list state-staggered-list">${itemReportHTML}</div>
                        </div>
                    </section>
                </div>

                <footer class="panel-footer">
                    <button class="Button button-large flight-result-map-button">
                        <span class="btn-main-label">${viewMapLabel}</span>
                    </button>
                    <button class="Button button-large flight-result-share-button">
                        <span class="btn-main-label">${shareLabel}</span>
                    </button>
                    <button class="Button state-primary button-large flight-result-action-button ${viewData.themeClass || 'home'}">
                        <span class="btn-main-label">${viewData.actionLabel || continueLabel}</span>
                    </button>
                </footer>
            </section>
        `;
    }

    static generateEntryHTML(entry) {
        const score = entry.score === undefined
            ? ''
            : `<span data-count-to="${entry.score}" data-count-prefix="+">+0</span>`;
        const coin = entry.coin === undefined
            ? ''
            : `<span data-count-to="${entry.coin}" data-count-prefix="+">+0</span>`;

        return `
            <div class="SplitRow data-row">
                <span class="report-data-label">${entry.label}</span>
                <span class="report-data-value score">${score}</span>
                <span class="report-data-value num-coin">${coin}</span>
            </div>
        `;
    }

    static generateItemReportListHTML(itemReport, gameDataRepository) {
        if (itemReport.length === 0) {
            return `
                <div class="acquired-item-report state-staggered-item" style="--item-appear-index: 0;">
                    ${UIComponents.generatePlaceholderHTML(
        gameDataRepository.getUiText('flightResult.assets.emptyText'),
        gameDataRepository.getUiText('flightResult.assets.emptySubtext'),
        { category: 'cargo' }
    )}
                </div>
            `;
        }

        return itemReport
            .map((entry, index) => this.generateItemReportHTML(entry, gameDataRepository, index))
            .join('');
    }

    static generateItemReportHTML(entry, gameDataRepository, index = 0) {
        const itemViewData = this.normalizeResultItemViewData(entry.item);
        const itemHTML = UIComponents.generateCardHTML(itemViewData, { status: entry.status });
        const bonusTitle = gameDataRepository.getUiText('flightResult.bonusTitle');
        const bonusHTML = (entry.bonusItems || [])
            .map(item => UIComponents.generateCardHTML(this.normalizeResultItemViewData(item)))
            .join('');

        if (!bonusHTML) {
            return `<div class="acquired-item-report state-staggered-item" style="--item-appear-index: ${index};">${itemHTML}</div>`;
        }

        return `
            <div class="acquired-item-report state-staggered-item" style="--item-appear-index: ${index};">
            ${itemHTML}
            <div class="report-bonus-list">
                <h4 class="report-bonus-title">${bonusTitle}</h4>
                ${bonusHTML}
            </div>
            </div>
        `;
    }

    static normalizeResultItemViewData(item) {
        if (item?.stats) {
            return item;
        }
        if (typeof item?.getViewData === 'function') {
            return item.getViewData();
        }

        throw new Error('[FlightResultComponents] flight result item view data is required.');
    }
}
