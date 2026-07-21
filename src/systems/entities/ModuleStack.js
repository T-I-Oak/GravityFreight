import Item from './Item.js';
import IDGenerator from '../../core/utils/IDGenerator.js';
import { normalizeLogicNumber } from '../../core/utils/numeric.js';

const ADDITIVE_STATS = ['mass', 'charges', 'maxCharges', 'precision', 'pickupRange', 'power', 'slots'];
const MULTIPLIER_STATS = ['precisionMultiplier', 'pickupMultiplier', 'gravityMultiplier', 'powerMultiplier', 'arcMultiplier'];

class ModuleStack extends Item {
    constructor(item) {
        if (!item?.gameDataRepository) {
            throw new Error('[ModuleStack] item with gameDataRepository is required.');
        }

        super(item.id, item.gameDataRepository);
        this.uid = IDGenerator.generate('modulestack');
        this.items = [];
        this.add(item);
    }

    get count() {
        return this.items.length;
    }

    add(item) {
        if (item.id !== this.id) {
            throw new Error(`[ModuleStack] Cannot add different item id: ${item.id}`);
        }

        this.items.push(item);
        this.#syncDurabilityTotals();
    }

    consumeCharge() {
        const target = this.items
            .filter(item => item.charges > 0)
            .sort((a, b) => a.charges - b.charges)[0];

        if (target) {
            target.consumeCharge(1);
            this.charges = Math.max(0, this.charges - 1);
            return true;
        }

        return false;
    }

    getViewData() {
        const representativeViewData = this.items[0].getViewData();
        const stats = {};

        ADDITIVE_STATS.forEach(key => {
            stats[key] = {
                value: this.items.reduce((total, item) => total + (item[key] ?? 0), 0),
                enhanceCount: this.items.reduce((total, item) => total + (item.enhancement[key] || 0), 0)
            };
        });

        MULTIPLIER_STATS.forEach(key => {
            stats[key] = {
                value: normalizeLogicNumber(this.items.reduce((total, item) => total * (item[key] ?? 1), 1)),
                enhanceCount: this.items.reduce((total, item) => total + (item.enhancement[key] || 0), 0)
            };
        });

        return {
            uid: this.uid,
            id: this.id,
            name: representativeViewData.name,
            category: representativeViewData.category,
            count: this.count,
            stats
        };
    }

    createSnapshot() {
        return {
            uid: this.uid,
            items: this.items.map(item => item.createSnapshot())
        };
    }

    getSnapshot() {
        return this.createSnapshot();
    }

    static fromSnapshot(snapshot, gameDataRepository) {
        const items = snapshot.items.map(itemSnapshot => Item.fromSnapshot(itemSnapshot, gameDataRepository));
        if (items.length === 0) {
            throw new Error('[ModuleStack] Cannot restore empty snapshot.');
        }

        const stack = new ModuleStack(items[0]);
        items.slice(1).forEach(item => stack.add(item));
        stack.uid = snapshot.uid;
        return stack;
    }

    #syncDurabilityTotals() {
        this.charges = this.items.reduce((total, item) => total + item.charges, 0);
        this.maxCharges = this.items.reduce((total, item) => total + item.maxCharges, 0);
    }
}

export default ModuleStack;
