import Item from './Item.js';
import ModuleStack from './ModuleStack.js';
import IDGenerator from '../../core/utils/IDGenerator.js';
import { normalizeLogicNumber } from '../../core/utils/numeric.js';

const ADDITIVE_STATS = ['mass', 'charges', 'maxCharges', 'precision', 'pickupRange', 'power', 'slots'];
const MULTIPLIER_STATS = ['precisionMultiplier', 'pickupMultiplier', 'gravityMultiplier', 'powerMultiplier', 'arcMultiplier'];
const AGGREGATE_STAT_KEYS = [...ADDITIVE_STATS, ...MULTIPLIER_STATS];

class RocketItem extends Item {
    constructor(chassis, logic, modules = []) {
        if (!chassis?.gameDataRepository || !logic?.gameDataRepository) {
            throw new Error('[RocketItem] chassis and logic with gameDataRepository are required.');
        }

        super(chassis.id, chassis.gameDataRepository);
        AGGREGATE_STAT_KEYS.forEach(key => {
            delete this[key];
        });
        this.uid = IDGenerator.generate('rocketitem');
        this.id = 'rocket';
        this.category = 'rocket';
        this.rarity = 'assembled';
        this.chassis = chassis;
        this.logic = logic;
        this.modules = this.#groupModules(modules);
        this.name = `${chassis.name} ＋ ${logic.name}`;
        this.description = '';
    }

    getMass() {
        return this._sum('mass');
    }

    getSlots() {
        return this._sum('slots');
    }

    getPrecision() {
        return this._sum('precision');
    }

    getPickupRange() {
        return this._sum('pickupRange');
    }

    getPower() {
        return this._sum('power');
    }

    getCharges() {
        return this._sum('charges');
    }

    getMaxCharges() {
        return this._sum('maxCharges');
    }

    getPrecisionMultiplier() {
        return this._multiply('precisionMultiplier');
    }

    getPickupMultiplier() {
        return this._multiply('pickupMultiplier');
    }

    getGravityMultiplier() {
        return this._multiply('gravityMultiplier');
    }

    getPowerMultiplier() {
        return this._multiply('powerMultiplier');
    }

    getArcMultiplier() {
        return this._multiply('arcMultiplier');
    }

    getViewData() {
        const stats = {};

        ADDITIVE_STATS.forEach(key => {
            stats[key] = {
                value: this._getAggregatedStatValue(key),
                enhanceCount: this._sumEnhancements(key)
            };
        });

        MULTIPLIER_STATS.forEach(key => {
            stats[key] = {
                value: this._getAggregatedStatValue(key),
                enhanceCount: this._sumEnhancements(key)
            };
        });

        return {
            uid: this.uid,
            id: this.id,
            name: this.name,
            category: this.category,
            rarity: this.rarity,
            description: this.description,
            stats,
            modules: this.modules.map(module => module.getViewData())
        };
    }

    getCompositionParts() {
        return this._allParts();
    }

    equals(otherItem) {
        if (!(otherItem instanceof RocketItem)) {
            return false;
        }

        return this.#createCompositionKey() === otherItem.#createCompositionKey();
    }

    calculateAppraisalValue() {
        return this.getCompositionParts()
            .reduce((total, item) => total + item.calculateAppraisalValue(), 0);
    }

    createSnapshot() {
        return {
            uid: this.uid,
            chassis: this.chassis.createSnapshot(),
            logic: this.logic.createSnapshot(),
            modules: this.modules.map(module => module.createSnapshot())
        };
    }

    getSnapshot() {
        return this.createSnapshot();
    }

    static fromSnapshot(snapshot, gameDataRepository) {
        const chassis = Item.fromSnapshot(snapshot.chassis, gameDataRepository);
        const logic = Item.fromSnapshot(snapshot.logic, gameDataRepository);
        const rocketItem = new RocketItem(chassis, logic, []);
        rocketItem.modules = snapshot.modules.map(moduleSnapshot => ModuleStack.fromSnapshot(moduleSnapshot, gameDataRepository));
        rocketItem.uid = snapshot.uid;
        return rocketItem;
    }

    #groupModules(modules) {
        const stacks = [];

        modules.forEach(moduleItem => {
            const stack = stacks.find(candidate => candidate.id === moduleItem.id);
            if (stack) {
                stack.add(moduleItem);
            } else {
                stacks.push(new ModuleStack(moduleItem));
            }
        });

        return stacks;
    }

    _allParts() {
        if (!this.chassis || !this.logic || !this.modules) {
            return [];
        }

        return [
            this.chassis,
            this.logic,
            ...this.modules.flatMap(module => module.items)
        ];
    }

    _sum(key) {
        return this._allParts().reduce((total, item) => total + (item[key] ?? 0), 0);
    }

    _multiply(key) {
        return normalizeLogicNumber(this._allParts().reduce((total, item) => total * (item[key] ?? 1), 1));
    }

    _sumEnhancements(key) {
        return this._allParts().reduce((total, item) => total + (item.enhancement?.[key] || 0), 0);
    }

    _getAggregatedStatValue(key) {
        const methodName = `get${key[0].toUpperCase()}${key.slice(1)}`;
        return this[methodName]();
    }

    #createCompositionKey() {
        return JSON.stringify({
            chassis: this.chassis.createSnapshot(),
            logic: this.logic.createSnapshot(),
            modules: this.modules.map(module => module.createSnapshot())
        });
    }
}

export default RocketItem;
