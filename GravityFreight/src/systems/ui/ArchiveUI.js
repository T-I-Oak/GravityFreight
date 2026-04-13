import { CATEGORY_COLORS, ACHIEVEMENT_TIER_COLORS, hexToRgba } from '../../core/Data.js';

/**
 * ArchiveUI
 * 過去のミッション結果（ランキング）と、実績解除状況を表示するUI。
 * デザインシステムは施設画面（event-screen.css）と共通化されている。
 */
export class ArchiveUI {
    constructor(game, uiSystem) {
        this.game = game;
        this.uiSystem = uiSystem;
        this.currentTab = 'ranking';
        this.currentRankCategory = 'score';
        this._isInitialized = false;
    }

    _ensureInitialized() {
        if (this._isInitialized) return;
        this.overlay = document.getElementById('archive-overlay');
        if (!this.overlay) return;

        this.container = document.getElementById('archive-list-container');
        this._setupListeners();
        this._isInitialized = true;
    }

    _setupListeners() {
        const tabs = this.overlay.querySelectorAll('.archive-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                this.switchTab(tabId);
                this.game.audioSystem.playTick();
            });
        });

        const closeBtn = document.getElementById('close-archive-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.uiSystem.hideArchive();
                this.game.audioSystem.playTick();
            });
        }
    }

    show(defaultTab = 'ranking') {
        this._ensureInitialized();
        if (!this.overlay) return;
        
        this.overlay.classList.remove('hidden');
        this.switchTab(defaultTab);
    }

    hide() {
        if (this.overlay) this.overlay.classList.add('hidden');
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        const tabs = this.overlay.querySelectorAll('.archive-tab-btn');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
        });
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        if (this.currentTab === 'ranking') {
            this.renderRanking();
        } else {
            this.renderAchievements();
        }
    }

    renderRanking() {
        const rankings = this.game.rankingSystem.getRankings(this.currentRankCategory);
        
        const catTabs = document.createElement('div');
        catTabs.className = 'ranking-category-tabs';
        ['score', 'sector', 'collected'].forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `rank-cat-btn ${this.currentRankCategory === cat ? 'active' : ''}`;
            btn.textContent = cat.toUpperCase();
            btn.onclick = () => {
                this.currentRankCategory = cat;
                this.game.audioSystem.playTick();
                this.render();
            };
            catTabs.appendChild(btn);
        });
        this.container.appendChild(catTabs);

        const table = document.createElement('div');
        table.className = 'ranking-table';
        
        const isScoreHeaderActive = this.currentRankCategory === 'score' ? 'active' : '';
        const isSectorHeaderActive = this.currentRankCategory === 'sector' ? 'active' : '';
        const isItemsHeaderActive = this.currentRankCategory === 'collected' ? 'active' : '';

        table.innerHTML = `
            <div class="ranking-row header">
                <div class="col col-rank">RANK</div>
                <div class="col col-score ${isScoreHeaderActive}">SCORE</div>
                <div class="col col-sector ${isSectorHeaderActive}">SECTOR</div>
                <div class="col col-items ${isItemsHeaderActive}">ITEMS</div>
                <div class="col col-date">DATE / TIME</div>
            </div>
        `;

        if (rankings.length === 0) {
            table.innerHTML += '<div class="no-data-msg">NO DATA FOUND</div>';
        } else {
            const body = document.createElement('div');
            body.className = 'ranking-body';
            
            const latestDate = this.game.rankingSystem.latestEntryDate;
            rankings.forEach((entry, i) => {
                const isLatest = entry.date === latestDate;
                const row = document.createElement('div');
                row.className = `ranking-row ${i < 3 ? 'top-3' : ''} ${isLatest ? 'is-latest' : ''}`;

                const isScoreActive = this.currentRankCategory === 'score' ? 'active' : '';
                const isSectorActive = this.currentRankCategory === 'sector' ? 'active' : '';
                const isItemsActive = this.currentRankCategory === 'collected' ? 'active' : '';

                row.innerHTML = `
                    <div class="col col-rank">
                         #${i + 1} ${isLatest ? '<span class="latest-indicator">NEW</span>' : ''}
                    </div>
                    <div class="col col-score ${isScoreActive}">${entry.score.toLocaleString()}</div>
                    <div class="col col-sector ${isSectorActive}">${entry.sector}</div>
                    <div class="col col-items ${isItemsActive}">${entry.collected}</div>
                    <div class="col col-date">${entry.date}</div>
                `;
                body.appendChild(row);
            });
            table.appendChild(body);
        }
        this.container.appendChild(table);
    }

    renderAchievements() {
        const system = this.game.achievementSystem;
        const stats = system.stats;
        
        const list = document.createElement('div');
        list.className = 'achievement-list';

        const getTierColor = (index, total) => {
            const colorIndex = ACHIEVEMENT_TIER_COLORS.length - (total - index);
            return ACHIEVEMENT_TIER_COLORS[Math.max(0, Math.min(ACHIEVEMENT_TIER_COLORS.length - 1, colorIndex))];
        };

        // 実績のレンダリング
        const definitions = system.getDefinitions();
        Object.entries(definitions).forEach(([statId, def]) => {
            let current = stats[statId] || 0;
            if (def.isDerived && system.getDerivedValue) {
                current = system.getDerivedValue(statId);
            }

            const tiers = def.tiers;
            const unlockedTierCount = tiers.filter(t => system.unlockedIds.has(t.id)).length;

            let currentTierColor = '#ffffff';
            let cardBgColor = 'linear-gradient(0deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.02))';
            let cardGlowColor = 'rgba(255, 255, 255, 0.3)';

            if (unlockedTierCount > 0) {
                currentTierColor = getTierColor(unlockedTierCount - 1, tiers.length);
                cardBgColor = `linear-gradient(0deg, ${hexToRgba(currentTierColor, 0.06)}, ${hexToRgba(currentTierColor, 0.06)})`;
                cardGlowColor = hexToRgba(currentTierColor, 0.3);
            }

            const isMaxTier = unlockedTierCount === tiers.length;

            const el = document.createElement('div');
            el.className = `achievement-item ${unlockedTierCount > 0 ? 'unlocked' : 'locked'}`;
            if (isMaxTier && unlockedTierCount > 0) {
                el.classList.add('max-tier-card');
                // Premium matte effect: soft directional glow instead of flat background
                cardBgColor = `linear-gradient(135deg, ${hexToRgba(currentTierColor, 0.15)} 0%, ${hexToRgba(currentTierColor, 0.02)} 100%)`;
            }

            el.style.setProperty('--card-color', currentTierColor);
            el.style.setProperty('--card-bg', cardBgColor);
            el.style.setProperty('--card-glow', cardGlowColor);
            
            let currentTierName = "";
            let nextTargetDisplay = "";
            let progress = 0;

            if (isMaxTier) {
                currentTierName = tiers[tiers.length - 1].title;
                nextTargetDisplay = `<span class="max-tier-label">MAX REACHED</span>`;
                progress = 100;
            } else {
                if (unlockedTierCount > 0) {
                    currentTierName = tiers[unlockedTierCount - 1].title;
                } else {
                    currentTierName = `<span class="not-achieved">NOT ACHIEVED</span>`;
                }
                const nextTargetValue = tiers[unlockedTierCount].goal;
                nextTargetDisplay = `NEXT: ${nextTargetValue.toLocaleString()}`;
                progress = Math.min(100, (current / nextTargetValue) * 100);
            }

            el.innerHTML = `
                <div class="achievement-card-header">
                    <div class="tier-indicator">
                        <div class="tier-dots">
                            ${tiers.map((t, i) => {
                                const dotColor = getTierColor(i, tiers.length);
                                const dotShadow = hexToRgba(dotColor, 0.8);
                                return `<div class="dot ${i < unlockedTierCount ? 'active' : ''}" style="--dot-color: ${dotColor}; --dot-shadow: 0 0 6px ${dotShadow};"></div>`;
                            }).join('')}
                        </div>
                        <span class="tier-title">${currentTierName}</span>
                    </div>
                </div>
                <div class="achievement-card-info">
                    <span class="stat-label">${def.label}</span>
                    <div class="stat-progress-texts">
                        <span class="val-cur">${current.toLocaleString()}</span>
                        <span class="val-next">${nextTargetDisplay}</span>
                    </div>
                </div>
                <div class="progress-section">
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
        this.container.appendChild(list);
    }
}
