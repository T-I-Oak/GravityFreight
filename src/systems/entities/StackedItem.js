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
        this.name = undefined;
        this.category = undefined;
        this.rarity = undefined;
        this.description = undefined;
        this.performance = undefined;
    }

    /**
     * アイテムをスタックに追加する
     * @param {Item} item 追加するアイテム
     * @returns {boolean} 成功したか
     */
    push(item) {
        if (this.items.length === 0) {
            // 固有の uid を生成して設定する
            this.uid = IDGenerator.generate('stack');
            // item.id を自身の id として設定する
            this.id = item.id;
            // items 配列に item を追加する
            this.items.push(item);
            // representative を設定する（items[0]）
            this.representative = this.items[0];
            
            // プロパティの設定
            this.quantity = this.items.length;
            this.name = this.representative.name;
            this.category = this.representative.category;
            this.rarity = this.representative.rarity;
            this.description = this.representative.description;
            this.performance = this.representative; // 代表アイテムの値をそのまま提供する

            return true;
        }

        // 一致すれば、items 配列に追加
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

        // スタックが空になった場合は uid, id, representative をリセット（null）する
        if (this.items.length === 0) {
            this.uid = null;
            this.id = null;
            this.representative = null;
            this.name = undefined;
            this.category = undefined;
            this.rarity = undefined;
            this.description = undefined;
            this.performance = undefined;
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

        // 保存されていた data.uid で自身の uid を上書きする
        stack.uid = data.uid;
        
        return stack;
    }
}

export default StackedItem;
