import { hexToRgba, REPAIR_BASE_COST } from '../../core/Data.js';
import { UIComponents } from './UIComponents.js';

export class MaintenanceUI {
    constructor(game, uiSystem) {
        this.game = game;
        this.uiSystem = uiSystem;
    }

    /**
     * Repair Dock の表示初期化
     */
    initRepairDock(container) {
        const game = this.game;
        container.innerHTML = '';
        
        if (!game.tempDismantleResults) game.tempDismantleResults = [];

        // --- 左カラム: アクション (修理・解体) ---
        const actionColumn = document.createElement('div');
        actionColumn.className = 'event-action-column';

        // 1. 修理セクション
        const repairSection = document.createElement('div');
        repairSection.className = 'event-section repair-section';
        repairSection.innerHTML = `
            <div class="section-header">
                <h3>発射台のメンテナンス</h3>
            </div>
            <p class="section-desc">ランチャーの使用回数を回復します。</p>
        `;
        
        const repairGrid = document.createElement('div');
        repairGrid.className = 'repair-grid';

        const repairables = game.inventory.launchers.filter(i => i.charges < (i.maxCharges || 2));
        if (repairables.length === 0) {
            repairGrid.innerHTML = `
                <div class="event-row">
                    <div class="slot-placeholder" style="flex: 1;">
                        <div class="part-header">
                            <span class="part-name" style="opacity: 0.5;">ALL LAUNCHERS READY</span>
                        </div>
                        <span class="part-info">すべてのランチャーが整備済みです。</span>
                    </div>
                </div>
            `;
        } else {
            repairables.forEach(item => {
                const totalDiscount = Math.min(0.5, game.currentCoinDiscount || 0);
                const cost = Math.floor(REPAIR_BASE_COST * (1 - totalDiscount));
                const displayDiscountPct = Math.round(totalDiscount * 100);
                const discountLevel = displayDiscountPct >= 50 ? 'high' : (displayDiscountPct >= 30 ? 'mid' : 'low');

                const card = document.createElement('div');
                card.className = 'event-row event-card';
                card.innerHTML = `
                    <div class="card-item-column">
                        ${UIComponents.generateCardHTML(item, { clickable: false })}
                    </div>

                    <div class="card-action-column">
                        <div class="card-price">
                            <span class="price-val">${cost}</span><span class="currency">c</span>
                            ${displayDiscountPct > 0 ? `<div class="discount-tag" data-level="${discountLevel}"><span class="pct-num">${displayDiscountPct}</span><span class="pct-sym">%</span> OFF</div>` : ''}
                        </div>
                        <button class="btn-action btn-action-outline repair-btn" ${game.coins < cost ? 'disabled' : ''}>REPAIR</button>
                    </div>
                `;
                card.querySelector('.repair-btn').onclick = () => {
                    if (game.coins >= cost) {
                        this.uiSystem.animateCoinChange(-cost);
                        game.coins -= cost;
                        item.charges = Math.min(item.charges + 1, item.maxCharges || 2);
                        this.initRepairDock(container);
                        game.updateUI();
                    }
                };
                repairGrid.appendChild(card);
            });
        }
        repairSection.appendChild(repairGrid);
        actionColumn.appendChild(repairSection);

        // 2. 解体セクション
        const dismantleSection = document.createElement('div');
        dismantleSection.className = 'event-section dismantle-section';
        dismantleSection.innerHTML = `
            <div class="section-header">
                <h3>機体の解体・調整</h3>
            </div>
            <p class="section-desc">機体を解体して構成パーツを再調整し、インベントリに戻します。解体コストは実行ごとに増加します。</p>
        `;

        const dismantleGrid = document.createElement('div');
        dismantleGrid.className = 'repair-grid';

        const dismantleCandidates = game.inventory.rockets;
        if (dismantleCandidates.length === 0) {
            dismantleGrid.innerHTML = `
                <div class="event-row">
                    <div class="slot-placeholder" style="flex: 1;">
                        <div class="part-header">
                            <span class="part-name" style="opacity: 0.5;">NO ASSEMBLED ROCKETS</span>
                        </div>
                        <span class="part-info">解体可能な機体が組み立てられていません。</span>
                    </div>
                </div>
            `;
        } else {
            dismantleCandidates.forEach(rocket => {
                const totalDiscount = Math.min(0.5, game.currentCoinDiscount || 0);
                const cost = Math.floor((game.dismantleCount + 1) * 50 * (1 - totalDiscount));
                const displayDiscountPct = Math.round(totalDiscount * 100);
                const discountLevel = displayDiscountPct >= 50 ? 'high' : (displayDiscountPct >= 30 ? 'mid' : 'low');

                const row = document.createElement('div');
                row.className = 'event-row event-card';
                row.innerHTML = `
                    <div class="card-item-column">
                        ${UIComponents.generateCardHTML(rocket, { badge: rocket.label, clickable: false })}
                    </div>

                    <div class="card-action-column">
                        <div class="card-price price-box ${game.shouldPulseDismantle ? 'pulse' : ''}">
                            <span class="price-val">${cost}</span><span class="currency">c</span>
                            ${displayDiscountPct > 0 ? `<div class="discount-tag" data-level="${discountLevel}"><span class="pct-num">${displayDiscountPct}</span><span class="pct-sym">%</span> OFF</div>` : ''}
                        </div>
                        <button class="btn-action btn-action-outline dismantle-btn" ${game.coins < cost ? 'disabled' : ''}>DISMANTLE</button>
                    </div>
                `;

                if (game.shouldPulseDismantle) {
                    setTimeout(() => game.shouldPulseDismantle = false, 400);
                }

                row.querySelector('.dismantle-btn').onclick = () => {
                    const idx = game.inventory.rockets.findIndex(r => r.instanceId === rocket.instanceId);
                    if (idx === -1) return;

                    const currentCost = Math.floor((game.dismantleCount + 1) * 50 * (1 - totalDiscount));
                    if (game.coins < currentCost) return;
                    
                    this.uiSystem.animateCoinChange(-currentCost);
                    game.coins -= currentCost;
                    game.dismantleCount++;
                    game.shouldPulseDismantle = true;

                    const partsToReturn = [];
                    if (rocket.chassis) partsToReturn.push({ ...rocket.chassis, category: 'CHASSIS', count: 1 });
                    if (rocket.logic) partsToReturn.push({ ...rocket.logic, category: 'LOGIC', count: 1 });
                    if (rocket.modules) {
                        Object.values(rocket.modules).forEach(m => {
                            if (m) partsToReturn.push({ ...m, category: 'MODULES' });
                        });
                    }

                    partsToReturn.forEach(p => {
                        game.enhanceItem(p);
                        game.inventorySystem.addItem(p);
                        game.tempDismantleResults.unshift(p);
                    });

                    if (game.selection.rocket?.instanceId === rocket.instanceId) game.selection.rocket = null;
                    if (idx !== -1) game.inventory.rockets.splice(idx, 1);
                    
                    this.initRepairDock(container);
                    game.updateUI();
                };
                dismantleGrid.appendChild(row);
            });
        }
        dismantleSection.appendChild(dismantleGrid);
        actionColumn.appendChild(dismantleSection);

        container.appendChild(actionColumn);

        // --- 右カラム: 結果 (調整済みパーツ) ---
        const resultsColumn = document.createElement('div');
        resultsColumn.className = 'event-results-column';

        const resultsSection = document.createElement('div');
        resultsSection.className = 'event-section dismantle-results-section';
        resultsSection.innerHTML = `
            <div class="section-header">
                <h3>調整済みパーツ（受取り）</h3>
            </div>
            <p class="section-desc">解体・調整によって回収された構成パーツの一覧です。</p>
        `;

        if (game.tempDismantleResults.length === 0) {
            const emptyRow = document.createElement('div');
            emptyRow.className = 'event-row';
            emptyRow.innerHTML = `
                <div class="slot-placeholder" style="flex: 1; padding: 20px;">
                    <div class="part-header">
                        <span class="part-name" style="opacity: 0.5;">NO RECENT ADJUSTMENTS</span>
                    </div>
                    <span class="part-info">このセッションでの解体・調整履歴はありません。</span>
                </div>
            `;
            resultsSection.appendChild(emptyRow);
        } else {
            const resultsList = document.createElement('div');
            resultsList.className = 'dismantle-result-list';
            
            game.tempDismantleResults.slice(0, 30).forEach(item => {
                const card = document.createElement('div');
                card.className = 'event-row event-card mini-item';
                card.innerHTML = `<div class="card-item-column">${UIComponents.generateCardHTML(item, { clickable: false })}</div>`;
                resultsList.appendChild(card);
            });
            resultsSection.appendChild(resultsList);
        }

        resultsColumn.appendChild(resultsSection);
        container.appendChild(resultsColumn);
    }
}
