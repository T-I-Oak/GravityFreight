import { ITEM_REGISTRY } from '../core/Data.js';

export class EconomySystem {
    constructor(game) {
        this.game = game;
    }

    calculateValue(item) {
        if (!item) return 0;
        const master = ITEM_REGISTRY[item.id] || item;
        const rarity = item.rarity !== undefined ? item.rarity : (master.rarity || 0);
        const max = item.maxCharges !== undefined ? item.maxCharges : (master.maxCharges || 0);
        const cur = item.charges !== undefined ? item.charges : max;

        // ベース価格 (Spec 7.3.318)
        let base = 20;
        if (rarity === 10) base = 40; // RARITY.UNCOMMON
        if (rarity === 15) base = 60; // RARITY.RARE

        // コンディション補正 (Spec 7.3.319)
        const condition = (max > 0) ? (cur + 1) / (max + 1) : 1.0;
        // 強化ボーナス (Spec 7.3.320)
        const enhancementBonus = (item.enhancementCount || 0) * 0.1;

        return Math.floor(base * condition * (1 + enhancementBonus));
    }

    enhanceItem(item) {
        if (!item) return null;
        item.enhancements = item.enhancements || {};

        const options = ['precision', 'pickup', 'slots']; // ユニバーサル強化項目
        if (item.gravityMultiplier !== undefined && item.gravityMultiplier > 0.1) options.push('gravity');
        if (item.maxCharges !== undefined) options.push('charges');

        const chosen = options[Math.floor(Math.random() * options.length)];
        item.enhancements[chosen] = (item.enhancements[chosen] || 0) + 1;

        let logMessage = "";
        let isRealEnhancement = true;

        switch (chosen) {
            case 'slots':
                item.slots = (item.slots || 0) + 1;
                logMessage = "SLOTS +1";
                break;
            case 'precision':
                item.precisionMultiplier = (item.precisionMultiplier || 1.0) + 0.2;
                logMessage = `PRECISION x${item.precisionMultiplier.toFixed(1)}`;
                break;
            case 'pickup':
                item.pickupMultiplier = (item.pickupMultiplier || 1.0) + 0.2;
                logMessage = `PICKUP x${item.pickupMultiplier.toFixed(1)}`;
                break;
            case 'gravity':
                item.gravityMultiplier = Math.max(0.1, (item.gravityMultiplier || 1.0) - 0.1);
                logMessage = "GRAVITY STABILIZED";
                break;
            case 'charges':
                if (item.charges < item.maxCharges) {
                    item.charges = (item.charges || 0) + 1;
                    logMessage = "DURABILITY REPAIRED";
                    isRealEnhancement = false; // 修理のみの場合は強化カウントしない
                } else {
                    item.maxCharges = (item.maxCharges || 0) + 1;
                    // 最大値向上時は現在値も1回復（実質的な全快状態維持）
                    item.charges = (item.charges || 0) + 1;
                    logMessage = "MAX DURABILITY +1";
                    isRealEnhancement = true;
                }
                break;
        }

        if (isRealEnhancement) {
            item.enhancementCount = (item.enhancementCount || 0) + 1;
        }

        return `✦ ${isRealEnhancement ? 'ENHANCED' : 'REPAIRED'}: ${item.name} (${logMessage})`;
    }
}
