import Item from './Item.js';
import IDGenerator from '../../core/utils/IDGenerator.js';

/**
 * StackedItem クラス
 * 同一特性を持つ Item インスタンスをスタック形式で管理するコンテナ
 */
class StackedItem {
    constructor() {
        this.items = [];
        this.uid = null;
        this.id = null;
    }

    /**
     * スタック数量
     */
    get quantity() {
        return this.items.length;
    }

    /**
     * 代表アイテム（スタックの基準）
     */
    get representative() {
        return this.items.length > 0 ? this.items[0] : null;
    }

    /** プロキシプロパティ **/
    get name() { return this.representative?.name; }
    get category() { return this.representative?.category; }
    get rarity() { return this.representative?.rarity; }
    get description() { return this.representative?.description; }
    
    /**
     * 全性能数値の提供
     */
    get performance() {
        if (!this.representative) return undefined;
        
        // Item クラスの主要な性能数値をオブジェクトとして返す
        return {
            mass: this.representative.mass,
            slots: this.representative.slots,
            precision: this.representative.precision,
            pickupRange: this.representative.pickupRange,
            power: this.representative.power,
            maxCharges: this.representative.maxCharges,
            duration: this.representative.duration,
            precisionMultiplier: this.representative.precisionMultiplier,
            pickupMultiplier: this.representative.pickupMultiplier,
            gravityMultiplier: this.representative.gravityMultiplier,
            powerMultiplier: this.representative.powerMultiplier,
            arcMultiplier: this.representative.arcMultiplier
        };
    }

    /**
     * アイテムをスタックに追加する
     * @param {Item} item 追加するアイテム
     * @returns {boolean} 成功したか
     */
    push(item) {
        if (this.items.length === 0) {
            this.uid = IDGenerator.generate('stack');
            this.id = item.id;
            this.items.push(item);
            return true;
        }

        // 同一特性チェック
        if (item.equals(this.representative)) {
            this.items.push(item);
            return true;
        }

        return false;
    }

    /**
     * スタックからアイテムを取り出す (LIFO)
     * @returns {Item|null} 取り出したアイテム
     */
    pop() {
        if (this.items.length === 0) return null;

        const item = this.items.pop();

        if (this.items.length === 0) {
            this.uid = null;
            this.id = null;
        }

        return item;
    }

    /**
     * スナップショットの取得
     * @returns {Object}
     */
    getSnapshot() {
        return {
            uid: this.uid,
            itemSnapshots: this.items.map(item => item.getSnapshot())
        };
    }

    /**
     * スナップショットからの復元
     * @param {Object} data 
     * @returns {StackedItem}
     */
    static fromSnapshot(data) {
        const stack = new StackedItem();
        
        if (data.itemSnapshots && data.itemSnapshots.length > 0) {
            data.itemSnapshots.forEach(snap => {
                const item = Item.fromSnapshot(snap);
                stack.push(item);
            });
        }

        // 保存されていた UID を反映 (pushで生成されたものを上書き)
        stack.uid = data.uid;
        
        return stack;
    }
}

export default StackedItem;
