import { ITEM_REGISTRY } from '../core/Data.js';

export class AssemblySystem {
    constructor(game) {
        this.game = game;
    }

    assembleRocket() {
        const sel = this.game.selection;
        if (!sel.chassis || !sel.logic) return;

        // スタックを先に取り出し、taken 個体をそのままロケット側に載せる。
        // これにより、インベントリ側の残りスタックは再採番され、instanceId 衝突を防げる。
        const chassisTaken = this.game.inventorySystem.takeItem('chassis', sel.chassis.instanceId);
        const logicTaken = this.game.inventorySystem.takeItem('logic', sel.logic.instanceId);
        if (!chassisTaken || !logicTaken) return;

        // ステータス合算（取り出した1個体分の合算）
        let totalMass = (chassisTaken.mass || 0) + (logicTaken.mass || 0);
        let totalSlots = (chassisTaken.slots || 0) + (logicTaken.slots || 0);
        let totalPrecision = (chassisTaken.precision || 0) + (logicTaken.precision || 0);
        let totalPrecisionMultiplier = (chassisTaken.precisionMultiplier || 1) * (logicTaken.precisionMultiplier || 1);
        let totalPickupRange = (chassisTaken.pickupRange || 0) + (logicTaken.pickupRange || 0);
        let totalPickupMultiplier = (chassisTaken.pickupMultiplier || 1) * (logicTaken.pickupMultiplier || 1);
        let totalGravityMultiplier = (chassisTaken.gravityMultiplier || 1) * (logicTaken.gravityMultiplier || 1);
        let arcMultiplier = 1.0;

            // モジュールを個別の個体（count: 1）として展開して登録
            const equippedModules = [];
            for (const [mInstId, count] of Object.entries(sel.modules)) {
                for (let i = 0; i < count; i++) {
                    const taken = this.game.inventorySystem.takeItem('modules', mInstId, 1, { keepSourceId: true });
                    if (taken) equippedModules.push(taken);
                }
            }

            // 合算計算（展開後の配列を元に算出）
            equippedModules.forEach(m => {
                totalMass += (m.mass || 0);
                totalSlots += (m.slots || 0);
                totalPrecision += (m.precision || 0);
                totalPickupRange += (m.pickupRange || 0);
                if (m.precisionMultiplier) totalPrecisionMultiplier *= m.precisionMultiplier;
                if (m.pickupMultiplier) totalPickupMultiplier *= m.pickupMultiplier;
                if (m.gravityMultiplier) totalGravityMultiplier *= m.gravityMultiplier;
            });

        const rocket = {
            id: 'assembled_rocket',
            name: `${chassisTaken.name}-${logicTaken.name}`,
            category: 'ROCKETS',
            chassis: chassisTaken,
            logic: logicTaken,
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

        // 選択解除
        this.game.selection.chassis = null;
        this.game.selection.logic = null;
        this.game.selection.modules = {};
        
        this.game.isFactoryOpen = false;
        this.game.checkReadyToAim();
        this.game.updateUI();
    }

    /**
     * 現在のスロット使用状況と合計容量を計算
     */
    getModuleSlotStatus(targetModuleInstId = null, targetModuleIncrease = 0) {
        const sel = this.game.selection;
        let total = 0;
        let used = 0;

        // 供給元1: Chassis
        if (sel.chassis) total += (sel.chassis.slots || 0);
        // 供給元2: Logic (将来的な拡張や規定に準拠)
        if (sel.logic) total += (sel.logic.slots || 0);

        // 供給元3: 各モジュールのカウントと追加スロット
        for (const [mInstId, count] of Object.entries(sel.modules)) {
            const optInst = this.game.inventory.modules.find(o => o.instanceId === mInstId);
            let currentCount = count;
            
            // 指定されたモジュールの場合は、将来の予測値（targetModuleIncrease分）を検討に含める
            if (mInstId === targetModuleInstId) {
                currentCount += targetModuleIncrease;
            }
            
            if (optInst) total += (optInst.slots || 0) * currentCount;
            used += currentCount;
        }
        
        // 未選択のモジュールをクリックした場合の予測用
        if (targetModuleInstId && !sel.modules[targetModuleInstId]) {
            const optInst = this.game.inventory.modules.find(o => o.instanceId === targetModuleInstId);
            if (optInst) total += (optInst.slots || 0) * targetModuleIncrease;
            used += targetModuleIncrease;
        }

        return { used, total, overflow: used - total };
    }

    validateModules() {
        if (!this.game.selection.chassis) return;

        const status = this.getModuleSlotStatus();
        let overflow = status.overflow;

        if (overflow > 0) {
            // 超過分を削除 (登録順の逆から削る)
            const sel = this.game.selection;
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
