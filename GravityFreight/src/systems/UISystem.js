import { CATEGORY_COLORS, ITEM_REGISTRY, GOAL_NAMES, ANIMATION_DURATION, hexToRgba, PARTS, RARITY, STORY_DATA, GOAL_COLORS } from '../core/Data.js';
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
        this.notificationTimer = null;
        this.setupStoryListeners();
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

        // 特定のステート以外では強制非表示
        const allowedStates = ['building', 'aiming', 'flying'];
        if (!allowedStates.includes(game.state)) {
            this.currentHoveredStar = null;
            starPanel.classList.add('hidden');
            return;
        }

        const isHoverableStar = game.hoveredStar && (
            (!game.hoveredStar.isHome && !game.hoveredStar.isCollected) ||
            (game.hoveredStar.isHome && game.hoveredStar.items && game.hoveredStar.items.length > 0)
        ) && game.hoveredStar.items && game.hoveredStar.items.length > 0;

        if (isHoverableStar) {
            const star = game.hoveredStar;
            const currentItemCount = star.items.length;

            if (this.currentHoveredStar !== star || starPanel.dataset.itemCount != currentItemCount) {
                this.currentHoveredStar = star;
                starPanel.dataset.itemCount = currentItemCount;

                starTitle.textContent = star.isHome ? "STAR CORE (STORAGE)" : "STAR ITEMS";
                starList.innerHTML = '';

                const mergedItems = ItemUtils.groupItems(star.items);
                const isCompact = mergedItems.length > 3;
                starList.className = `category ${isCompact ? 'compact-list' : ''}`;

                mergedItems.forEach(item => {
                    const cardWrapper = document.createElement('div');
                    cardWrapper.className = 'tooltip-card-wrapper';
                    cardWrapper.style.marginBottom = '4px';
                    cardWrapper.innerHTML = UIComponents.generateCardHTML(item, { showInventory: true });
                    starList.appendChild(cardWrapper);
                });
            }

            starPanel.classList.remove('hidden');
            
            const offset = 20;
            const mouseX = game.mousePos.x || 0;
            const mouseY = game.mousePos.y || 0;
            
            let px = mouseX + offset;
            let py = mouseY + offset;

            const panelWidth = starPanel.offsetWidth || 280;
            const panelHeight = starPanel.offsetHeight || 0;

            if (px + panelWidth > game.canvas.width - 20) {
                px = mouseX - panelWidth - offset;
            }
            if (py + panelHeight > game.canvas.height - 20) {
                py = mouseY - panelHeight - offset;
            }
            
            px = Math.max(10, px);
            py = Math.max(10, py);

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
            document.getElementById('event-screen'),
            document.getElementById('how-to-play-overlay'),
            document.getElementById('star-info-panel')
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
        }
        this.titleAnimation?.stop();

        gameplayElements.forEach(el => {
            if (el) {
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
                
                if (eventScreen) eventScreen.classList.add('hidden');
                break;
            }
            case 'flying': {
                const bo = document.getElementById('build-overlay');
                const lc = document.getElementById('launch-control');
                
                if (bo) bo.classList.add('hidden');
                if (lc) lc.classList.add('hidden');
                
                if (eventScreen) eventScreen.classList.add('hidden');
                break;
            }
            case 'event': {
                const be = document.getElementById('build-overlay');
                if (be) {
                    be.classList.remove('hidden');
                    be.classList.add('event-active');
                    // 【憲法 2.7】イベント開始時に一度だけ最小化する。
                    // その後ユーザーが手動で開いた場合は、updateUI で閉じ直さない。
                    if (!game.wasEventPanelMinimized) {
                        be.querySelector('.panel')?.classList.add('collapsed');
                        game.wasEventPanelMinimized = true;
                    }
                }
                if (eventScreen) eventScreen.classList.remove('hidden');
                break;
            }
            case 'gameover': {
                // 【仕様 2.6】hidden 操作は showTerminalReport() の単独責任。
                break;
            }
            case 'result': {
                // 【憲法 2.6】hidden 操作は showResult() の単独責任。
                // updateUI は result-overlay への操作も、
                // result ステートでの build-overlay 等への干渉も行わない。
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
            case 'returned': {
                // 【憲法 2.6】hidden 操作は showResult() の単独責任。
                break;
            }
            default:
                if (eventScreen) eventScreen.classList.add('hidden');
                throw new Error(`Invalid game state: ${game.state}`);
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

        // 通貨・スコア表示の即時同期 (Spec 5.1/5.3 準拠)
        this._updateHUD();

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
                <div class="slot-placeholder guide" id="no-rocket-placeholder">
                    <div class="part-header"><span class="part-name">待機中のロケットなし</span></div>
                    <span class="part-info">ここをクリックしてロケットを建造してください</span>
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

    /**
     * セクター開始通知を表示。
     */
    showSectorNotification(text) {
        const el = document.getElementById('sector-notification');
        if (!el) return;
        
        el.textContent = text;
        el.classList.remove('hidden', 'animate');
        void el.offsetWidth; // 強制リフロー
        el.classList.add('animate');
        
        if (this.notificationTimer) clearTimeout(this.notificationTimer);
        this.notificationTimer = setTimeout(() => {
            const currentEl = document.getElementById('sector-notification');
            if (currentEl) {
                currentEl.classList.add('hidden');
                currentEl.classList.remove('animate');
            }
            this.notificationTimer = null;
        }, 3600); // アニメーション時間(3.5s)より少し長く。
    }

    renderList(id, items, type, selected) {
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

        const fragment = document.createDocumentFragment();
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
            fragment.appendChild(div);
        });
        el.appendChild(fragment);
    }

    generateCardHTML(itemData, options = {}) {
        return UIComponents.generateCardHTML(itemData, options);
    }

    showResult(resultType) {
        const game = this.game;
        const overlay = document.getElementById('result-overlay');
        if (!overlay) return;

        // 【仕様 2.4】新しいリザルト表示開始時に必ず初期化する
        this.resetResultOverlay();
        this._resultDelay = 0.1;
        const ANIMATION_DURATION = 1.0;

        const titleEl = document.getElementById('result-title');
        const subtitleEl = document.getElementById('result-subtitle');
        const statsList = document.getElementById('result-stats-list');
        const itemsList = document.getElementById('result-items-list');
        const scoreTotalEl = document.getElementById('result-total-score');
        const coinTotalEl = document.getElementById('result-total-coin');
        if (scoreTotalEl) scoreTotalEl.textContent = (game.launchScore || 0).toLocaleString();
        if (coinTotalEl) coinTotalEl.textContent = (game.launchCoins || 0).toLocaleString();

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
        if (titleEl) titleEl.textContent = statusText[resultType] || 'MISSION END';
        if (subtitleEl) {
            subtitleEl.textContent = '';
            subtitleEl.style.display = 'none';
        }

        const closeBtn = document.getElementById('result-close-btn');
        if (closeBtn) {
            let label = 'CONTINUE';
            closeBtn.classList.remove('btn-grad-green', 'btn-grad-blue', 'btn-grad-red', 'btn-grad-orange');
            
            if (resultType === 'success' || resultType === 'cleared') {
                const goalType = game.lastHitGoal?.id;
                const colorClasses = {
                    'TRADING_POST': 'btn-grad-green',
                    'REPAIR_DOCK': 'btn-grad-blue',
                    'BLACK_MARKET': 'btn-grad-red'
                };
                label = `TO ${GOAL_NAMES[goalType] || 'NEXT SECTOR'}`;
                closeBtn.classList.add(colorClasses[goalType] || 'btn-grad-green');
            } else if (resultType === 'returned') {
                label = 'BACK TO BASE';
                closeBtn.classList.add('btn-grad-green');
            } else if (resultType === 'gameover') {
                label = 'RESTART ADVENTURE';
                closeBtn.classList.add('btn-grad-orange');
            } else if (game.isGameOver()) {
                label = 'ABANDON MISSION';
                closeBtn.classList.add('btn-grad-orange');
            } else {
                label = 'RETRY MISSION';
                closeBtn.classList.add('btn-grad-orange');
            }
            closeBtn.textContent = label;
        }

        if (game.flightResults) game.flightResults.status = resultType;
        overlay.classList.remove('success-theme', 'failure-theme');
        if (resultType === 'gameover') {
            overlay.classList.add('failure-theme');
        } else {
            overlay.classList.add((resultType === 'success' || resultType === 'cleared' || resultType === 'returned') ? 'success-theme' : 'failure-theme');
        }

        const pendingS = (game.pendingGoalBonus || 0) + (game.pendingScore || 0);
        const pendingC = (game.pendingCoins || 0);
        const pureFlightScore = Math.max(0, game.score - game.launchScore);
        const pureFlightCoins = Math.max(0, game.coins - game.launchCoins);

        // ステートを暫定的に更新して updateUI による非表示化を防ぐ
        // 【重要】すべてのデータ計算とDOM初期化が完了したこのタイミングでステートを切り替える
        if (game.state !== 'result' && game.state !== 'gameover') {
            game.setState('result');
        }

        game.score += pendingS;
        game.coins += pendingC;

        game.pendingGoalBonus = 0;
        game.pendingScore = 0;
        game.pendingCoins = 0;

        if (resultType === 'gameover') {
            const sectors = (game.sector || 1) - 1;
            const collected = game.totalCollectedItems || 0;
            const score = Math.floor(game.score || 0);

            // 各項目のグレード情報を事前に取得
            const sInfo = this._getGradeInfo(sectors, 10);
            const cInfo = this._getGradeInfo(collected, 30);
            const pInfo = this._getGradeInfo(score, 50000);

            // ランキング順位を取得（保存自体は showTerminalReport で行うのでここでは checkRank）
            const sRank = game.rankingSystem.checkRank('sector', sectors);
            const cRank = game.rankingSystem.checkRank('collected', collected);
            const pRank = game.rankingSystem.checkRank('score', score);

            this.addRow(statsList, 'SECTORS COMPLETED', sectors, 'score', 'SCS', { grade: sInfo.grade, rank: sRank });
            this.addRow(statsList, 'TOTAL COLLECTED', collected, 'coin', 'PCS', { grade: cInfo.grade, rank: cRank });
            this.addRow(statsList, 'FINAL SCORE', score, 'score', 'PTS', { grade: pInfo.grade, rank: pRank });
        } else {
            this.addRow(statsList, 'Flight Duration Score', pureFlightScore, 'score');

            // ボーナス項目の集計
            const groupedBonuses = new Map();
            if (game.flightResults && game.flightResults.bonuses) {
                game.flightResults.bonuses.forEach(b => {
                    const entry = groupedBonuses.get(b.name) || { value: 0, coins: 0, count: 0 };
                    entry.value += (b.value || 0);
                    entry.coins += (b.coins || 0);
                    entry.count++;
                    groupedBonuses.set(b.name, entry);
                });
            }

            groupedBonuses.forEach((data, name) => {
                const label = data.count > 1 ? `${name} [x ${data.count}]` : name;
                if (data.value > 0) this.addRow(statsList, label, data.value, 'score');
                if (data.coins > 0) {
                    const coinLabel = data.value > 0 ? `${label} Coin` : label;
                    this.addRow(statsList, coinLabel, data.coins, 'coin');
                }
            });

            let itemCoinTotal = 0;
            if (game.flightResults && game.flightResults.items) {
                game.flightResults.items.forEach(item => {
                    if (item.category === 'COIN') itemCoinTotal += (item.score || 0);
                    if (item.bonusItems) {
                        item.bonusItems.forEach(b => {
                            if (b.category === 'COIN') itemCoinTotal += (b.score || 0);
                        });
                    }
                });
            }

            if (itemCoinTotal > 0) this.addRow(statsList, 'Collected Coins', itemCoinTotal, 'coin');
        }

        const groupedItems = [];
        if (resultType !== 'crashed' && resultType !== 'lost' && game.flightResults && game.flightResults.items) {
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
            if (itemsList) itemsList.innerHTML = `
                <div class="slot-placeholder">
                    <div class="part-header"><span class="part-name" style="opacity: 0.5;">NO ITEMS COLLECTED</span></div>
                    <span class="part-info">回収アイテムなし</span>
                </div>
            `;
        } else {
            // [v0.15] 新規ストーリー解放があれば、そのカードを先頭に追加
            if (game.storySystem.hasUnlockedThisFlight) {
                const latestId = game.storySystem.sessionUnlocked[game.storySystem.sessionUnlocked.length - 1];
                const storyData = STORY_DATA[latestId];
                if (storyData) {
                    const storyCard = document.createElement('div');
                    storyCard.className = 'stagger-in';
                    storyCard.style.animationDelay = `${this._resultDelay}s`;
                    this._resultDelay += 0.07;
                    storyCard.innerHTML = UIComponents.generateStoryCardHTML({ ...storyData, id: latestId }, game.storySystem.isRead(latestId));
                    itemsList.appendChild(storyCard);
                }
            }

            groupedItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'reward-item-card stagger-in';
                card.style.animationDelay = `${this._resultDelay}s`;
                this._resultDelay += 0.07;
                card.innerHTML = this.generateCardHTML(item, { showInventory: true, clickable: false });
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
                        bonusCard.style.animationDelay = `${this._resultDelay}s`;
                        this._resultDelay += 0.07;
                        bonusCard.innerHTML = this.generateCardHTML(bonus, { indent: 16, showInventory: true, clickable: false });
                        itemsList.appendChild(bonusCard);
                    });
                }
            });
        }

        setTimeout(() => {
            if (scoreTotalEl) this.animateValue(scoreTotalEl, game.launchScore, game.score, ANIMATION_DURATION);
            if (coinTotalEl) this.animateValue(coinTotalEl, game.launchCoins, game.coins, ANIMATION_DURATION);
        }, this._resultDelay * 1000);

        // 【仕様 2.6/2.7】すべての準備（DOM生成）が完了した後に可視化。
        // updateUI() による自動介入を排除しているため、ここが唯一の表示タイミングとなる。
        if (resultType !== 'gameover') {
            requestAnimationFrame(() => {
                overlay.classList.remove('hidden');
                this._updateHUD();
            });
        } else {
            // 【憲法 2.6】hidden 操作は showResult/showTerminalReport の責任
            overlay.classList.remove('hidden');
            this._updateHUD();
            this.showTerminalReport();
        }
    }

    /**
     * 【憲法 2.7】ビルドパネルを強制的に展開（開いた状態）にする。
     * 呼び出し元: EventSystem (セクター開始時)、および初期化時
     */
    expandPanel() {
        const buildOverlay = document.getElementById('build-overlay');
        const panel = buildOverlay?.querySelector('.panel');
        if (panel && panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
            const icon = panel.querySelector('.collapse-btn .icon');
            if (icon) icon.textContent = '∧';
        }
        // イベント時の最小化済みフラグもリセットして、次のイベントに備える
        this.game.wasEventPanelMinimized = false;
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
        const ANIMATION_DURATION = 0.5; // 被ダメージ時などは短縮

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

    _getGradeInfo(value, target, type = 'single') {
        const score = type === 'single' ? Math.sqrt(value / target) * 100 : value;
        const grades = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];
        const step = type === 'single' ? 20 : 50;
        const index = Math.min(grades.length - 1, Math.floor(score / step));
        return {
            grade: grades[index],
            score: score,
            className: `grade-${grades[index].toLowerCase()}`
        };
    }

    showTerminalReport() {
        const game = this.game;
        const overlay = document.getElementById('receipt-overlay');
        const content = document.getElementById('receipt-content-area');
        if (!overlay || !content) return;

        const sectors = game.sector - 1;
        const collected = game.totalCollectedItems || 0;
        const score = Math.floor(game.score);

        // ランキングの保存
        const sectorRank = game.rankingSystem.addEntry('sector', sectors);
        const collectedRank = game.rankingSystem.addEntry('collected', collected);
        const scoreRank = game.rankingSystem.addEntry('score', score);

        // 各項目の評価計算 (目標値 15, 50, 100000)
        const sectorInfo = this._getGradeInfo(sectors, 15);
        const collectedInfo = this._getGradeInfo(collected, 50);
        const scoreInfo = this._getGradeInfo(score, 100000);

        const totalScoreVal = sectorInfo.score + collectedInfo.score + scoreInfo.score;
        const totalInfo = this._getGradeInfo(totalScoreVal, 1, 'total');

        const now = new Date();
        const timestamp = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        const getRankText = (rankInfo, label) => {
            if (!rankInfo || !rankInfo.rank) return `${label} OUT OF TOP 20`;
            const isTop = rankInfo.rank <= 3;
            const suffix = ['st', 'nd', 'rd'][(rankInfo.rank - 1) % 10] || 'th';
            const realSuffix = (rankInfo.rank >= 11 && rankInfo.rank <= 13) ? 'th' : suffix;
            const topClass = isTop ? 'top-rank' : '';
            return `<span class="${topClass}">${label} RANKING <span class="rank-value">${rankInfo.rank}${realSuffix}</span></span>`;
        };

        const stampRotation = -10 - (Math.random() * 15); // -10 to -25 deg
        const stampOffsetX = (Math.random() - 0.5) * 20; // -10 to +10 px
        const stampOffsetY = (Math.random() - 0.5) * 15; // -7.5 to +7.5 px
        
        // Grade size variant (huge / normal / mini)
        let sizeVariant = 'normal';
        if (totalInfo.grade === 'SS') sizeVariant = 'huge';
        if (totalInfo.grade === 'E') sizeVariant = 'mini';

        content.innerHTML = `
            <div class="receipt-header">
                <h1 class="receipt-title">TERMINAL REPORT</h1>
                <div class="receipt-subtitle">GRAVITY FREIGHT CO. - FINAL EVALUATION</div>
            </div>
            <div class="receipt-divider-dotted"></div>
            
            <div class="receipt-item-group">
                <div class="receipt-row"><span>SECTORS COMPLETED</span><span>${sectors} SCS</span></div>
                <div class="receipt-detail">${getRankText(sectorRank, 'SECTOR')} / GRADE <span class="grade-value receipt-grade-${sectorInfo.grade.toLowerCase()}">${sectorInfo.grade}</span></div>
            </div>

            <div class="receipt-item-group">
                <div class="receipt-row"><span>TOTAL COLLECTED</span><span>${collected} PCS</span></div>
                <div class="receipt-detail">${getRankText(collectedRank, 'COLLECTION')} / GRADE <span class="grade-value receipt-grade-${collectedInfo.grade.toLowerCase()}">${collectedInfo.grade}</span></div>
            </div>

            <div class="receipt-divider-solid"></div>
            <div class="receipt-row total"><span>FINAL SCORE</span><span>${score.toLocaleString()} PTS</span></div>
            <div class="receipt-detail">${getRankText(scoreRank, 'SCORE')} / GRADE <span class="grade-value receipt-grade-${scoreInfo.grade.toLowerCase()}">${scoreInfo.grade}</span></div>

            <div class="receipt-stamp-zone">
                <div class="receipt-official-seal stamp-${totalInfo.grade.toLowerCase()} ${sizeVariant}" 
                     id="report-stamp"
                     style="--stamp-rot: ${stampRotation}deg; --stamp-x: ${stampOffsetX}px; --stamp-y: ${stampOffsetY}px;">
                    <div class="receipt-stamp-left-half">
                        <div class="receipt-stamp-text-line small">OPERATOR AUTH.</div>
                        <div class="receipt-stamp-text-line medium">CONTRACT VERIFIED</div>
                        <div class="receipt-stamp-text-line large">GRADE</div>
                    </div>
                    <div class="receipt-stamp-right-half">
                        ${totalInfo.grade}
                    </div>
                </div>
            </div>

            <div class="barcode-container"></div>
            <div class="receipt-footer">
                <div class="auth-status">OFFICIAL PERFORMANCE LOG GRANTED</div>
                <div class="timestamp">${timestamp}</div>
            </div>
            <button class="receipt-btn" id="receipt-exit-btn">END CONTRACT</button>
        `;

        overlay.classList.remove('hidden');
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.classList.add('active');
                setTimeout(() => {
                    const stamp = document.getElementById('report-stamp');
                    if (stamp) stamp.classList.add('active');
                }, 800);
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
            if (!el) return;
            el.classList.add('hidden');
        });

        // 【新：責任分離後のクリーンアップ】リストに含まれないリザルト系を個別に隠蔽
        const res = document.getElementById('result-overlay');
        const rec = document.getElementById('receipt-overlay');
        const back = document.getElementById('back-to-result-btn');
        [res, rec, back].forEach(el => {
            if (el) {
                el.classList.add('hidden');
                el.classList.remove('active', 'minimized'); // ステートのリセット
            }
        });

        // タイトル画面を最前面で表示
        titleScreen.classList.remove('hidden');

        if (!this.titleAnimation) {
            const bg = document.getElementById('title-bg-canvas');
            const fg = document.getElementById('title-fg-canvas');
            this.titleAnimation = new TitleAnimation(bg, fg);
        }
        this.titleAnimation.start();
    }

    /**
     * 【仕様 2.2】VIEW MAP モードへ移行する。
     * result-overlay / receipt-overlay に .minimized を付与し、BACK TO RESULT ボタンを表示する。
     * 呼び出し元: EventSystem（VIEW MAP ボタンクリック時）のみ
     */
    enterMapViewMode() {
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        const backToResultBtn = document.getElementById('back-to-result-btn');
        if (resultOverlay) resultOverlay.classList.add('minimized');
        if (receiptOverlay) receiptOverlay.classList.add('minimized');
        if (backToResultBtn) backToResultBtn.classList.remove('hidden');
    }

    /**
     * 【仕様 2.2】VIEW MAP モードからリザルト画面に戻る。
     * .minimized を削除し、BACK TO RESULT ボタンを非表示にする。
     * 呼び出し元: EventSystem（BACK TO RESULT ボタンクリック時）のみ
     */
    exitMapViewMode() {
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        const backToResultBtn = document.getElementById('back-to-result-btn');
        if (resultOverlay) resultOverlay.classList.remove('minimized');
        if (receiptOverlay) receiptOverlay.classList.remove('minimized');
        if (backToResultBtn) backToResultBtn.classList.add('hidden');
        this.game.updateUI();
    }

    /**
     * 【仕様 2.4】新しいリザルト表示開始時に呼び出す。
     * .minimized を削除し、BACK ボタンを初期化する。
     * 呼び出し元: showResult() のみ
     */
    resetResultOverlay() {
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        const backToResultBtn = document.getElementById('back-to-result-btn');
        
        // 【重要】クラスだけでなく内容も即座にクリアして残像を防ぐ
        const titleEl = document.getElementById('result-title');
        const subtitleEl = document.getElementById('result-subtitle');
        const statsList = document.getElementById('result-stats-list');
        const itemsList = document.getElementById('result-items-list');

        if (titleEl) titleEl.textContent = '';
        if (subtitleEl) subtitleEl.textContent = '';
        if (statsList) statsList.innerHTML = '';
        if (itemsList) itemsList.innerHTML = '';

        if (resultOverlay) {
            resultOverlay.classList.remove('minimized');
            resultOverlay.classList.add('hidden'); // 一旦隠すことを保証
            
            // 【最重要】強制リフロー (Forced Reflow)
            // ブラウザに「今、この瞬間に隠れた状態である」ことを認識させ、
            // CSS アニメーションやレンダリング状態を確実にリセットする。
            void resultOverlay.offsetWidth;
        }
        if (receiptOverlay) receiptOverlay.classList.remove('minimized');
        if (backToResultBtn) backToResultBtn.classList.add('hidden');
    }

    _updateHUD() {
        const game = this.game;
        const scoreDisplay = document.getElementById('score-display');
        const coinDisplay = document.getElementById('coin-display');
        const sectorDisplay = document.getElementById('sector-display');
        const eventCoinDisplay = document.getElementById('event-player-credits');
        
        if (scoreDisplay) scoreDisplay.textContent = Math.floor(game.displayScore || 0).toLocaleString();
        if (coinDisplay) coinDisplay.textContent = Math.floor(game.displayCoins || 0).toLocaleString();
        if (eventCoinDisplay) eventCoinDisplay.textContent = Math.floor(game.displayCoins || 0).toLocaleString();
        if (sectorDisplay) sectorDisplay.textContent = game.sector;
        this.updateMailIcon();
    }

    setupStoryListeners() {
        for (let i = 0; i < 3; i++) {
            const btn = document.getElementById(`mail-btn-${i}`);
            if (btn) {
                btn.onclick = () => {
                    const id = this.game.storySystem.sessionUnlocked[i];
                    if (id) this.showStoryModal(id);
                };
            }
        }

        const closeBtn = document.getElementById('close-story-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.getElementById('story-overlay').classList.add('hidden');
            };
        }
    }

    updateMailIcon() {
        const game = this.game;
        const group = document.getElementById('mail-status-group');
        if (!group) return;

        const sessionStories = game.storySystem.sessionUnlocked;
        
        for (let i = 0; i < 3; i++) {
            const btn = document.getElementById(`mail-btn-${i}`);
            if (!btn) continue;
            const id = sessionStories[i];

            // 既存のテーマクラスを一旦リセット
            btn.classList.remove('unread', 'gray');
            btn.style.color = '';
            btn.style.borderColor = '';
            btn.style.boxShadow = '';

            if (id) {
                btn.disabled = false;
                // インデックス i 文字目のブランチ名からテーマ色を決定 (例: id="TR", i=1 -> "R")
                const branch = id.charAt(i).toUpperCase();
                const goalKey = branch === 'T' ? 'TRADING_POST' : (branch === 'R' ? 'REPAIR_DOCK' : 'BLACK_MARKET');
                const color = GOAL_COLORS[goalKey];
                
                btn.style.color = color;
                btn.style.borderColor = color;
                btn.style.boxShadow = `0 0 15px ${hexToRgba(color, 0.2)}`;
                btn.classList.toggle('unread', !game.storySystem.isRead(id));
            } else {
                btn.disabled = true;
                btn.classList.add('gray');
            }
        }
    }

    showStoryModal(storyId) {
        const story = STORY_DATA[storyId];
        if (!story) return;

        const overlay = document.getElementById('story-overlay');
        const title = document.getElementById('story-title');
        const discovery = document.getElementById('story-discovery');
        const content = document.getElementById('story-content');
        const branchIcon = document.getElementById('story-branch-icon');

        if (overlay && branchIcon) {
            const branch = story.branch; // 'T', 'R', or 'B'
            const goalKey = branch === 'T' ? 'TRADING_POST' : (branch === 'R' ? 'REPAIR_DOCK' : 'BLACK_MARKET');
            const color = GOAL_COLORS[goalKey];

            // モーダル全体のカラーテーマを CSS 変数で上書き
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            overlay.style.setProperty('--story-color', color);
            overlay.style.setProperty('--story-color-alpha', hexToRgba(color, 0.4));
            overlay.style.setProperty('--story-color-rgb', `${r}, ${g}, ${b}`);
            
            branchIcon.textContent = branch;
            title.textContent = story.title;
            discovery.textContent = story.discovery;
            content.innerHTML = story.content.replace(/\n/g, '<br>');

            overlay.classList.remove('hidden');
            this.game.storySystem.markAsRead(storyId);
            this.updateMailIcon(); 
        }
    }

    addRow(parent, label, value, colorClass, unit = '', extra = null) {
        if (!parent) return;
        const row = document.createElement('div');
        row.className = 'result-row stagger-in';
        if (extra) row.classList.add('terminal-report-row');

        row.style.animationDelay = `${this._resultDelay}s`;
        const displayValue = typeof value === 'number' ? 
            (value >= 0 ? '+' : '') + value.toLocaleString() : 
            value;
        const unitText = unit ? ` ${unit}` : '';
        
        let html = `
            <div class="main-content">
                <span class="label">${label}</span>
                <span class="value ${colorClass}">${displayValue}${unitText}</span>
            </div>
        `;

        if (extra) {
            const rankText = extra.rank ? `${extra.rank}${(extra.rank === 1 ? 'st' : (extra.rank === 2 ? 'nd' : (extra.rank === 3 ? 'rd' : 'th')))}` : 'OUT OF RANK';
            const rankClass = extra.rank <= 3 ? 'top-rank' : '';
            html += `
                <div class="extra-info">
                    <span class="rank-label ${rankClass}">${rankText} IN RANKINGS</span>
                    <span class="grade-tag grade-${extra.grade.toLowerCase()}">${extra.grade}</span>
                </div>
            `;
        }

        row.innerHTML = html;
        parent.appendChild(row);
        this._resultDelay += 0.1;
    }

    animateValue(element, start, end, duration) {
        if (!element) return;
        const startTime = performance.now();
        const update = (now) => {
            const elapsed = (now - startTime) / (duration * 1000);
            if (elapsed < 1) {
                const current = Math.floor(start + (end - start) * elapsed);
                element.textContent = current.toLocaleString();
                requestAnimationFrame(update);
            } else {
                element.textContent = end.toLocaleString();
            }
        };
        requestAnimationFrame(update);
    }

    showStatus(message, type = 'info') {
        // 現在はログ出力を抑制。将来的に UI でのメッセージ表示に使用可能。
    }
}
