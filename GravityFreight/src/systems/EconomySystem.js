import { ITEM_REGISTRY } from '../core/Data.js';

export class EconomySystem {
    constructor(game) {
        this.game = game;
    }

    calculateValue(item) {
        if (!item) return 0;

        // master ブランチの事実に基づく実装
        const master = ITEM_REGISTRY[item.id] || item;
        const rarity = item.rarity !== undefined ? item.rarity : (master.rarity || 0);
        const max = item.maxCharges !== undefined ? item.maxCharges : (master.maxCharges || 0);
        const cur = item.charges !== undefined ? item.charges : max;

        // ベース価格 (20/40/60)
        let base = 20;
        if (rarity >= 10) base = 40; // RARITY.UNCOMMON
        if (rarity >= 15) base = 60; // RARITY.RARE

        // 耐久度補正
        const condition = (max > 0) ? (cur + 1) / (max + 1) : 1.0;

        // 強化ボーナス (upgradeCount または enhancementCount を参照)
        const enhancementBonus = (item.upgradeCount || item.enhancementCount || 0) * 0.1;

        return Math.floor(base * condition * (1 + enhancementBonus));
    }

    enhanceItem(item) {
        if (!item) return null;
        if (!item.enhancements) item.enhancements = {};
        item.enhancementCount = (item.enhancementCount || 0) + 1;

        const options = [];
        if (item.precisionMultiplier !== undefined) options.push('precision');
        if (item.pickupMultiplier !== undefined) options.push('pickup');
        if (item.gravityMultiplier !== undefined && item.gravityMultiplier > 0.1) options.push('gravity');
        options.push('slots');
        if (item.maxCharges !== undefined) options.push('charges');

        if (options.length === 0) return `${item.name}: NO STAT CHANGE`;

        const chosen = options[Math.floor(Math.random() * options.length)];
        item.enhancements[chosen] = (item.enhancements[chosen] || 0) + 1;

        let log = "";
        switch (chosen) {
            case 'slots':
                item.slots = (item.slots || 0) + 1;
                log = "SLOTS +1";
                break;
            case 'precision':
                if (item.precisionMultiplier === undefined) item.precisionMultiplier = 1.0;
                item.precisionMultiplier += 0.2;
                log = "PRECISION x" + item.precisionMultiplier.toFixed(1);
                break;
            case 'pickup':
                if (item.pickupMultiplier === undefined) item.pickupMultiplier = 1.0;
                item.pickupMultiplier += 0.2;
                log = "PICKUP x" + item.pickupMultiplier.toFixed(1);
                break;
            case 'gravity':
                if (item.gravityMultiplier === undefined) item.gravityMultiplier = 1.0;
                item.gravityMultiplier = Math.max(0.1, item.gravityMultiplier - 0.1);
                log = "GRAVITY STABILIZED";
                break;
            case 'charges':
                item.maxCharges = (item.maxCharges || 0) + 1;
                item.charges = (item.charges || 0) + 1;
                log = "MAX DURABILITY +1";
                break;
        }
        return `${item.name}: ${log}`;
    }
}
