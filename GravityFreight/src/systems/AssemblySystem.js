import { ITEM_REGISTRY } from '../core/Data.js';

export class AssemblySystem {
    constructor(game) {
        this.game = game;
    }

    assembleRocket() {
        const sel = this.game.selection;
        if (!sel.chassis || !sel.logic) return;

        const chassis = sel.chassis;
        const logic = sel.logic;

        // ステータス合算
        let totalMass = (chassis.mass || 0) + (logic.mass || 0);
        let totalSlots = (chassis.slots || 0) + (logic.slots || 0);
        let totalPrecision = (chassis.precision || 0) + (logic.precision || 0);
        let totalPrecisionMultiplier = (chassis.precisionMultiplier || 1) * (logic.precisionMultiplier || 1);
        let totalPickupRange = (chassis.pickupRange || 0) + (logic.pickupRange || 0);
        let totalPickupMultiplier = (chassis.pickupMultiplier || 1) * (logic.pickupMultiplier || 1);
        let totalGravityMultiplier = (chassis.gravityMultiplier || 1) * (logic.gravityMultiplier || 1);
        let arcMultiplier = 1.0;

        // モジュールデータのクローンと合算
        const equippedModules = {};
        for (const [mInstId, count] of Object.entries(sel.modules)) {
            const mData = this.game.inventory.modules.find(m => m.instanceId === mInstId);
            if (mData) {
                equippedModules[mInstId] = { 
                    ...mData, 
                    count: count,
                    charges: (mData.charges !== undefined) ? mData.charges : (mData.maxCharges || 0)
                };
                // モジュールによるステータス加算
                totalMass += (mData.mass || 0) * count;
                totalSlots += (mData.slots || 0) * count;
                totalPrecision += (mData.precision || 0) * count;
                totalPickupRange += (mData.pickupRange || 0) * count;
                
                // 倍率補正
                if (mData.precisionMultiplier) {
                    for (let i = 0; i < count; i++) totalPrecisionMultiplier *= mData.precisionMultiplier;
                }
                if (mData.pickupMultiplier) {
                    for (let i = 0; i < count; i++) totalPickupMultiplier *= mData.pickupMultiplier;
                }
                if (mData.gravityMultiplier) {
                    for (let i = 0; i < count; i++) totalGravityMultiplier *= mData.gravityMultiplier;
                }
            }
        }

        const rocket = {
            id: 'assembled_rocket',
            name: `${chassis.name}-${logic.name}`,
            category: 'ROCKETS',
            chassis: { ...chassis },
            logic: { ...logic },
            modules: equippedModules,
            mass: totalMass,
            slots: totalSlots,
            totalPrecision: totalPrecision, // Game.js の予測線計算で totalPrecision を参照している
            precisionMultiplier: totalPrecisionMultiplier,
            pickupRange: totalPickupRange,
            pickupMultiplier: totalPickupMultiplier,
            gravityMultiplier: totalGravityMultiplier,
            arcMultiplier: arcMultiplier,
            instanceId: `rocket_${Date.now()}`
        };

        this.game.inventory.rockets.push(rocket);
        
        // インベントリから消費
        this.game.inventorySystem.removeItem('chassis', chassis.instanceId);
        this.game.inventorySystem.removeItem('logic', logic.instanceId);
        for (const [mInstId, count] of Object.entries(sel.modules)) {
            // モジュールはスタックされている可能性があるため、指定回数分削除
            for (let i = 0; i < count; i++) {
                this.game.inventorySystem.removeItem('modules', mInstId);
            }
        }

        // 選択解除
        this.game.selection.chassis = null;
        this.game.selection.logic = null;
        this.game.selection.modules = {};
        
        this.game.isFactoryOpen = false;
        this.game.checkReadyToAim();
        this.game.updateUI();
    }

    validateModules() {
        const sel = this.game.selection;
        if (!sel.chassis) return;

        const baseSlots = sel.chassis.slots || 0;
        let extraSlots = 0;
        let usedCount = 0;

        // 現在の状態を確認
        for (const [mInstId, count] of Object.entries(sel.modules)) {
            const optInst = this.game.inventory.modules.find(o => o.instanceId === mInstId);
            if (optInst) extraSlots += (optInst.slots || 0) * count;
            usedCount += count;
        }

        let overflow = usedCount - (baseSlots + extraSlots);
        if (overflow > 0) {
            // 超過分を削除 (登録順の逆から削る)
            const optIds = Object.keys(sel.modules);
            for (let i = optIds.length - 1; i >= 0 && overflow > 0; i--) {
                const oid = optIds[i];
                let count = sel.modules[oid];
                const toRemove = Math.min(count, overflow);
                sel.modules[oid] -= toRemove;
                if (sel.modules[oid] <= 0) delete sel.modules[oid];
                overflow -= toRemove;
            }
        }
    }
}
