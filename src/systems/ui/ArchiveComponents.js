function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function createGraphSeries(records = [], field) {
    const points = [...records].reverse().map(record => Number(record[field] ?? 0));
    const maxValue = Math.max(...points, 1);
    if (points.length === 0) {
        return { path: '', averageY: null };
    }

    const width = 800;
    const top = 15;
    const bottom = 110;
    const xStep = width / 19;
    const toY = value => bottom - ((value / maxValue) * (bottom - top));
    const path = points
        .map((value, index) => `${index === 0 ? 'M' : 'L'}${Math.round(index * xStep)},${Math.round(toY(value))}`)
        .join(' ');
    const average = points.reduce((sum, value) => sum + value, 0) / points.length;

    return {
        path,
        averageY: Math.round(toY(average))
    };
}

const RANKING_CATEGORIES = ['score', 'sector', 'collected'];

function activeColumnClass(category, activeCategory) {
    return category === activeCategory ? 'state-active state-active-column' : '';
}

function createRankingRows(rows = [], activeCategory = 'score') {
    if (rows.length === 0) {
        return '<tr><td colspan="5">NO RECORDS</td></tr>';
    }
    return rows.map(row => `
        <tr>
            <td class="col-rank">#${String(row.rank).padStart(2, '0')}</td>
            <td class="col-score score ${activeColumnClass('score', activeCategory)}">${formatNumber(row.score)}</td>
            <td class="col-sector sector ${activeColumnClass('sector', activeCategory)}">${formatNumber(row.reachedSector)}</td>
            <td class="col-count item-count ${activeColumnClass('collected', activeCategory)}">${formatNumber(row.collectedItemCount)}</td>
            <td class="col-date">${escapeHtml(row.createdAt)}</td>
        </tr>
    `).join('');
}

function createReplayRows(rows = []) {
    if (rows.length === 0) {
        return '<tr><td colspan="5">NO REPLAYS</td></tr>';
    }
    return rows.map(row => `
        <tr class="state-inactive state-clickable" data-replay-id="${escapeHtml(row.id)}">
            <td class="col-fav"><i class="favorite-star state-clickable ${row.favorite ? 'state-active' : 'state-inactive'}" data-replay-favorite="${escapeHtml(row.id)}">★</i></td>
            <td class="col-no">${escapeHtml(row.no)}</td>
            <td class="col-sector sector">${formatNumber(row.reachedSector)}</td>
            <td class="col-score score">${formatNumber(row.score)}</td>
            <td class="col-date">${escapeHtml(row.createdAt)}</td>
        </tr>
    `).join('');
}

function createAchievementCards(rows = []) {
    if (rows.length === 0) {
        return '<div class="theme-printing"><div class="AchievementCard state-locked"><div class="log-title">NO ACHIEVEMENTS</div></div></div>';
    }
    return rows.map(row => {
        const tierClass = row.achievedTier ? `tier-${row.achievedTier}` : '';
        const lockedClass = row.achievedTier ? '' : ' state-locked';
        const percent = Math.round(Math.max(0, Math.min(1, row.progressRate ?? 0)) * 100);
        return `
            <div class="theme-printing">
                <div class="AchievementCard${lockedClass}">
                    ${row.achievedTier ? `<div class="log-bg-seal-group ${tierClass}"><span class="seal-label-tier">TIER</span><span class="seal-num">${row.achievedTier}</span></div>` : ''}
                    <div class="log-title">${escapeHtml(row.title)}</div>
                    <div class="log-data-group">
                        <div class="log-method-row">
                            <span class="log-method">${escapeHtml(row.method)}</span>
                            <span class="log-stats ${tierClass}">${escapeHtml(row.stats)}</span>
                        </div>
                        <div class="log-gauge-area"><div class="log-gauge-fill ${tierClass}" style="width: ${percent}%;"></div></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export const ArchiveComponents = {
    generateHTML(viewData = {}) {
        const kpis = viewData.kpis || {};
        const rankings = viewData.rankings || {};
        const recentRows = viewData.recentResults || [];
        const replays = viewData.replays || [];
        const achievements = viewData.achievements || [];
        return `
            <article id="archive-screen" class="Panel color-theme-main archive">
                <header class="panel-header SplitRow">
                    <div class="SplitColumn title-group">
                        <i class="icon-saturn"></i>
                        <div class="title-text">
                            <h2 class="panel-title">ANALYTIC ARCHIVE</h2>
                            <span class="panel-subtitle">CENTRAL PILOT RECORDS SYSTEM</span>
                        </div>
                    </div>
                    <div class="TabGroup">
                        <button class="Button state-primary state-active" data-tab="analytics">Analytics</button>
                        <button class="Button state-primary state-inactive" data-tab="replays">Replays</button>
                        <button class="Button state-primary state-inactive" data-tab="achievements">Achievements</button>
                    </div>
                </header>
                <div class="panel-body">
                    <div class="ColumnSet">
                        <section class="Column aside">
                            <div class="kpi-container">
                                ${this.createKpi('MAX SECTOR', kpis.totalCompletedSectors, 'sector')}
                                ${this.createKpi('LIFETIME CONTRACTS', kpis.lifetimeContracts, 'contract')}
                                ${this.createKpi('TOTAL ITEMS COLLECTED', kpis.totalCollectedItems, 'item-count')}
                                ${this.createKpi('ACHIEVEMENT PROGRESS', `${kpis.achievementRate ?? 0}%`, 'achievement-rate')}
                            </div>
                        </section>
                        <div class="Column main">
                            ${this.createAnalyticsTab(rankings, recentRows)}
                            ${this.createReplayTab(replays)}
                            ${this.createAchievementTab(achievements)}
                        </div>
                    </div>
                </div>
                <footer class="panel-footer">
                    <div class="SplitRow">
                        <span></span>
                        <button class="Button button-large state-secondary archive-close-button">
                            <span class="btn-main-label">CLOSE TERMINAL</span>
                        </button>
                    </div>
                </footer>
            </article>
        `;
    },

    createKpi(label, value, className) {
        return `
            <div class="SplitColumn kpi-group">
                <span class="stat-label">${escapeHtml(label)}</span>
                <div class="Well"><span class="stat-value ${escapeHtml(className)}">${escapeHtml(value)}</span></div>
            </div>
        `;
    },

    createAnalyticsTab(rankings, recentRows) {
        return `
            <section id="tab-analytics" class="tab-content section">
                <header class="section-header SplitRow">
                    <div class="SplitColumn"><h3 class="section-title">Performance Trend Analysis</h3></div>
                    <div class="stat-group">
                        <span class="stat-label legend score state-active" data-graph-series="score">SCORE</span>
                        <span class="stat-label legend sector" data-graph-series="sector">SECTORS</span>
                        <span class="stat-label legend item-count" data-graph-series="collected">ITEMS COLLECTED</span>
                    </div>
                </header>
                <div class="Well">${this.createTrendGraph(recentRows)}</div>
                <section class="tab-content section">
                    <header class="section-header SplitRow">
                        <div class="SplitColumn"><h3 class="section-title">PERSONAL BEST RANKING</h3></div>
                        <div class="TabGroup">
                            <button class="Button button-small state-primary color-theme-sub state-active" data-ranking="score">Score</button>
                            <button class="Button button-small state-primary color-theme-sub state-inactive" data-ranking="sector">Sector</button>
                            <button class="Button button-small state-primary color-theme-sub state-inactive" data-ranking="collected">Collected</button>
                        </div>
                    </header>
                    <div class="Well ScrollArea archive-ranking-well">
                        ${RANKING_CATEGORIES.map(category => `
                            <div class="archive-ranking-panel" data-ranking-panel="${category}"${category === 'score' ? '' : ' hidden'}>
                                ${this.createRankingTable(rankings?.[category] || [], category)}
                            </div>
                        `).join('')}
                    </div>
                </section>
            </section>
        `;
    },

    createRankingTable(rows, activeCategory = 'score') {
        return `
            <table class="ArchiveTable table-header">
                <thead><tr><th class="col-rank">RANK</th><th class="col-score score ${activeColumnClass('score', activeCategory)}">FINAL SCORE</th><th class="col-sector sector ${activeColumnClass('sector', activeCategory)}">SECTORS</th><th class="col-count item-count ${activeColumnClass('collected', activeCategory)}">ITEM COLLECTED</th><th class="col-date">DATE TIME</th></tr></thead>
            </table>
            <div class="archive-table-scroll-area"><table class="ArchiveTable table-body"><tbody>${createRankingRows(rows, activeCategory)}</tbody></table></div>
        `;
    },

    createTrendGraph(records = []) {
        const score = createGraphSeries(records, 'score');
        const sector = createGraphSeries(records, 'reachedSector');
        const itemCount = createGraphSeries(records, 'collectedItemCount');
        if (!score.path && !sector.path && !itemCount.path) {
            return '<svg class="graph-svg" viewBox="0 0 800 120" preserveAspectRatio="none"></svg>';
        }

        return `
            <svg class="graph-svg" viewBox="0 0 800 120" preserveAspectRatio="none">
                ${score.averageY === null ? '' : `<line class="avg-line score" x1="0" y1="${score.averageY}" x2="800" y2="${score.averageY}" />`}
                ${sector.averageY === null ? '' : `<line class="avg-line sector" x1="0" y1="${sector.averageY}" x2="800" y2="${sector.averageY}" />`}
                ${itemCount.averageY === null ? '' : `<line class="avg-line item-count" x1="0" y1="${itemCount.averageY}" x2="800" y2="${itemCount.averageY}" />`}
                ${sector.path ? `<path class="graph-line sector" data-graph-series="sector" fill="none" d="${sector.path}" />` : ''}
                ${itemCount.path ? `<path class="graph-line item-count" data-graph-series="collected" fill="none" d="${itemCount.path}" />` : ''}
                ${score.path ? `<path class="graph-line score state-active" data-graph-series="score" fill="none" d="${score.path}" />` : ''}
            </svg>
        `;
    },

    createReplayTab(rows) {
        return `
            <section id="tab-replays" class="tab-content section">
                <header class="section-header SplitRow">
                    <div class="SplitColumn"><h3 class="section-title">FLIGHT HISTORY LOGS</h3></div>
                    <div class="TabGroup">
                        <button id="btn-play-replay" class="Button favorite state-active state-disabled" disabled>▶ REPLAY</button>
                    </div>
                </header>
                <div class="Well ScrollArea">
                    <table class="ArchiveTable table-header">
                        <thead><tr><th class="col-fav">PROTECT</th><th class="col-no">NO.</th><th class="col-sector sector">SECTOR</th><th class="col-score score">SCORE</th><th class="col-date">DATE TIME</th></tr></thead>
                    </table>
                    <div class="archive-table-scroll-area"><table class="ArchiveTable table-body"><tbody>${createReplayRows(rows)}</tbody></table></div>
                </div>
            </section>
        `;
    },

    createAchievementTab(rows) {
        return `
            <section id="tab-achievements" class="tab-content section">
                <header class="section-header SplitRow">
                    <div class="SplitColumn"><h3 class="section-title">PILOT ACHIEVEMENTS</h3></div>
                </header>
                <div class="achievement-showcase">${createAchievementCards(rows)}</div>
            </section>
        `;
    }
};
