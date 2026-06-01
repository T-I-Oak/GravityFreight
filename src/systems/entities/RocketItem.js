import Item from './Item.js';
import ModuleStack from './ModuleStack.js';
import IDGenerator from '../../core/utils/IDGenerator.js';

const ADDITIVE_STATS = ['mass', 'charges', 'maxCharges', 'precision', 'pickupRange', 'power', 'slots'];
const MULTIPLIER_STATS = ['precisionMultiplier', 'pickupMultiplier', 'gravityMultiplier', 'powerMultiplier', 'arcMultiplier'];

class RocketItem extends Item {
    constructor(chassis, logic, modules = []) {
        if (!chassis?.gameDataRepository || !logic?.gameDataRepository) {
            throw new Error('[RocketItem] chassis and logic with gameDataRepository are required.');
        }

        super(chassis.id, chassis.gameDataRepository);
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

    get mass() {
        return this._sum('mass');
    }

    set mass(_value) {}

    get slots() {
        return this._sum('slots');
    }

    set slots(_value) {}

    get precision() {
        return this._sum('precision');
    }

    set precision(_value) {}

    get pickupRange() {
        return this._sum('pickupRange');
    }

    set pickupRange(_value) {}

    get power() {
        return this._sum('power');
    }

    set power(_value) {}

    get charges() {
        return this._sum('charges');
    }

    set charges(_value) {}

    get maxCharges() {
        return this._sum('maxCharges');
    }

    set maxCharges(_value) {}

    get precisionMultiplier() {
        return this._multiply('precisionMultiplier');
    }

    set precisionMultiplier(_value) {}

    get pickupMultiplier() {
        return this._multiply('pickupMultiplier');
    }

    set pickupMultiplier(_value) {}

    get gravityMultiplier() {
        return this._multiply('gravityMultiplier');
    }

    set gravityMultiplier(_value) {}

    get powerMultiplier() {
        return this._multiply('powerMultiplier');
    }

    set powerMultiplier(_value) {}

    get arcMultiplier() {
        return this._multiply('arcMultiplier');
    }

    set arcMultiplier(_value) {}

    getViewData() {
        const stats = {};

        ADDITIVE_STATS.forEach(key => {
            stats[key] = {
                value: this[key],
                enhanceCount: this._sumEnhancements(key)
            };
        });

        MULTIPLIER_STATS.forEach(key => {
            stats[key] = {
                value: this[key],
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
            modules: [
                this.chassis.getViewData(),
                this.logic.getViewData(),
                ...this.modules.map(module => module.getViewData())
            ]
        };
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
        return this._allParts().reduce((total, item) => total * (item[key] ?? 1), 1);
    }

    _sumEnhancements(key) {
        return this._allParts().reduce((total, item) => total + (item.enhancement?.[key] || 0), 0);
    }
}

export default RocketItem;
