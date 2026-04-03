import { INITIAL_INVENTORY, ITEM_REGISTRY } from '../core/Data.js';
import { ItemUtils } from '../utils/ItemUtils.js';

export class InventorySystem {
    constructor(game) {
        this.game = game;
        this.initStartingInventory();
    }

    initStartingInventory() {
        // INITIAL_INVENTORY は ID と数量のみなので、ITEM_REGISTRY から詳細をマージする
        this.inventory = {};
        for (const [cat, items] of Object.entries(INITIAL_INVENTORY)) {
            const list = Array.isArray(items) ? items : Object.values(items);
            this.inventory[cat] = list.map(item => ({
                ...ITEM_REGISTRY[item.id],
                ...item
            }));
        }
        if (!this.inventory.rockets) this.inventory.rockets = [];
        this._initInstanceIds();
        
        // Game クラス側の参照も同期させる (fullReset 時のため)
        this.game.inventory = this.inventory;
    }

    _initInstanceIds() {
        ['chassis', 'logic', 'launchers', 'modules', 'boosters', 'rockets'].forEach(cat => {
            if (this.inventory[cat]) {
                if (Array.isArray(this.inventory[cat])) {
                    this.inventory[cat].forEach(item => this._ensureInstanceId(item));
                } else if (typeof this.inventory[cat] === 'object') {
                    // modules might be key-value in some contexts, but INITIAL_INVENTORY should be array or handled
                    Object.values(this.inventory[cat]).forEach(item => this._ensureInstanceId(item));
                }
            }
        });
    }

    _ensureInstanceId(item) {
        if (!item.instanceId) {
            item.instanceId = `inst_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        }
        return item.instanceId;
    }

    _reassignInstanceId(item) {
        item.instanceId = `inst_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        return item.instanceId;
    }

    addItem(item) {
        const category = (item.category || '').toLowerCase();
        const list = this.inventory[category];
        if (!list) return;

        this._ensureInstanceId(item);

        // 重複スタックの判定（共通ロジックを使用）
        const existing = list.find(i => ItemUtils.areItemsEquivalent(i, item));

        if (existing) {
            existing.count = (existing.count || 1) + (item.count || 1);
        } else {
            if (item.count === undefined) item.count = 1;
            list.push(item);
        }
    }

    removeItem(category, instanceId) {
        return Boolean(this.takeItem(category, instanceId));
    }

    takeItem(category, instanceId, takeCount = 1) {
        const cat = this._getCategory(category);
        const list = this.inventory[cat];
        if (!list) return null;

        const idx = list.findIndex(i => i.instanceId === instanceId);
        if (idx === -1) return null;

        const current = list[idx];
        const currentCount = current.count !== undefined ? current.count : 1;
        const actualTake = Math.min(currentCount, takeCount);
        if (actualTake <= 0) return null;

        // 取り出した側は「元の instanceId を保持」する
        const taken = { ...current, count: actualTake };

        const remainingCount = currentCount - actualTake;
        if (remainingCount > 0) {
            current.count = remainingCount;
            this._reassignInstanceId(current);
        } else {
            list.splice(idx, 1);
        }

        return taken;
    }

    selectPart(type, instanceId) {
        const cat = this._getCategory(type);
        const list = this.inventory[cat];
        if (!list) return;
        const item = list.find(i => i.instanceId === instanceId);
        if (item) {
            this.game.selection[type] = item;
            this.game.checkReadyToAim();
            this.game.validateModules();
            this.game.updateUI();
        }
    }

    selectOption(optId, count) {
        if (!this.game.selection.modules) this.game.selection.modules = {};
        if (count > 0) {
            this.game.selection.modules[optId] = count;
        } else {
            delete this.game.selection.modules[optId];
        }
        this.game.validateModules();
        this.game.updateUI();
    }

    _getCategory(cat) {
        if (!cat) return '';
        const c = cat.toLowerCase();
        if (c === 'launcher') return 'launchers';
        if (c === 'rocket') return 'rockets';
        if (c === 'booster') return 'boosters';
        if (c === 'module') return 'modules';
        return c;
    }
}
