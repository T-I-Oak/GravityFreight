import { CATEGORY_COLORS, hexToRgba } from '../../core/Data.js';

/**
 * UISystem の各サブシステムで使用される共通描画コンポーネント
 */
export class UIComponents {
    /**
     * アイテムカードの HTML を生成
     * @param {Object} itemData
     * @param {Object} options { isSelected, clickable, showInventory, badge, indent, selectionCount }
     */
    static generateCardHTML(itemData, options = {}) {
        if (!itemData) return '';
        const item = itemData;
        const category = itemData.category || 'CHASSIS';
        const categoryColor = CATEGORY_COLORS[category] || '#fff';
        const selectionCount = options.selectionCount || 0;
        const showInventory = options.showInventory || false;
        const isSelected = options.isSelected || false;
        const clickable = options.clickable !== false; // Default to clickable
        const enhancements = itemData.enhancements || {};
        const isRocket = category === 'ROCKETS';

        let invInfo = "";
        const hasCharges = itemData.charges !== undefined || itemData.maxCharges !== undefined;
        if (showInventory) {
            let gauges = "";
            let stack = "";
            
            if (hasCharges) {
                const max = itemData.maxCharges || 2;
                const current = itemData.charges !== undefined ? itemData.charges : max;
                gauges = UIComponents.generateHPGauge(current, max, enhancements.charges > 0);
            }
            
            if (itemData.count > 1) {
                stack = `<div class="stack-badge"><span class="stack-count">${itemData.count}</span></div>`;
            }
            
            invInfo = `${stack}${gauges}`;
        }

        const selTag = (selectionCount > 0) ? ` <span class="selection-badge">[${selectionCount}]</span>` : '';
        
        let extraBadge = options.badge || '';
        if (!extraBadge && item.isDelivery) {
            extraBadge = item.isMatch ? 
                `<span class="status-badge status-delivered">✓ DELIVERED</span>` : 
                `<span class="status-badge status-unmatched">✗ UNMATCHED</span>`;
        }
        const indent = options.indent || 0;

        const containerStyle = `--item-color: ${categoryColor}; margin-left: ${indent}px;`;

        const stats = [];
        if (item.slots !== undefined && item.slots > 0) {
            stats.push({ label: 'SLOTS', val: item.slots, enhanced: enhancements.slots > 0 });
        }
        if (item.precisionMultiplier !== undefined && item.precisionMultiplier !== 1.0) {
            stats.push({ label: 'PRECISION', val: `x${item.precisionMultiplier.toFixed(1)}`, enhanced: enhancements.precision > 0 });
        }
        if (item.pickupMultiplier !== undefined && item.pickupMultiplier !== 1.0) {
            stats.push({ label: 'PICKUP', val: `x${item.pickupMultiplier.toFixed(1)}`, enhanced: enhancements.pickup > 0 });
        }
        if (item.gravityMultiplier !== undefined && item.gravityMultiplier !== 1.0) {
            stats.push({ label: 'GRAVITY', val: `x${item.gravityMultiplier.toFixed(1)}`, enhanced: enhancements.gravity > 0 });
        }

        const statsHtml = stats.map(s => `
            <div class="stat-tag ${s.enhanced ? 'enhanced-border' : ''}">
                <span class="stat-label">${s.label}</span>
                <span class="stat-val">${s.val}${s.enhanced ? '<span class="star">✦</span>' : ''}</span>
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
                const mGauge = m.maxCharges ? UIComponents.generateHPGauge(m.charges, m.maxCharges, false, true) : '';
                const mStack = m.count > 1 ? `<div class="stack-badge mini"><span class="stack-count">${m.count}</span></div>` : '';
                rows.push(`
                    <div class="rocket-module-row">
                        <span class="rocket-module-name">${m.name}</span>
                        <div style="display:flex; align-items:center; gap: 8px;">
                            ${mStack}
                            ${mGauge}
                        </div>
                    </div>
                `);
            });
            rocketDetailsHtml = `<div class="rocket-details">${rows.join('')}</div>`;
        }

        const desc = isRocket ? '' : (item.description || '');

        return `
            <div class="item-card ${isSelected ? 'selected' : ''} ${clickable ? 'clickable' : ''}" style="${containerStyle}">
                <div class="part-header">
                    <span class="part-name">${item.name || 'Unknown'}${selTag}</span>
                    <div class="part-header-right">
                        ${extraBadge}
                        ${invInfo}
                    </div>
                </div>
                ${desc ? `<div class="part-info">${desc}</div>` : ''}
                <div class="part-stats">
                    ${statsHtml}
                </div>
                ${rocketDetailsHtml}
            </div>
        `;
    }

    /**
     * 耐久力ゲージの HTML を生成
     */
    static generateHPGauge(current, max, isEnhanced = false, mini = false) {
        let segments = '';
        for (let i = 0; i < max; i++) {
            const isActive = i < current;
            const enhancedClass = (isActive && isEnhanced) ? 'enhanced-border' : '';
            segments += `<div class="hp-segment ${isActive ? 'active' : ''} ${mini ? 'mini' : ''} ${enhancedClass}"></div>`;
        }
        return `<div class="hp-gauge ${isEnhanced ? 'enhanced-frame' : ''} ${mini ? 'mini' : ''}">${segments}</div>`;
    }
}
