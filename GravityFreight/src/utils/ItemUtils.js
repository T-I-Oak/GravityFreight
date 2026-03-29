export class ItemUtils {
    /**
     * 2つのアイテムが「実質的に同一」であるか（スタック可能か）を判定します。
     * IDに加え、耐久度（charges）と強化内容（enhancements）を比較します。
     */
    static areItemsEquivalent(itemA, itemB) {
        if (!itemA || !itemB) return false;
        if (itemA.id !== itemB.id) return false;

        // 耐久度の比較（片方が undefined の場合は無視するか、一致とみなす）
        const chargesA = itemA.charges !== undefined ? itemA.charges : -1;
        const chargesB = itemB.charges !== undefined ? itemB.charges : -1;
        if (chargesA !== chargesB) return false;

        // 強化内容の比較（シリアライズして比較）
        const enhA = JSON.stringify(itemA.enhancements || {});
        const enhB = JSON.stringify(itemB.enhancements || {});
        if (enhA !== enhB) return false;

        return true;
    }

    /**
     * アイテムの配列を、同一パラメータのものを [x N] でまとめた配列に変換します。
     * 各要素には元のアイテムプロパティに加え、'count' および 'instances' 配列が付与されます。
     */
    static groupItems(items) {
        const groups = [];
        if (!Array.isArray(items)) return groups;

        items.forEach(item => {
            if (!item || !item.id) return;

            let group = groups.find(g => this.areItemsEquivalent(g, item));
            
            if (!group) {
                // 初回出現時はクローンを作成してグループに追加
                group = { 
                    ...item, 
                    count: 0, 
                    instances: [] 
                };
                groups.push(group);
            }
            
            // カウントを合算（アイテム自体が既に count を持っている場合も考慮）
            const addCount = item.count !== undefined ? item.count : 1;
            group.count += addCount;
            group.instances.push(item);
        });

        return groups;
    }
}
