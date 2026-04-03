import { RARITY, hexToRgba } from '../../core/Data.js';
import { ItemUtils } from '../../utils/ItemUtils.js';
import { EconomySystem } from '../EconomySystem.js';
import { UIComponents } from './UIComponents.js';

export class ShopUI {
    constructor(game, uiSystem) {
        this.game = game;
        this.uiSystem = uiSystem;
    }

    /**
     * Trading Post の表示初期化
     */
    initTradingPost(container) {
        const game = this.game;
        container.innerHTML = '';
        if (!game.currentShopStock) {
            game.currentShopStock = [];
            for (let i = 0; i < 6; i++) {
                const item = game.missionSystem.getWeightedRandomItem({ excludeCargo: true, excludeCoin: true });
                if (item) {
                    game.currentShopStock.push({ ...item, isSold: false, isSale: false });
                }
            }
            if (game.currentShopStock.length > 0) {
                game.currentShopStock[Math.floor(Math.random() * game.currentShopStock.length)].isSale = true;
            }
        }

        // --- 左カラム: 購入 (SHOP) ---
        const shopColumn = document.createElement('div');
        shopColumn.className = 'event-action-column';

        const shopSection = document.createElement('div');
        shopSection.className = 'event-section event-shop-section';
        shopSection.innerHTML = `
            <div class="section-header">
                <h3>販売中のアイテム</h3>
            </div>
            <p class="section-desc">ステーションで販売されている高度なパーツです。</p>
        `;

        const grid = document.createElement('div');
        grid.className = 'event-grid';

        game.currentShopStock.forEach((itemData) => {
            const isSale = itemData.isSale;
            const isSold = itemData.isSold;
            const baseValue = game.calculateValue(itemData);
            const baseDiscount = isSale ? 0.3 : 0.0;
            const totalDiscount = Math.min(0.5, baseDiscount + (game.currentCoinDiscount || 0));
            const buyPrice = Math.floor(baseValue * 2 * (1 - totalDiscount));
            const displayDiscountPct = Math.round(totalDiscount * 100);
            const discountLevel = displayDiscountPct >= 50 ? 'high' : (displayDiscountPct >= 30 ? 'mid' : 'low');

            const card = document.createElement('div');
            card.className = `event-row event-card`;
            card.innerHTML = `
                <div class="card-item-column">
                    ${UIComponents.generateCardHTML(itemData, { isSelected: false })}
                </div>
                <div class="card-action-column">
                    <div class="card-price" ${isSold ? 'style="opacity: 0.5;"' : ''}>
                        <span class="price-val">${buyPrice}</span><span class="currency">c</span>
                        ${displayDiscountPct > 0 ? `<div class="discount-tag" data-level="${discountLevel}"><span class="pct-num">${displayDiscountPct}</span><span class="pct-sym">%</span> OFF</div>` : ''}
                    </div>
                    <button class="btn-action btn-action-primary buy-btn" ${(game.coins < buyPrice || isSold) ? 'disabled' : ''}>${isSold ? 'SOLD' : 'BUY'}</button>
                </div>
            `;
            card.querySelector('.buy-btn').onclick = () => {
                if (game.coins >= buyPrice && !isSold) {
                    this.uiSystem.animateCoinChange(-buyPrice);
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
        shopColumn.appendChild(shopSection);
        container.appendChild(shopColumn);

        // --- 右カラム: 売却 (SELL) ---
        const sellColumn = document.createElement('div');
        sellColumn.className = 'event-results-column';

        const sellSection = document.createElement('div');
        sellSection.className = 'event-section event-sell-section';
        sellSection.innerHTML = `
            <div class="section-header">
                <h3>パーツの売却</h3>
            </div>
            <p class="section-desc">不要なパーツを売却して資金を獲得できます。</p>
        `;

        const sellGrid = document.createElement('div');
        sellGrid.className = 'event-grid';

        const allHoldings = [
            ...game.inventory.chassis.map(i => ({ ...i, cat: 'CHASSIS' })),
            ...game.inventory.logic.map(i => ({ ...i, cat: 'LOGIC' })),
            ...game.inventory.launchers.map(i => ({ ...i, cat: 'LAUNCHER' })),
            ...game.inventory.modules.map(i => ({ ...i, cat: 'MODULES' })),
            ...game.inventory.boosters.map(i => ({ ...i, cat: 'BOOSTER' }))
        ];

        if (allHoldings.length === 0) {
            sellGrid.innerHTML = `
                <div class="event-row">
                    <div class="slot-placeholder" style="flex: 1;">
                        <div class="part-header">
                            <span class="part-name" style="opacity: 0.5;">SELLABLE ITEMS EMPTY</span>
                        </div>
                        <span class="part-info">売却可能なパーツを所持していません。</span>
                    </div>
                </div>
            `;
        } else {
            allHoldings.forEach(item => {
                if ((item.count || 0) <= 0 && item.charges === undefined) return;
                const sellPrice = game.economySystem.calculateValue(item);
                const card = document.createElement('div');
                card.className = 'event-row event-card';
                card.innerHTML = `
                    <div class="card-item-column">
                        ${UIComponents.generateCardHTML(item, { showInventory: true })}
                    </div>
                    <div class="card-action-column">
                        <div class="card-price">
                            <span class="price-val">${sellPrice}</span><span class="currency">c</span>
                        </div>
                        <button class="btn-action btn-action-outline sell-btn">SELL</button>
                    </div>
                `;
                card.querySelector('.sell-btn').onclick = () => {
                    const success = game.inventorySystem.takeItem(item.cat, item.instanceId);
                    if (success) {
                        this.uiSystem.animateCoinChange(sellPrice);
                        game.coins += sellPrice;
                        this.initTradingPost(container);
                        game.updateUI();
                    }
                };
                sellGrid.appendChild(card);
            });
        }
        sellSection.appendChild(sellGrid);
        sellColumn.appendChild(sellSection);
        container.appendChild(sellColumn);
    }

    /**
     * Black Market の表示初期化
     */
    initBlackMarket(container) {
        const game = this.game;
        container.innerHTML = '';
        
        const totalDiscount = Math.min(0.5, game.currentCoinDiscount || 0);
        const cost100 = Math.floor(100 * (1 - totalDiscount));
        const cost500 = Math.floor(500 * (1 - totalDiscount));
        const displayDiscountPct = Math.round(totalDiscount * 100);

        // --- 左カラム: 取引オプション ---
        const actionColumn = document.createElement('div');
        actionColumn.className = 'event-action-column';

        const marketSection = document.createElement('div');
        marketSection.className = 'event-section';
        marketSection.innerHTML = `
            <div class="section-header">
                <h3>闇セクターの仕入れ品</h3>
            </div>
            <p class="section-desc">通常は流通しない希少なパーツや、性能が強化された一点物のパーツを入手できます。ドック滞在につき1回のみ取引可能です。</p>
        `;

        const optionsGrid = document.createElement('div');
        optionsGrid.className = 'event-grid';

        const options = [
            { 
                id: 'street_deal', 
                name: '通常取引', 
                category: 'MARKET',
                rarity: RARITY.UNCOMMON,
                desc: '査定総額 100c 以上のアイテム。50%の確率でランダムに強化されています。', 
                cost: cost100, 
                target: 100, 
                bonus: 0, 
                chance: 0.5 
            },
            { 
                id: 'premium_haul', 
                name: 'プレミアム取引', 
                category: 'MARKET',
                rarity: RARITY.RARE,
                desc: '査定総額 500c 以上。80%の確率で強化済み。希少パーツの出現率が大幅に向上します。', 
                cost: cost500, 
                target: 500, 
                bonus: 5, 
                chance: 0.8, 
                premium: true 
            }
        ];

        options.forEach(opt => {
            const card = document.createElement('div');
            card.className = `event-row event-card ${opt.premium ? 'premium-item' : ''} ${game.blackMarketUsed ? 'used-item' : ''}`;
            
            card.innerHTML = `
                <div class="card-item-column">
                    ${UIComponents.generateCardHTML({
                        id: opt.id,
                        name: opt.name,
                        category: opt.category,
                        rarity: opt.rarity,
                        description: opt.desc
                    })}
                </div>
                <div class="card-action-column">
                    <div class="card-price" ${game.blackMarketUsed ? 'style="opacity: 0.5;"' : ''}>
                        <span class="price-val">${opt.cost}</span><span class="currency">c</span>
                        ${displayDiscountPct > 0 ? `<div class="discount-tag" data-level="low"><span class="pct-num">${displayDiscountPct}</span><span class="pct-sym">%</span> OFF</div>` : ''}
                    </div>
                    <button class="btn-action btn-action-primary buy-btn" ${game.coins < opt.cost || game.blackMarketUsed ? 'disabled' : ''}>
                        ${game.blackMarketUsed ? 'SOLD' : 'BUY'}
                    </button>
                </div>
            `;

            if (!game.blackMarketUsed && game.coins >= opt.cost) {
                card.querySelector('.buy-btn').onclick = () => {
                    this.runBlackMarket(opt.cost, opt.target, opt.bonus, opt.chance);
                };
            }
            optionsGrid.appendChild(card);
        });

        marketSection.appendChild(optionsGrid);
        actionColumn.appendChild(marketSection);
        container.appendChild(actionColumn);

        // --- 右カラム: 獲得アイテム ---
        const resultsColumn = document.createElement('div');
        resultsColumn.className = 'event-results-column';

        const resultsSection = document.createElement('div');
        resultsSection.className = 'event-section';
        resultsSection.innerHTML = `
            <div class="section-header">
                <h3>獲得アイテム</h3>
            </div>
            <div id="market-results-list" class="event-grid">
                <div class="event-row">
                    <div class="slot-placeholder" style="flex: 1;">
                        <span class="part-info">取引を開始すると、ここに獲得したアイテムが表示されます。</span>
                    </div>
                </div>
            </div>
        `;
        
        resultsColumn.appendChild(resultsSection);
        container.appendChild(resultsColumn);
    }

    /**
     * Black Market の取引実行ロジック
     */
    runBlackMarket(cost, targetValue, bonus, enhancementChance) {
        const game = this.game;
        if (game.coins < cost || game.blackMarketUsed) return;
        
        game.blackMarketUsed = true;
        this.uiSystem.animateCoinChange(-cost);
        game.coins -= cost;
        game.updateUI();

        const dealButtons = document.querySelectorAll('.buy-btn');
        dealButtons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'SOLD';
        });
        document.querySelectorAll('.event-card').forEach(c => c.classList.add('used-item'));
        document.querySelectorAll('.card-price').forEach(p => p.style.opacity = '0.5');

        const obtained = [];
        let currentValue = 0;
        
        while (currentValue < targetValue) {
            const item = game.missionSystem.getWeightedRandomItem({ thresholdBonus: bonus, excludeCargo: true, excludeCoin: true });
            if (item) {
                if (Math.random() < enhancementChance) {
                    game.economySystem.enhanceItem(item);
                }
                const val = game.economySystem.calculateValue(item) * EconomySystem.MARKET_VALUE_MULTIPLIER;
                obtained.push(item);
                currentValue += val;
                game.inventorySystem.addItem({ ...item });
            } else {
                break;
            }
        }

        const displayGroups = ItemUtils.groupItems(obtained);
        const list = document.getElementById('market-results-list');
        list.innerHTML = '';

        displayGroups.forEach((group, index) => {
            setTimeout(() => {
                const card = document.createElement('div');
                card.className = 'event-row event-card entrance-anim';
                card.style.opacity = '0';
                card.style.transform = 'translateY(10px)';
                card.style.transition = 'all 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67)';
                
                card.innerHTML = `
                    <div class="card-item-column">
                        ${UIComponents.generateCardHTML(group, { badge: group.count > 1 ? `x ${group.count}` : null })}
                    </div>
                `;
                list.appendChild(card);
                
                requestAnimationFrame(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });

                const column = list.closest('.event-results-column');
                if (column) column.scrollTop = column.scrollHeight;
            }, index * 250);
        });

        game.updateUI();
    }
}
