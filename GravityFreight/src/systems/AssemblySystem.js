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

        // モジュールデータの取得と合算
        const equippedModules = {};
        for (const [mInstId, count] of Object.entries(sel.modules)) {
            const taken = this.game.inventorySystem.takeItem('modules', mInstId, count);
            if (!taken) continue;

            // 耐久力があるアイテムのみ charges を設定（UI/計算のため）
            if (taken.maxCharges !== undefined && taken.charges === undefined) {
                taken.charges = taken.maxCharges;
            }

            equippedModules[mInstId] = taken;

            // モジュールによるステータス加算
            totalMass += (taken.mass || 0) * count;
            totalSlots += (taken.slots || 0) * count;
            totalPrecision += (taken.precision || 0) * count;
            totalPickupRange += (taken.pickupRange || 0) * count;

            // 倍率補正
            if (taken.precisionMultiplier) {
                for (let i = 0; i < count; i++) totalPrecisionMultiplier *= taken.precisionMultiplier;
            }
            if (taken.pickupMultiplier) {
                for (let i = 0; i < count; i++) totalPickupMultiplier *= taken.pickupMultiplier;
            }
            if (taken.gravityMultiplier) {
                for (let i = 0; i < count; i++) totalGravityMultiplier *= taken.gravityMultiplier;
            }
        }

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
