import { CATEGORY_COLORS, hexToRgba } from '../../core/Data.js';

/**
 * UISystem の各サブシステムで使用される共通描画コンポーネント
 */
export class UIComponents {
    /**
     * アイテムカードの HTML を生成
     */
    static generateCardHTML(itemData, options = {}) {
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
            const current = itemData.charges !== undefined ? itemData.charges : max;
            invInfo = UIComponents.generateHPGauge(current, max, enhancements.charges > 0);
        } else if (showInventory && itemData.count > 1) {
            invInfo = `<span class="inventory-badge" style="font-size: 10px; color: rgba(255,255,255,0.6); font-weight:bold;">[x ${itemData.count}]</span>`;
        }

        const selTag = (selectionCount > 0) ? ` <span class="selection-badge" style="color: #ffcc00; font-weight: bold;">[${selectionCount}]</span>` : '';
        const extraBadge = options.badge || '';
        const indent = options.indent || 0;

        const containerStyle = `
            position: relative;
            border-left: 5px solid ${categoryColor};
            padding: 6px 12px;
            background: ${isSelected ? hexToRgba(categoryColor, 0.25) : 'rgba(255,255,255,0.03)'};
            border-radius: 4px;
            margin-bottom: 2px;
            min-width: 160px;
            margin-left: ${indent}px;
            transition: all 0.2s ease;
            ${isSelected ? `box-shadow: inset 0 0 15px ${hexToRgba(categoryColor, 0.2)}, 0 0 10px ${hexToRgba(categoryColor, 0.2)};` : ''}
            border-top: 1px solid ${isSelected ? hexToRgba(categoryColor, 0.4) : 'rgba(255,255,255,0.05)'};
            border-right: 1px solid ${isSelected ? hexToRgba(categoryColor, 0.4) : 'rgba(255,255,255,0.05)'};
            border-bottom: 1px solid ${isSelected ? hexToRgba(categoryColor, 0.4) : 'rgba(255,255,255,0.05)'};
        `;

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
                const mGauge = m.maxCharges ? UIComponents.generateHPGauge(m.charges, m.maxCharges, false, true) : '';
                rows.push(`
                    <div class="rocket-module-row" style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 2px;">
                        <span class="rocket-module-name" style="font-size:10px; color:rgba(255,255,255,0.8);">${m.name}</span>
                        <div style="display:flex; align-items:center;">
                            <span class="inventory-badge" style="font-size:9px; color:rgba(255,255,255,0.5);">[x ${m.count}]</span>
                            <div style="margin-left:8px;">${mGauge}</div>
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

    /**
     * 耐久力ゲージの HTML を生成
     */
    static generateHPGauge(current, max, isEnhanced = false, mini = false) {
        let segments = '';
        for (let i = 0; i < max; i++) {
            const isActive = i < current;
            const enhancedStyle = (isActive && isEnhanced) ? 'background:#ffd700; border-color:#ffd700; box-shadow: 0 0 5px #ffd700;' : '';
            segments += `<div class="hp-segment ${isActive ? 'active' : ''} ${mini ? 'mini' : ''}" style="${enhancedStyle}"></div>`;
        }
        return `<div class="hp-gauge ${isEnhanced ? 'enhanced-frame' : ''} ${mini ? 'mini' : ''}" style="display: flex; gap: 2px; padding: 2px;">${segments}</div>`;
    }
}
