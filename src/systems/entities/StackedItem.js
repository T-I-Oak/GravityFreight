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
        this.quantity = 0;
        this.representative = null;
    }

    /** 特性プロパティ (representative の値を参照) **/
    get name() { return this.representative?.name; }
    get category() { return this.representative?.category; }
    get rarity() { return this.representative?.rarity; }
    get description() { return this.representative?.description; }
    get performance() { return this.representative || undefined; }

    /**
     * アイテムをスタックに追加する
     * @param {Item} item 追加するアイテム
     * @returns {boolean} 成功したか
     */
    push(item) {
        if (this.items.length === 0) {
            // 初期設定
            this.uid = IDGenerator.generate('stack');
            this.id = item.id;
            this.representative = item;
            this.items.push(item);
            this.quantity = this.items.length;
            return true;
        }

        // 特性の一致確認
        if (item.equals(this.representative)) {
            this.items.push(item);
            this.quantity = this.items.length;
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
        this.quantity = this.items.length;

        // スタックが空になった場合はリセット
        if (this.items.length === 0) {
            this.uid = null;
            this.id = null;
            this.representative = null;
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

        // 保存されていた uid で上書き
        stack.uid = data.uid;
        
        return stack;
    }
}

export default StackedItem;
