import { CATEGORY_COLORS, ITEM_REGISTRY, GOAL_NAMES, ANIMATION_DURATION, hexToRgba, PARTS, RARITY } from '../core/Data.js';
import { ItemUtils } from '../utils/ItemUtils.js';
import { TitleAnimation } from '../utils/TitleAnimation.js';
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

    // 主要なゲームプレイUI要素の取得 (ルール5.1に基づき、存在を前提とする)
    _getGameplayElements() {
        return [
            document.getElementById('terminal-panel'),
            document.getElementById('mission-hud'),
            document.getElementById('build-overlay'),
            document.getElementById('launch-btn'),
            document.getElementById('launch-control'),
            document.getElementById('result-overlay'),
            document.getElementById('event-screen'),
            document.getElementById('how-to-play-overlay'),
            document.getElementById('star-info-panel'),
            document.getElementById('receipt-overlay')
        ];
    }

    updateUI() {
        const game = this.game;

        // 1. タイトルステートの早期処理 (以降のプレイ用ロジックとの干渉を遮断)
        if (game.state === 'title') {
            this._updateTitleUI();
            return;
        }

        // 定義済みプレイ系ステート以外の不正ステートは例外を投げる (ルール5.1)
        const validStates = ['building', 'aiming', 'flying', 'cleared', 'crashed', 'lost', 'returned', 'event', 'result', 'gameover'];
        if (!validStates.includes(game.state)) {
            throw new Error(`[v0.6.6] Critical: Invalid game state detected in updateUI: ${game.state}`);
        }

        // 2. 主要要素の取得 (一本化)
        const titleScreen = document.getElementById('title-screen');
        const gameplayElements = this._getGameplayElements();
        const resultOverlay = document.getElementById('result-overlay');
        const eventScreen = document.getElementById('event-screen');
        const receiptOverlay = document.getElementById('receipt-overlay');

        // 3. 表示ステータスのサニタイズ (以前のステートの残存スタイルを徹底排除)
        if (titleScreen) {
            titleScreen.classList.add('hidden');
            titleScreen.style.display = 'none';
            titleScreen.style.opacity = '0';
            titleScreen.style.pointerEvents = 'none';
            titleScreen.style.zIndex = '0';
        }
        this.titleAnimation?.stop();

        // ミッションUI要素の一括リセット (インラインスタイルのクリアと非表示化)
        gameplayElements.forEach(el => {
            if (el) {
                el.style.display = ''; 
                el.style.visibility = '';
                el.style.opacity = '';
                el.style.pointerEvents = '';
                el.classList.add('hidden');
            }
        });

        // 4. ステートに関わらずミッション中に表示すべき基本HUD (常時表示ガード)
        const isMission = ['building', 'aiming', 'flying', 'event', 'result', 'gameover'].includes(game.state);
        document.getElementById('terminal-panel').classList.toggle('hidden', !isMission);
        document.getElementById('mission-hud').classList.toggle('hidden', !isMission);

        // 5. ステートに基づいた決定論的な表示制御
        switch (game.state) {
            case 'building': {
                const buildOverlay = document.getElementById('build-overlay');
                const launchBtn = document.getElementById('launch-btn');
                const lc = document.getElementById('launch-control');
                
                if (buildOverlay) buildOverlay.classList.remove('hidden');
                if (launchBtn) {
                    launchBtn.classList.remove('hidden');
                    launchBtn.disabled = true;
                }
                if (lc) lc.classList.remove('hidden');

                if (resultOverlay) resultOverlay.classList.add('hidden');
                if (eventScreen) eventScreen.classList.add('hidden');
                break;
            }
            case 'aiming': {
                const bo = document.getElementById('build-overlay');
                const lb = document.getElementById('launch-btn');
                const lc = document.getElementById('launch-control');
                
                if (bo) bo.classList.remove('hidden');
                if (lb) {
                    lb.classList.remove('hidden');
                    lb.disabled = false;
                }
                if (lc) lc.classList.remove('hidden');
                
                if (resultOverlay) resultOverlay.classList.add('hidden');
                if (eventScreen) eventScreen.classList.add('hidden');
                break;
            }
            case 'event': {
                const be = document.getElementById('build-overlay');
                if (be) {
                    be.classList.remove('hidden');
                    be.classList.add('event-active');
                }
                if (eventScreen) eventScreen.classList.remove('hidden');
                if (resultOverlay) resultOverlay.classList.add('hidden');
                break;
            }
            case 'gameover': {
                if (resultOverlay) resultOverlay.classList.remove('hidden');
                if (receiptOverlay) receiptOverlay.classList.remove('hidden');
                break;
            }
            case 'result': {
                if (resultOverlay) resultOverlay.classList.remove('hidden');
                const backToResultBtn = document.getElementById('back-to-result-btn');
                const lc = document.getElementById('launch-control');
                if (backToResultBtn && !backToResultBtn.classList.contains('hidden')) {
                    if (lc) lc.classList.remove('hidden');
                }
                break;
            }
            case 'cleared':
            case 'crashed':
            case 'lost':
            case 'returned':
                if (resultOverlay) resultOverlay.classList.add('hidden');
                break;
            default:
                if (resultOverlay) resultOverlay.classList.add('hidden');
                if (eventScreen) eventScreen.classList.add('hidden');
                break;
        }

        // 5. タブ切り替え・リスト描画などの詳細処理
        const tabBtns = document.querySelectorAll('.tab-btn');
        const flightTab = document.getElementById('flight-tab');
        const factoryTab = document.getElementById('factory-tab');

        if (game.isFactoryOpen) {
            flightTab.classList.add('hidden');
            factoryTab.classList.remove('hidden');
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'factory'));
        } else {
            flightTab.classList.remove('hidden');
            factoryTab.classList.add('hidden');
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'flight'));
        }

        // 通貨・スコア表示の即時同期 (アニメーション中でない場合)
        const scoreDisplay = document.getElementById('score-display');
        const coinDisplay = document.getElementById('coin-display');
        const sectorDisplay = document.getElementById('sector-display');
        const eventCoinDisplay = document.getElementById('event-player-credits');
        
        scoreDisplay.textContent = Math.floor(game.displayScore).toLocaleString();
        coinDisplay.textContent = Math.floor(game.displayCoins).toLocaleString();
        if (eventCoinDisplay) eventCoinDisplay.textContent = Math.floor(game.displayCoins).toLocaleString();
        sectorDisplay.textContent = game.sector;

        // リストレンダリング実行
        this.renderList('chassis-list', game.inventory.chassis, 'chassis', game.selection.chassis);
        this.renderList('logic-list', game.inventory.logic, 'logic', game.selection.logic);
        this.renderList('logic-option-list', game.inventory.modules, 'modules', game.selection.modules);
        this.renderList('acc-option-list', game.inventory.boosters, 'booster', game.selection.booster);
        this.renderList('launcher-list', game.inventory.launchers, 'launcher', game.selection.launcher);

        const buildBtn = document.getElementById('build-btn');
        buildBtn.disabled = !(game.selection.chassis && game.selection.logic);

        const rList = document.getElementById('rocket-list');
        rList.innerHTML = '';
        if (game.inventory.rockets.length === 0) {
            rList.innerHTML = `
                <div class="slot-placeholder" id="no-rocket-placeholder" style="cursor: pointer;">
                    <div class="part-header"><span class="part-name" style="opacity: 0.5;">待機中のロケットなし</span></div>
                    <span class="part-info guide-pulse">ここをクリックしてロケットを建造してください</span>
                </div>
            `;
            const noRocket = document.getElementById('no-rocket-placeholder');
            noRocket.onclick = () => { game.isFactoryOpen = true; this.updateUI(); };
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

    renderList(id, items, type, selected) {
        const el = document.getElementById(id);
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
                selectionCount = this.game.selection.modules[group.instanceId] || 0;
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
                if (this.game.state === 'event') return;
                if (type === 'modules' || type === 'booster') {
                    this.game.selectOption(type, group.instanceId);
                } else {
                    this.game.selectPart(type, group.instanceId);
                }
            };
            el.appendChild(div);
        });
    }

    generateCardHTML(itemData, options = {}) {
        return UIComponents.generateCardHTML(itemData, options);
    }

    showResult(resultType) {
        const game = this.game;
        const overlay = document.getElementById('result-overlay');

        // 表示状態のリセット（マップ確認からの復帰を保証）
        if (overlay) overlay.classList.remove('minimized');

        const titleEl = document.getElementById('result-title');
        const subtitleEl = document.getElementById('result-subtitle');
        const statsList = document.getElementById('result-stats-list');
        const itemsList = document.getElementById('result-items-list');
        const scoreTotalEl = document.getElementById('result-total-score');
        const coinTotalEl = document.getElementById('result-total-coin');

        if (scoreTotalEl) scoreTotalEl.textContent = game.launchScore.toLocaleString();
        if (coinTotalEl) coinTotalEl.textContent = game.launchCoins.toLocaleString();
        if (!overlay) return;

        // 【最重要】表示前にすべてのコンテンツ（タイトル等含む）をクリア/更新し、残像を完全に防ぐ
        if (statsList) statsList.innerHTML = '';
        if (itemsList) itemsList.innerHTML = '';
        
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

        game.flightResults.status = resultType;
        overlay.classList.remove('success-theme', 'failure-theme');
        if (resultType === 'gameover') {
            overlay.classList.add('failure-theme');
        } else {
            overlay.classList.add((resultType === 'success' || resultType === 'cleared' || resultType === 'returned') ? 'success-theme' : 'failure-theme');
        }

        // ここですべての準備が整ってから表示
        if (resultType !== 'gameover') {
            overlay.classList.remove('hidden');
        }

        const pendingS = (game.pendingGoalBonus || 0) + (game.pendingScore || 0);
        const pendingC = (game.pendingCoins || 0);
        const pureFlightScore = Math.max(0, game.score - game.launchScore);
        const pureFlightCoins = Math.max(0, game.coins - game.launchCoins);

        game.displayScore = game.launchScore;
        game.displayCoins = game.launchCoins;
        
        // ステートを暫定的に更新して updateUI による非表示化を防ぐ
        if (game.state !== 'result' && game.state !== 'gameover') {
            game.state = 'result';
        }
        this.updateUI();
        
        if (resultType === 'gameover') {
            this.showTerminalReport();
        }

        game.score += pendingS;
        game.coins += pendingC;

        game.pendingGoalBonus = 0;
        game.pendingScore = 0;
        game.pendingCoins = 0;

        let delay = 0.1; // 初期ディレイを短縮
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
            addRow(statsList, 'Flight Duration Score', pureFlightScore, 'score');

            // ボーナス項目の集計
            const groupedBonuses = new Map();
            game.flightResults.bonuses.forEach(b => {
                const entry = groupedBonuses.get(b.name) || { value: 0, coins: 0, count: 0 };
                entry.value += (b.value || 0);
                entry.coins += (b.coins || 0);
                entry.count++;
                groupedBonuses.set(b.name, entry);
            });

            groupedBonuses.forEach((data, name) => {
                const label = data.count > 1 ? `${name} [x ${data.count}]` : name;
                if (data.value > 0) addRow(statsList, label, data.value, 'score');
                if (data.coins > 0) {
                    const coinLabel = data.value > 0 ? `${label} Coin` : label;
                    addRow(statsList, coinLabel, data.coins, 'coin');
                }
            });

            let itemCoinTotal = 0;
            game.flightResults.items.forEach(item => {
                if (item.category === 'COIN') itemCoinTotal += (item.score || 0);
                if (item.bonusItems) {
                    item.bonusItems.forEach(b => {
                        if (b.category === 'COIN') itemCoinTotal += (b.score || 0);
                    });
                }
            });

            if (itemCoinTotal > 0) addRow(statsList, 'Collected Coins', itemCoinTotal, 'coin');
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

        const sectors = game.sector - 1;
        const deliveries = game.totalDeliveries || 0;
        const score = Math.floor(game.score);
        
        const now = new Date();
        const timestamp = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        // 一括で内容をセット（オリジナル演出の復活）
        content.innerHTML = `
            <div class="receipt-header">
                <h1 class="receipt-title">PAYMENT ADVICE</h1>
                <div class="receipt-subtitle">GRAVITY FREIGHT CO. - DELIVERY REPORT</div>
            </div>
            <div class="receipt-divider-dotted"></div>
            <div class="receipt-row"><span>SECTORS COMPLETED</span><span>${sectors} SCS</span></div>
            <div class="receipt-row"><span>TOTAL DELIVERIES</span><span>${deliveries} PCS</span></div>
            <div class="receipt-divider-solid"></div>
            <div class="receipt-row total"><span>FINAL SCORE</span><span>${score.toLocaleString()} PTS</span></div>
            <div class="receipt-stamp-zone"></div>
            <div class="barcode-container"></div>
            <div class="receipt-footer">
                <div class="auth-status">OPERATOR AUTHENTICATION REQUIRED</div>
                <div class="timestamp">${timestamp}</div>
            </div>
            <button class="receipt-btn" id="receipt-exit-btn">END CONTRACT</button>
        `;

        overlay.classList.remove('hidden');
        
        // 2フレーム待機して、確実に計算を走らせてからアニメーションを開始
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.classList.add('active');
            });
        });

        const exitBtn = document.getElementById('receipt-exit-btn');
        if (exitBtn) {
            exitBtn.onclick = () => {
                overlay.classList.remove('active');
                const resultOverlay = document.getElementById('result-overlay');
                if (resultOverlay) resultOverlay.classList.add('hidden');

                setTimeout(() => {
                    overlay.classList.add('hidden');
                    this.game.fullReset();
                }, 800);
            };
        }
    }

    _updateTitleUI() {
        const titleScreen = document.getElementById('title-screen');
        const gameplayElements = this._getGameplayElements();

        // ルール5.1に基づき、存在を前提とした警告なしのリセット
        // 全てのゲームプレイ UI をインラインスタイルで強制非表示
        gameplayElements.forEach(el => {
            el.classList.add('hidden');
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
        });

        // タイトル画面を最前面で強制表示
        titleScreen.classList.remove('hidden');
        titleScreen.style.display = 'flex';
        titleScreen.style.visibility = 'visible';
        titleScreen.style.opacity = '1';
        titleScreen.style.pointerEvents = 'auto';
        titleScreen.style.zIndex = '9999'; 

        if (!this.titleAnimation) {
            const bg = document.getElementById('title-bg-canvas');
            const fg = document.getElementById('title-fg-canvas');
            this.titleAnimation = new TitleAnimation(bg, fg);
        }
        this.titleAnimation.start();
    }
}
