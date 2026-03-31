import { CATEGORY_COLORS, ITEM_REGISTRY, GOAL_NAMES, ANIMATION_DURATION, hexToRgba, PARTS, RARITY } from '../core/Data.js';
import { ItemUtils } from '../utils/ItemUtils.js';
import { TitleAnimation } from '../utils/TitleAnimation.js';
import { EconomySystem } from './EconomySystem.js';
import { UIComponents } from './ui/UIComponents.js';
import { ShopUI } from './ui/ShopUI.js';
import { MaintenanceUI } from './ui/MaintenanceUI.js';

export class UISystem {
    constructor(game) {
        this.game = game;
        // サブシステムの初期化
        this.shopUI = new ShopUI(game, this);
        this.maintenanceUI = new MaintenanceUI(game, this);
        this.titleAnimation = null;
    }

    update(dt) {
        const game = this.game;
        const scoreDiff = game.score - game.displayScore;
        const coinDiff = game.coins - game.displayCoins;

        if (Math.abs(scoreDiff) > 0.1 || Math.abs(coinDiff) > 0.1) {
            if (!game.isAnimatingScore) game.displayScore += scoreDiff * 0.1;
            if (!game.isAnimatingCoins) game.displayCoins += coinDiff * 0.1;
            this.updateUI();
        } else if (game.displayScore !== game.score || game.displayCoins !== game.coins) {
            game.displayScore = game.score;
            game.displayCoins = game.coins;
            this.updateUI();
        }

        this.updateStarInfoPanel();
    }

    updateStarInfoPanel() {
        const game = this.game;
        const starPanel = document.getElementById('star-info-panel');
        const starList = document.getElementById('star-info-list');
        const starTitle = document.getElementById('star-info-title');
        if (!starPanel || !starList) return;

        const isHoverableStar = game.hoveredStar && (
            (!game.hoveredStar.isHome && !game.hoveredStar.isCollected) ||
            (game.hoveredStar.isHome && game.hoveredStar.items && game.hoveredStar.items.length > 0)
        ) && game.hoveredStar.items && game.hoveredStar.items.length > 0;

        if (isHoverableStar) {
            const currentItemCount = game.hoveredStar.items.length;
            if (this.currentHoveredStar !== game.hoveredStar || starPanel.dataset.itemCount != currentItemCount) {
                this.currentHoveredStar = game.hoveredStar;
                starPanel.dataset.itemCount = currentItemCount;

                starTitle.textContent = 'STAR ITEMS';
                starList.innerHTML = '';
                const mergedItems = new Map();
                game.hoveredStar.items.forEach(item => {
                    if (!item || !item.id) return;
                    if (mergedItems.has(item.id)) {
                        mergedItems.get(item.id).count++;
                    } else {
                        mergedItems.set(item.id, { ...item, count: 1 });
                    }
                });

                mergedItems.forEach(item => {
                    const cardWrapper = document.createElement('div');
                    cardWrapper.className = 'tooltip-card-wrapper';
                    cardWrapper.style.marginBottom = '4px';
                    cardWrapper.innerHTML = this.generateCardHTML(item, { showInventory: true });
                    starList.appendChild(cardWrapper);
                });
            }

            starPanel.classList.remove('hidden');
            const offset = 20;
            let px = game.mousePos.x + offset;
            let py = game.mousePos.y + offset;

            const rect = starPanel.getBoundingClientRect();
            if (px + rect.width > game.canvas.width) px = game.mousePos.x - rect.width - offset;
            if (py + rect.height > game.canvas.height) py = game.mousePos.y - rect.height - offset;

            starPanel.style.left = px + 'px';
            starPanel.style.top = py + 'px';
        } else {
            if (this.currentHoveredStar !== null) {
                this.currentHoveredStar = null;
                starPanel.classList.add('hidden');
            }
        }
    }

    updateUI() {
        const game = this.game;
        const renderList = (id, items, type, selected) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = '';

            if (items.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.className = 'slot-placeholder';
                let mainText = 'EMPTY';
                let subText = '在庫なし';

                if (type === 'chassis') { mainText = 'シャーシなし'; subText = '購入または回収してください'; }
                else if (type === 'logic') { mainText = 'ロジックなし'; subText = '購入または回収してください'; }
                else if (type === 'launcher') { mainText = '発射台なし'; subText = '購入または回収してください'; }
                else if (type === 'modules') { mainText = 'モジュールなし'; subText = '購入または回収してください'; }
                else if (type === 'booster') { mainText = 'ブースターなし'; subText = '購入または回収してください'; }

                placeholder.innerHTML = `
                    <div class="part-header">
                        <span class="part-name" style="opacity: 0.5;">${mainText}</span>
                    </div>
                    <span class="part-info">${subText}</span>
                `;
                el.appendChild(placeholder);
                return;
            }

            const groups = ItemUtils.groupItems(items);

            groups.forEach(group => {
                const div = document.createElement('div');
                let isAnySelected = false;
                let selectionCount = 0;
                if (type === 'modules') {
                    selectionCount = game.selection.modules[group.instanceId] || 0;
                    isAnySelected = selectionCount > 0;
                } else {
                    isAnySelected = (selected && selected.instanceId === group.instanceId);
                }

                div.className = `part-item ${isAnySelected ? 'selected' : ''}`;
                div.innerHTML = this.generateCardHTML(group, {
                    isSelected: isAnySelected,
                    showInventory: true,
                    selectionCount: selectionCount
                });

                div.onclick = () => {
                    if (game.state === 'event') return;
                    if (type === 'modules' || type === 'booster') {
                        game.selectOption(type, group.instanceId);
                    } else {
                        game.selectPart(type, group.instanceId);
                    }
                };
                el.appendChild(div);
            });
        };

        const scoreDisplay = document.getElementById('score-display');
        const coinDisplay = document.getElementById('coin-display');
        const sectorDisplay = document.getElementById('sector-display');
        if (scoreDisplay) scoreDisplay.textContent = Math.floor(game.displayScore).toLocaleString();
        if (coinDisplay) coinDisplay.textContent = Math.floor(game.displayCoins).toLocaleString();
        const eventCoinDisplay = document.getElementById('event-player-credits');
        if (eventCoinDisplay) eventCoinDisplay.textContent = Math.floor(game.displayCoins).toLocaleString();
        if (sectorDisplay) sectorDisplay.textContent = game.sector;

        const terminalPanel = document.getElementById('terminal-panel');
        const flightTab = document.getElementById('flight-tab');
        const factoryTab = document.getElementById('factory-tab');
        const tabBtns = document.querySelectorAll('.tab-btn');

        if (game.isFactoryOpen) {
            if (flightTab) flightTab.classList.add('hidden');
            if (factoryTab) factoryTab.classList.remove('hidden');
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'factory'));
        } else {
            if (flightTab) flightTab.classList.remove('hidden');
            if (factoryTab) factoryTab.classList.add('hidden');
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'flight'));
        }

        const titleScreen = document.getElementById('title-screen');
        const missionHud = document.getElementById('mission-hud');
        if (titleScreen) {
            const isTitle = game.state === 'title';
            titleScreen.classList.toggle('hidden', !isTitle);
            
            if (isTitle) {
                if (!this.titleAnimation) {
                    const bg = document.getElementById('title-bg-canvas');
                    const fg = document.getElementById('title-fg-canvas');
                    if (bg && fg) {
                        this.titleAnimation = new TitleAnimation(bg, fg);
                    }
                }
                this.titleAnimation?.start();
            } else {
                this.titleAnimation?.stop();
            }
        }
        if (missionHud) missionHud.classList.toggle('hidden', game.state === 'title');

        const buildOverlay = document.getElementById('build-overlay');
        const launchBtn = document.getElementById('launch-btn');
        if (game.state === 'building' || game.state === 'aiming' || game.state === 'event') {
            buildOverlay?.classList.remove('hidden');
            if (game.state === 'event') buildOverlay?.classList.add('event-active');
            else buildOverlay?.classList.remove('event-active');
        } else {
            buildOverlay?.classList.add('hidden');
            buildOverlay?.classList.remove('event-active');
        }

        if (launchBtn) {
            launchBtn.disabled = (game.state !== 'aiming');
            launchBtn.classList.remove('hidden');
        }

        renderList('chassis-list', game.inventory.chassis, 'chassis', game.selection.chassis);
        renderList('logic-list', game.inventory.logic, 'logic', game.selection.logic);
        renderList('logic-option-list', game.inventory.modules, 'modules', game.selection.modules);
        renderList('acc-option-list', game.inventory.boosters, 'booster', game.selection.booster);
        renderList('launcher-list', game.inventory.launchers, 'launcher', game.selection.launcher);

        const buildBtn = document.getElementById('build-btn');
        if (buildBtn) buildBtn.disabled = !(game.selection.chassis && game.selection.logic);

        const rList = document.getElementById('rocket-list');
        if (rList) {
            rList.innerHTML = '';
            if (game.inventory.rockets.length === 0) {
                rList.innerHTML = `
                    <div class="slot-placeholder" id="no-rocket-placeholder" style="cursor: pointer;">
                        <div class="part-header"><span class="part-name" style="opacity: 0.5;">待機中のロケットなし</span></div>
                        <span class="part-info guide-pulse">ここをクリックしてロケットを建造してください</span>
                    </div>
                `;
                document.getElementById('no-rocket-placeholder').onclick = () => { game.isFactoryOpen = true; this.updateUI(); };
            } else {
                game.inventory.rockets.forEach(rocket => {
                    const div = document.createElement('div');
                    const isSelected = (game.selection.rocket && game.selection.rocket.instanceId === rocket.instanceId);
                    div.className = `rocket-item ${isSelected ? 'selected' : ''}`;
                    div.innerHTML = this.generateCardHTML(rocket, { isSelected });
                    div.onclick = () => {
                        if (game.state === 'event') return;
                        game.selectPart('rocket', rocket.instanceId);
                    };
                    rList.appendChild(div);
                });
            }
        }
    }

    /**
     * 下位互換性のためのラッパー
     */
    generateCardHTML(itemData, options = {}) {
        return UIComponents.generateCardHTML(itemData, options);
    }

    showResult(resultType) {
        const game = this.game;

        // ゲームオーバー時は特別なレシート画面を表示
        if (resultType === 'gameover') {
            this.showTerminalReport();
            return;
        }

        const overlay = document.getElementById('result-overlay');
        const titleEl = document.getElementById('result-title');
        const subtitleEl = document.getElementById('result-subtitle');
        const statsList = document.getElementById('result-stats-list');
        const itemsList = document.getElementById('result-items-list');
        const scoreTotalEl = document.getElementById('result-total-score');
        const coinTotalEl = document.getElementById('result-total-coin');

        if (scoreTotalEl) scoreTotalEl.textContent = game.launchScore.toLocaleString();
        if (coinTotalEl) coinTotalEl.textContent = game.launchCoins.toLocaleString();
        if (!overlay) return;

        game.flightResults.status = resultType;
        overlay.classList.remove('success-theme', 'failure-theme');
        if (resultType === 'gameover') {
            overlay.classList.add('failure-theme');
        } else {
            overlay.classList.add((resultType === 'success' || resultType === 'cleared' || resultType === 'returned') ? 'success-theme' : 'failure-theme');
        }
        overlay.classList.remove('hidden');

        const statusText = { 
            'success': `SECTOR ${game.sector - 1} COMPLETED`, 
            'cleared': `SECTOR ${game.sector - 1} COMPLETED`, 
            'returned': 'ROCKET RECOVERED', 
            'crashed': 'SHIP CRASHED', 
            'lost': 'LOST IN SPACE',
            'gameover': 'TERMINAL REPORT'
        };
        titleEl.textContent = statusText[resultType] || 'MISSION END';
        subtitleEl.textContent = '';
        subtitleEl.style.display = 'none';

        const closeBtn = document.getElementById('result-close-btn');
        if (closeBtn) {
            let label = 'CONTINUE';
            if (resultType === 'success' || resultType === 'cleared') {
                const names = { 'SAFE': 'TRADING POST', 'NORMAL': 'REPAIR DOCK', 'DANGER': 'BLACK MARKET' };
                label = `TO ${names[game.lastHitGoal?.id] || 'NEXT SECTOR'}`;
            } else if (resultType === 'gameover') label = 'RESTART ADVENTURE';
            else if (game.isGameOver()) label = 'ABANDON MISSION';
            else if (resultType === 'returned') label = 'BACK TO BASE';
            else label = 'RETRY MISSION';
            closeBtn.textContent = label;
        }

        const pendingS = (game.pendingGoalBonus || 0) + (game.pendingScore || 0);
        const pendingC = (game.pendingCoins || 0);
        const pureFlightScore = Math.max(0, game.score - game.launchScore);
        const pureFlightCoins = Math.max(0, game.coins - game.launchCoins);

        game.displayScore = game.launchScore;
        game.displayCoins = game.launchCoins;
        this.updateUI();

        game.score += pendingS;
        game.coins += pendingC;

        game.pendingGoalBonus = 0;
        game.pendingScore = 0;
        game.pendingCoins = 0;

        if (statsList) statsList.innerHTML = '';
        if (itemsList) itemsList.innerHTML = '';

        let delay = 0.4;
        const addRow = (parent, label, value, colorClass, unit = '') => {
            const row = document.createElement('div');
            row.className = 'result-row stagger-in';
            row.style.animationDelay = `${delay}s`;
            const displayValue = typeof value === 'number' ? 
                (value >= 0 ? '+' : '') + value.toLocaleString() : 
                value;
            const unitText = unit ? ` ${unit}` : '';
            row.innerHTML = `<span class="label">${label}</span><span class="value ${colorClass}">${displayValue}${unitText}</span>`;
            parent.appendChild(row);
            delay += 0.1;
        };

        if (resultType === 'gameover') {
            addRow(statsList, 'SECTORS COMPLETED ......', game.sector - 1, 'score', 'SCS');
            addRow(statsList, 'TOTAL DELIVERIES .......', game.totalDeliveries || 0, 'coin', 'PCS');
            addRow(statsList, 'FINAL SCORE ............', game.score, 'score', 'PTS');
        } else {
            // Standard mission rows
            addRow(statsList, 'Flight Duration Score', pureFlightScore, 'score');
            game.flightResults.bonuses.filter(b => b.value > 0).forEach(b => addRow(statsList, b.name, b.value, 'score'));

            const itemCoinTotal = game.flightResults.items.filter(i => i.category === 'COIN').reduce((sum, i) => sum + (i.score || 0), 0);
            if (itemCoinTotal > 0) addRow(statsList, 'Collected Coins', itemCoinTotal, 'coin');
            game.flightResults.bonuses.filter(b => b.coins && b.coins > 0).forEach(b => addRow(statsList, b.name, b.coins, 'coin'));
        }

        const groupedItems = [];
        if (resultType !== 'crashed' && resultType !== 'lost') {
            game.flightResults.items.forEach(item => {
                if (!item || !item.id) return;
                const enhStr = JSON.stringify(item.enhancements || {});
                const key = `${item.category}_${item.id}_${enhStr}_${item.charges || -1}_${item.isDelivery || false}_${item.isMatch || false}`;
                
                let group = groupedItems.find(g => g.key === key);
                if (group) {
                    group.count++;
                    if (item.bonusItems) group.bonusItems = [...(group.bonusItems || []), ...item.bonusItems];
                } else {
                    groupedItems.push({ ...item, count: 1, key, bonusItems: item.bonusItems ? [...item.bonusItems] : [] });
                }
            });
        }

        if (groupedItems.length === 0) {
            if (itemsList) itemsList.innerHTML = '<div class="part-info" style="opacity:0.3;text-align:center;padding:20px;">NO ITEMS COLLECTED</div>';
        } else {
            groupedItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'reward-item-card stagger-in';
                card.style.animationDelay = `${delay}s`;
                delay += 0.07;
                const badge = item.isDelivery ? (item.isMatch ? `<span style="color:#44ffbb;font-size:10px;font-weight:800;">✓ DELIVERED</span>` : `<span style="color:#ff7755;font-size:10px;font-weight:800;">✗ UNMATCHED</span>`) : '';
                card.innerHTML = this.generateCardHTML(item, { badge, showInventory: true });
                itemsList.appendChild(card);
                
                if (item.bonusItems && item.bonusItems.length > 0) {
                    const groupedBonuses = [];
                    item.bonusItems.forEach(b => {
                        const bKey = `${b.id}_${JSON.stringify(b.enhancements || {})}_${b.charges || -1}`;
                        let bg = groupedBonuses.find(g => g.key === bKey);
                        if (bg) bg.count++;
                        else groupedBonuses.push({ ...b, count: 1, key: bKey });
                    });

                    groupedBonuses.forEach(bonus => {
                        const bonusCard = document.createElement('div');
                        bonusCard.className = 'reward-item-card stagger-in';
                        bonusCard.style.animationDelay = `${delay}s`;
                        delay += 0.07;
                        bonusCard.innerHTML = this.generateCardHTML(bonus, { indent: 16, showInventory: true });
                        itemsList.appendChild(bonusCard);
                    });
                }
            });
        }

        setTimeout(() => {
            if (scoreTotalEl) this.animateValue(scoreTotalEl, game.launchScore, game.score, ANIMATION_DURATION);
            if (coinTotalEl) this.animateValue(coinTotalEl, game.launchCoins, game.coins, ANIMATION_DURATION);
        }, delay * 1000);
    }

    ensurePanelExpanded() {
        const terminalPanel = document.getElementById('terminal-panel');
        if (terminalPanel && terminalPanel.classList.contains('collapsed')) {
            terminalPanel.classList.remove('collapsed');
            const icon = terminalPanel.querySelector('.collapse-btn .icon');
            if (icon) icon.textContent = '∧';
        }
    }

    animateValue(el, start, end, duration) {
        const game = this.game;
        if (start === end) {
            el.textContent = end.toLocaleString();
            return;
        }
        if (el.id === 'coin-display' || el.id === 'event-player-credits') game.isAnimatingCoins = true;
        if (el.id === 'score-display' || el.id === 'score-total') game.isAnimatingScore = true;

        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            el.textContent = value.toLocaleString();
            if (el.id === 'coin-display' || el.id === 'event-player-credits') game.displayCoins = value;
            else if (el.id === 'score-display' || el.id === 'score-total') game.displayScore = value;
            if (progress < 1) window.requestAnimationFrame(step);
            else {
                if (el.id === 'coin-display' || el.id === 'event-player-credits') game.isAnimatingCoins = false;
                if (el.id === 'score-display' || el.id === 'score-total') game.isAnimatingScore = false;
            }
        };
        window.requestAnimationFrame(step);
    }

    animateCoinChange(amount) {
        const game = this.game;
        if (amount === 0) return;
        const creditsEl = document.getElementById('event-player-credits');
        const hudCoinsEl = document.getElementById('coin-display');
        const startVal = game.displayCoins;
        const endVal = game.displayCoins + amount;

        if (creditsEl) this.animateValue(creditsEl, startVal, endVal, ANIMATION_DURATION);
        if (hudCoinsEl) this.animateValue(hudCoinsEl, startVal, endVal, ANIMATION_DURATION);

        if (creditsEl && creditsEl.offsetParent !== null) {
            creditsEl.classList.add('pulse');
            setTimeout(() => creditsEl.classList.remove('pulse'), 300);
        } else if (hudCoinsEl) {
            hudCoinsEl.classList.add('pulse');
            setTimeout(() => hudCoinsEl.classList.remove('pulse'), 300);
        }
    }

    // サブモジュールへの委譲
    initTradingPost(container) { this.shopUI.initTradingPost(container); }
    initRepairDock(container) { this.maintenanceUI.initRepairDock(container); }
    initBlackMarket(container) { this.shopUI.initBlackMarket(container); }

    showTerminalReport() {
        const game = this.game;
        const overlay = document.getElementById('receipt-overlay');
        const content = document.getElementById('receipt-content-area');
        if (!overlay || !content) return;

        // 統計データの準備
        const sectors = game.sector - 1;
        const deliveries = game.totalDeliveries || 0;
        const score = Math.floor(game.score);
        
        // タイムスタンプ生成 (YYYY/M/D H:m:s)
        const now = new Date();
        const timestamp = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        // HTML生成 (スクリーンショット再現 + 不規則バーコード)
        content.innerHTML = `
            <div class="receipt-header">
                <h1 class="receipt-title">PAYMENT ADVICE</h1>
                <div class="receipt-subtitle">GRAVITY FREIGHT CO. - DELIVERY REPORT</div>
            </div>
            
            <div class="receipt-divider-dotted"></div>
            
            <div class="receipt-row">
                <span>SECTORS COMPLETED</span>
                <span>${sectors} SCS<span class="ranking-placeholder"></span></span>
            </div>
            <div class="receipt-row">
                <span>TOTAL DELIVERIES</span>
                <span>${deliveries} PCS<span class="ranking-placeholder"></span></span>
            </div>
            
            <div class="receipt-divider-solid"></div>
            
            <div class="receipt-row total">
                <span>FINAL SCORE</span>
                <span>${score.toLocaleString()} PTS<span class="ranking-placeholder"></span></span>
            </div>

            <div class="receipt-stamp-zone"></div>
            
            <div class="barcode-container"></div>
            
            <div class="receipt-footer">
                <div class="auth-status">OPERATOR AUTHENTICATION REQUIRED</div>
                <div class="timestamp">${timestamp}</div>
            </div>
            
            <button class="receipt-btn" id="receipt-exit-btn">END CONTRACT</button>
        `;

        // オーバーレイとアニメーションのトリガー
        overlay.classList.add('active');

        // ボタンクリックイベント
        const exitBtn = document.getElementById('receipt-exit-btn');
        if (exitBtn) {
            exitBtn.onclick = () => {
                overlay.classList.remove('active');
                game.fullReset(); // 先ほど実装した完全リセットを実行
            };
        }
    }
}
