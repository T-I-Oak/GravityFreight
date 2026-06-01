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

    get count() {
        return this.quantity;
    }

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
    createSnapshot() {
        return {
            uid: this.uid,
            items: this.items.map(item => item.createSnapshot())
        };
    }

    getSnapshot() {
        return this.createSnapshot();
    }

    /**
     * スナップショットからの復元
     * @param {Object} data 
     * @returns {StackedItem}
     */
    static fromSnapshot(data, gameDataRepository) {
        const stack = new StackedItem();
        
        const itemSnapshots = data.items || data.itemSnapshots || [];
        if (itemSnapshots.length > 0) {
            itemSnapshots.forEach(snap => {
                const item = Item.fromSnapshot(snap, gameDataRepository);
                stack.push(item);
            });
        }

        // 保存されていた uid で上書き
        stack.uid = data.uid;
        
        return stack;
    }
}

export default StackedItem;
