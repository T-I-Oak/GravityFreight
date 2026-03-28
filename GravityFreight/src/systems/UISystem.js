import { CATEGORY_COLORS, ITEM_REGISTRY, GOAL_NAMES, ANIMATION_DURATION, hexToRgba } from '../core/Data.js';

export class UISystem {
    constructor(game) {
        this.game = game;
    }

    update(dt) {
        const game = this.game;
        // スコア表示の更新
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

            const groups = [];
            items.forEach(item => {
                if (!item || !item.id) return;
                const charges = item.charges !== undefined ? item.charges : -1;
                const enhancementsStr = JSON.stringify(item.enhancements || {});
                let group = groups.find(g => g.id === item.id && g.charges === charges && JSON.stringify(g.enhancements || {}) === enhancementsStr);
                if (!group) {
                    group = { ...item, count: 0, instances: [] };
                    groups.push(group);
                }
                group.count += (item.count !== undefined ? item.count : 1);
                group.instances.push(item);
            });

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

        const buildOverlay = document.getElementById('build-overlay');
        const launchBtn = document.getElementById('launch-btn');
        if (game.state === 'building' || game.state === 'aiming') {
            buildOverlay?.classList.remove('hidden');
        } else {
            buildOverlay?.classList.add('hidden');
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
                    div.onclick = () => game.selectPart('rocket', rocket.instanceId);
                    rList.appendChild(div);
                });
            }
        }
    }

    generateCardHTML(itemData, options = {}) {
        if (!itemData) return '';
        const item = itemData;
        const category = itemData.category || 'CHASSIS';
        const categoryColor = CATEGORY_COLORS[category] || '#fff';
        const selectionCount = options.selectionCount || 0;
        const showInventory = options.showInventory || false;
        const isSelected = options.isSelected || false;
        const enhancements = itemData.enhancements || {};
        const isRocket = category === 'ROCKETS';

        let invInfo = "";
        const hasCharges = itemData.charges !== undefined || itemData.maxCharges !== undefined;
        if (showInventory && hasCharges) {
            const max = itemData.maxCharges || 2;
            const current = itemData.charges !== undefined ? item.charges : max;
            const isChargeEnhanced = enhancements.charges > 0;
            let segments = '';
            for (let i = 0; i < max; i++) {
                segments += `<div class="hp-segment ${i < current ? 'active' : ''}" style="width:8px; height:4px; background:${i < current ? (isChargeEnhanced ? '#ffd700' : '#fff') : 'rgba(255,255,255,0.1)'}; border-radius:1px;"></div>`;
            }
            invInfo = `<div class="hp-gauge ${isChargeEnhanced ? 'enhanced-frame' : ''}" style="display: flex; gap: 2px; padding: 2px;">${segments}</div>`;
        } else if (showInventory && itemData.count > 1) {
            invInfo = `<span class="inventory-badge" style="font-size: 10px; color: rgba(255,255,255,0.6); font-weight:bold;">[x ${itemData.count}]</span>`;
        }

        const selTag = (selectionCount > 0) ? ` <span class="selection-badge" style="color: #ffcc00; font-weight: bold;">[${selectionCount}]</span>` : '';
        const extraBadge = options.badge || '';
        const indent = options.indent || 0;

        const containerStyle = `
            position: relative;
            border-left: 5px solid ${categoryColor};
            padding: 10px 12px;
            background: ${isSelected ? hexToRgba(categoryColor, 0.25) : 'rgba(255,255,255,0.03)'};
            border-radius: 4px;
            margin-bottom: 2px;
            min-width: 220px;
            margin-left: ${indent}px;
            transition: all 0.2s ease;
            ${isSelected ? `box-shadow: inset 0 0 15px ${hexToRgba(categoryColor, 0.2)}, 0 0 10px ${hexToRgba(categoryColor, 0.2)};` : ''}
            border-top: 1px solid ${isSelected ? hexToRgba(categoryColor, 0.4) : 'rgba(255,255,255,0.05)'};
            border-right: 1px solid ${isSelected ? hexToRgba(categoryColor, 0.4) : 'rgba(255,255,255,0.05)'};
            border-bottom: 1px solid ${isSelected ? hexToRgba(categoryColor, 0.4) : 'rgba(255,255,255,0.05)'};
        `;

        const stats = [];
        if (item.slots !== undefined && item.slots > 0) stats.push({ label: 'SLOTS', val: item.slots, enhanced: enhancements.slots > 0 });
        if (item.precisionMultiplier !== undefined && item.precisionMultiplier !== 1.0) stats.push({ label: 'PRECISION', val: `x${item.precisionMultiplier.toFixed(1)}`, enhanced: enhancements.precision > 0 });
        if (item.pickupMultiplier !== undefined && item.pickupMultiplier !== 1.0) stats.push({ label: 'PICKUP', val: `x${item.pickupMultiplier.toFixed(1)}`, enhanced: enhancements.pickup > 0 });
        if (item.gravityMultiplier !== undefined && item.gravityMultiplier !== 1.0) stats.push({ label: 'GRAVITY', val: `x${item.gravityMultiplier.toFixed(1)}`, enhanced: enhancements.gravity > 0 });

        const statsHtml = stats.map(s => `
            <div class="stat-tag ${s.enhanced ? 'enhanced-border' : ''}">
                <span class="stat-label">${s.label}</span>
                <span class="stat-val">${s.val}${s.enhanced ? '<span style="color:#00d4ff; font-size:8px; margin-left:2px;">✦</span>' : ''}</span>
            </div>
        `).join('');

        let rocketDetailsHtml = '';
        if (isRocket && item.modules) {
            const merged = new Map();
            for (const [id, data] of Object.entries(item.modules)) {
                if (!data) continue;
                const mid = data.id;
                if (merged.has(mid)) {
                    const e = merged.get(mid);
                    e.count += data.count || 1;
                    if (data.maxCharges) {
                        e.maxCharges = (e.maxCharges || 0) + (data.maxCharges * (data.count || 1));
                        e.charges = (e.charges || 0) + ((data.charges !== undefined ? data.charges : data.maxCharges) * (data.count || 1));
                    }
                } else {
                    merged.set(mid, {
                        name: data.name,
                        count: data.count || 1,
                        maxCharges: data.maxCharges ? (data.maxCharges * (data.count || 1)) : undefined,
                        charges: data.maxCharges ? ((data.charges !== undefined ? data.charges : data.maxCharges) * (data.count || 1)) : undefined
                    });
                }
            }
            const rows = [];
            merged.forEach(m => {
                let mGauge = '';
                if (m.maxCharges) {
                    let mSegs = '';
                    for (let i = 0; i < m.maxCharges; i++) mSegs += `<div class="hp-segment ${i < m.charges ? 'active' : ''}" style="width:6px; height:3px; background:${i < m.charges ? '#fff' : 'rgba(255,255,255,0.1)'}; border-radius:1px; flex-shrink:0;"></div>`;
                    mGauge = `<div class="hp-gauge" style="display:flex; gap:1.5px; margin-left:8px;">${mSegs}</div>`;
                }
                rows.push(`
                    <div class="rocket-module-row" style="display:flex; align-items:center; justify-content:space-between;">
                        <span class="rocket-module-name" style="font-size:10px; color:rgba(255,255,255,0.8);">${m.name}</span>
                        <div style="display:flex; align-items:center;">
                            <span class="inventory-badge" style="font-size:9px; color:rgba(255,255,255,0.5);">[x ${m.count}]</span>
                            ${mGauge}
                        </div>
                    </div>
                `);
            });
            rocketDetailsHtml = `<div class="rocket-details" style="margin-top:4px;">${rows.join('')}</div>`;
        }

        const desc = isRocket ? '' : (item.description || '');

        return `
            <div class="part-item-container" style="${containerStyle}">
                ${extraBadge ? `<div style="position:absolute; top:4px; right:4px;">${extraBadge}</div>` : ''}
                <div class="part-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span class="part-name" style="font-weight: 800; font-size: 13px; color: #fff;">${item.name || 'Unknown'}${selTag}</span>
                    ${invInfo}
                </div>
                ${desc ? `<div class="part-info" style="font-size: 11px; color: rgba(255,255,255,0.7); line-height: 1.4; margin-bottom: 6px;">${desc}</div>` : ''}
                <div class="part-stats" style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${statsHtml}
                </div>
                ${rocketDetailsHtml}
            </div>
        `;
    }

    showResult(resultType) {
        const game = this.game;
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
        overlay.classList.add((resultType === 'success' || resultType === 'cleared' || resultType === 'returned') ? 'success-theme' : 'failure-theme');
        overlay.classList.remove('hidden');

        const statusText = { 'success': `SECTOR ${game.sector - 1} COMPLETED`, 'cleared': `SECTOR ${game.sector - 1} COMPLETED`, 'returned': 'ROCKET RECOVERED', 'crashed': 'SHIP CRASHED', 'lost': 'LOST IN SPACE' };
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

        game.displayScore = game.launchScore;
        game.displayCoins = game.launchCoins;
        game.updateUI();

        game.score += pendingS;
        game.coins += pendingC;
        game.pendingGoalBonus = 0;
        game.pendingScore = 0;
        game.pendingCoins = 0;

        if (statsList) statsList.innerHTML = '';
        if (itemsList) itemsList.innerHTML = '';

        let delay = 0.4;
        const addRow = (parent, label, value, colorClass) => {
            const row = document.createElement('div');
            row.className = 'result-row stagger-in';
            row.style.animationDelay = `${delay}s`;
            row.innerHTML = `<span class="label">${label}</span><span class="value ${colorClass}">${value >= 0 ? '+' : ''}${value.toLocaleString()}</span>`;
            parent.appendChild(row);
            delay += 0.1;
        };

        const pureFlightScore = Math.max(0, game.score - game.launchScore);
        addRow(statsList, 'Flight Duration Score', pureFlightScore, 'score');
        game.flightResults.bonuses.filter(b => b.value > 0).forEach(b => addRow(statsList, b.name, b.value, 'score'));

        const itemCoinTotal = game.flightResults.items.filter(i => i.category === 'COIN').reduce((sum, i) => sum + (i.score || 0), 0);
        if (itemCoinTotal > 0) addRow(statsList, 'Collected Coins', itemCoinTotal, 'coin');
        game.flightResults.bonuses.filter(b => b.coins && b.coins > 0).forEach(b => addRow(statsList, b.name, b.coins, 'coin'));

        const cargoItems = [];
        const otherItems = new Map();
        if (resultType !== 'crashed' && resultType !== 'lost') {
            game.flightResults.items.forEach(item => {
                if (!item || !item.id) return;
                if (item.category === 'CARGO') cargoItems.push(item);
                else {
                    const key = `${item.id}-${item.enhancementCount || 0}`;
                    if (otherItems.has(key)) otherItems.get(key).count++;
                    else otherItems.set(key, { data: item, category: item.category, count: 1 });
                }
            });
        }

        if (cargoItems.length === 0 && otherItems.size === 0) {
            if (itemsList) itemsList.innerHTML = '<div class="part-info" style="opacity:0.3;text-align:center;padding:20px;">NO ITEMS COLLECTED</div>';
        } else {
            cargoItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'reward-item-card stagger-in';
                card.style.animationDelay = `${delay}s`;
                delay += 0.07;
                const badge = item.isDelivery ? (item.isMatch ? `<span style="color:#44ffbb;font-size:10px;font-weight:800;">✓ DELIVERED</span>` : `<span style="color:#ff7755;font-size:10px;font-weight:800;">✗ UNMATCHED</span>`) : '';
                card.innerHTML = this.generateCardHTML(item, { badge });
                itemsList.appendChild(card);
            });
            otherItems.forEach(group => {
                const card = document.createElement('div');
                card.className = 'reward-item-card stagger-in';
                card.style.animationDelay = `${delay}s`;
                delay += 0.07;
                card.innerHTML = this.generateCardHTML(group.data, { showInventory: true });
                itemsList.appendChild(card);
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

        const popup = document.createElement('div');
        popup.className = `coin-popup ${amount > 0 ? 'coin-plus' : 'coin-minus'}`;
        popup.textContent = (amount > 0 ? '+' : '') + amount.toLocaleString();

        if (creditsEl && creditsEl.offsetParent !== null) {
            const rect = creditsEl.getBoundingClientRect();
            popup.style.left = (rect.left + rect.width / 2) + 'px';
            popup.style.top = rect.top + 'px';
            creditsEl.classList.add('pulse');
            setTimeout(() => creditsEl.classList.remove('pulse'), 300);
        } else if (hudCoinsEl) {
            const rect = hudCoinsEl.getBoundingClientRect();
            popup.style.left = (rect.left + rect.width / 2) + 'px';
            popup.style.top = rect.top + 'px';
            hudCoinsEl.classList.add('pulse');
            setTimeout(() => hudCoinsEl.classList.remove('pulse'), 300);
        }
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), ANIMATION_DURATION);
    }

    initTradingPost(container) {
        const game = this.game;
        container.innerHTML = '';
        if (!game.currentShopStock) {
            game.currentShopStock = [];
            for (let i = 0; i < 6; i++) {
                const item = game.missionSystem.getWeightedRandomItem({ excludeCargo: true, excludeCoin: true });
                if (item) {
                    game.currentShopStock.push({ ...item, isSold: false });
                }
            }
            if (game.currentShopStock.length > 0) {
                game.currentShopStock[Math.floor(Math.random() * game.currentShopStock.length)].isSale = true;
            }
        }

        const shopSection = document.createElement('div');
        shopSection.className = 'event-shop-section';
        shopSection.innerHTML = '<h3>AVAILABLE STOCK</h3>';
        const grid = document.createElement('div');
        grid.className = 'event-grid';

        game.currentShopStock.forEach((itemData) => {
            const isSale = itemData.isSale;
            const isSold = itemData.isSold;
            const baseValue = game.calculateValue(itemData);
            let buyPrice = baseValue * 2;
            if (isSale) buyPrice = Math.floor(buyPrice * 0.7);

            const card = document.createElement('div');
            card.className = `event-card ${isSale ? 'sale' : ''}`;
            card.innerHTML = `
                <div class="card-body">
                    ${this.generateCardHTML(itemData, { isSelected: isSale })}
                    <div class="card-price"><span class="price-val">${isSold ? '---' : buyPrice}</span><span class="currency">c</span>${isSale ? '<span class="sale-badge">30% OFF</span>' : ''}</div>
                </div>
                <button class="buy-btn" ${(game.coins < buyPrice || isSold) ? 'disabled' : ''}>${isSold ? 'SOLD OUT' : 'BUY'}</button>
            `;
            card.querySelector('.buy-btn').onclick = () => {
                if (game.coins >= buyPrice && !isSold) {
                    this.animateCoinChange(-buyPrice);
                    game.coins -= buyPrice;
                    game.inventorySystem.addItem(itemData);
                    itemData.isSold = true;
                    this.initTradingPost(container);
                    game.updateUI();
                }
            };
            grid.appendChild(card);
        });
        shopSection.appendChild(grid);
        container.appendChild(shopSection);

        const sellSection = document.createElement('div');
        sellSection.className = 'event-sell-section';
        sellSection.innerHTML = '<h3>SELL YOUR PARTS</h3>';
        const sellGrid = document.createElement('div');
        sellGrid.className = 'event-grid';

        const allHoldings = [
            ...game.inventory.chassis.map(i => ({ ...i, cat: 'CHASSIS' })),
            ...game.inventory.logic.map(i => ({ ...i, cat: 'LOGIC' })),
            ...game.inventory.launchers.map(i => ({ ...i, cat: 'LAUNCHER' })),
            ...game.inventory.modules.map(i => ({ ...i, cat: 'MODULES' })),
            ...game.inventory.boosters.map(i => ({ ...i, cat: 'BOOSTER' }))
        ];

        allHoldings.forEach(item => {
            if ((item.count || 0) <= 0 && item.charges === undefined) return;
            const sellPrice = game.calculateValue(item);
            const card = document.createElement('div');
            card.className = 'event-card sell-card';
            card.innerHTML = `
                <div class="card-body">
                    ${this.generateCardHTML(item, { showInventory: true })}
                    <div class="card-price sell"><span class="label">SELL FOR:</span><span class="price-val">${sellPrice}</span><span class="currency">c</span></div>
                </div>
                <button class="sell-btn">SELL</button>
            `;
            card.querySelector('.sell-btn').onclick = () => {
                const success = game.inventorySystem.removeItem(item.cat, item.instanceId);
                if (success) {
                    this.animateCoinChange(sellPrice);
                    game.coins += sellPrice;
                    this.initTradingPost(container);
                    game.updateUI();
                }
            };
            sellGrid.appendChild(card);
        });
        sellSection.appendChild(sellGrid);
        container.appendChild(sellSection);
    }

    initRepairDock(container) {
        const game = this.game;
        container.innerHTML = `
            <div class="repair-dock-layout" style="display:flex; flex-direction:column; gap:20px;">
                <div class="repair-section">
                    <h3 style="color:#4caf50; border-bottom:1px solid rgba(76,175,80,0.3); padding-bottom:5px;">MAINTENANCE (LAUNCHERS ONLY)</h3>
                    <div id="repair-list" class="event-grid"></div>
                </div>
                <div class="dismantle-section">
                    <h3 style="color:#ffab40; border-bottom:1px solid rgba(255,171,64,0.3); padding-bottom:5px;">DISMANTLE (ROCKETS ONLY)</h3>
                    <div id="dismantle-list" class="event-grid"></div>
                </div>
                <div id="repair-log" style="background:rgba(0,0,0,0.4); padding:10px; border-radius:4px; font-family:monospace; min-height:60px; max-height:100px; overflow-y:auto; border:1px solid rgba(255,255,255,0.1); display:none;"></div>
            </div>
        `;

        const repairList = document.getElementById('repair-list');
        const dismantleList = document.getElementById('dismantle-list');
        const logArea = document.getElementById('repair-log');

        const addLog = (msg) => {
            logArea.style.display = 'block';
            const line = document.createElement('div');
            line.style.color = '#00ffcc'; line.style.fontSize = '11px'; line.textContent = `> ${msg}`;
            logArea.appendChild(line);
            logArea.scrollTop = logArea.scrollHeight;
        };

        const repairables = game.inventory.launchers.filter(i => i.charges < (i.maxCharges || 2));
        if (repairables.length === 0) {
            repairList.innerHTML = '<div class="part-info" style="opacity:0.3; padding:20px; text-align:center;">ALL LAUNCHERS READY</div>';
        } else {
            repairables.forEach(item => {
                const cost = Math.floor(20 * (1 - game.currentCoinDiscount));
                const card = document.createElement('div');
                card.className = 'event-card repair-card';
                card.innerHTML = `
                    <div class="card-body">
                        ${this.generateCardHTML(item, { showInventory: true })}
                        <div class="card-price"><span class="label">REPAIR (+1 CHG):</span><span class="price-val">${cost}</span><span class="currency">c</span></div>
                    </div>
                    <button class="repair-btn" ${game.coins < cost ? 'disabled' : ''}>RESTORE</button>
                `;
                card.querySelector('.repair-btn').onclick = () => {
                    if (game.coins >= cost) {
                        this.animateCoinChange(-cost);
                        game.coins -= cost;
                        item.charges = Math.min(item.charges + 1, item.maxCharges || 2);
                        addLog(`RESTORED: ${item.name} (+1 charge)`);
                        this.initRepairDock(container);
                        game.updateUI();
                    }
                };
                repairList.appendChild(card);
            });
        }

        const dismantleCandidates = game.inventory.rockets;
        if (dismantleCandidates.length === 0) {
            dismantleList.innerHTML = '<div class="part-info" style="opacity:0.3; padding:20px; text-align:center;">NO ASSEMBLED ROCKETS</div>';
        } else {
            dismantleCandidates.forEach(rocket => {
                const row = document.createElement('div');
                row.className = 'dismantle-row';
                row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,171,64,0.1);';
                row.innerHTML = `
                    <div style="flex:1;">
                        ${this.generateCardHTML(rocket, { badge: rocket.label })}
                    </div>
                    <button class="mini-btn dismantle-btn" style="margin-left:15px; border-color:#ff5252; color:#ff5252; background:rgba(255,82,82,0.1);">DISMANTLE</button>
                `;

                row.querySelector('.dismantle-btn').onclick = () => {
                    const cost = Math.floor((game.dismantleCount + 1) * 50 * (1 - game.currentCoinDiscount));
                    if (game.coins < cost) return;
                    this.animateCoinChange(-cost);
                    game.coins -= cost;
                    game.dismantleCount++;
                    addLog(`--- DISMANTLING: ${rocket.name} ---`);

                    const partsToReturn = [];
                    if (rocket.chassis) partsToReturn.push({ ...rocket.chassis, category: 'CHASSIS', count: 1 });
                    if (rocket.logic) partsToReturn.push({ ...rocket.logic, category: 'LOGIC', count: 1 });
                    if (rocket.modules) {
                        for (const [modId, count] of Object.entries(rocket.modules)) {
                            // modId は instanceId なので、インベントリから対応する ID を引く
                            const invMod = game.inventory.modules.find(m => m.instanceId === modId);
                            const m = invMod ? ITEM_REGISTRY[invMod.id] : null;
                            if (m) partsToReturn.push({ ...m, category: 'MODULES', count: count });
                        }
                    }

                    partsToReturn.forEach(p => {
                        game._addItemToInventory(p);
                        addLog(`RESTORED: ${p.name}`);
                    });

                    if (game.selection.rocket?.instanceId === rocket.instanceId) game.selection.rocket = null;
                    const idx = game.inventory.rockets.findIndex(r => r.instanceId === rocket.instanceId);
                    if (idx !== -1) game.inventory.rockets.splice(idx, 1);
                    this.initRepairDock(container);
                    game.updateUI();
                };
                dismantleList.appendChild(row);
            });
        }
    }

    initBlackMarket(container) {
        const game = this.game;
        const cost100 = Math.floor(100 * (1 - game.currentCoinDiscount));
        const cost500 = Math.floor(500 * (1 - game.currentCoinDiscount));
        container.innerHTML = `
            <div class="black-market-options">
                <div class="market-option"><h3>STREET DEAL</h3><p>Total value ~100c items.</p><button id="market-btn-100" class="premium-button" ${game.coins < cost100 ? 'disabled' : ''}>PAY ${cost100}c</button></div>
                <div class="market-option highlighted"><h3>PREMIUM HAUL</h3><p>Total value ~600c items.</p><button id="market-btn-500" class="premium-button" ${game.coins < cost500 ? 'disabled' : ''}>PAY ${cost500}c</button></div>
            </div>
            <div id="market-results" class="market-results-area hidden"><h3>OBTAINED ITEMS</h3><div id="market-results-list" class="event-grid"></div></div>
        `;
        document.getElementById('market-btn-100').onclick = () => this.runBlackMarket(cost100, 100, 0);
        document.getElementById('market-btn-500').onclick = () => this.runBlackMarket(cost500, 600, 5);
    }

    runBlackMarket(cost, targetValue, bonus) {
        const game = this.game;
        if (game.coins < cost) return;
        this.animateCoinChange(-cost);
        game.coins -= cost;
        game.updateUI();
        const obtained = [];
        let currentValue = 0;
        while (currentValue < targetValue) {
            const item = game.missionSystem.getWeightedRandomItem({ thresholdBonus: bonus, excludeCargo: true, excludeCoin: true });
            obtained.push(item); currentValue += game.economySystem.calculateValue(item);
        }
        obtained.forEach(i => game.inventorySystem.addItem(i));
        const resultsArea = document.getElementById('market-results');
        const list = document.getElementById('market-results-list');
        resultsArea.classList.remove('hidden');
        list.innerHTML = '';
        obtained.forEach(i => {
            const card = document.createElement('div'); card.className = 'event-card obtained-card';
            card.innerHTML = `<div class="card-body">${this.generateCardHTML(i)}</div>`;
            list.appendChild(card);
        });
        document.getElementById('market-btn-100').disabled = true;
        document.getElementById('market-btn-500').disabled = true;
        game.updateUI();
    }
}
