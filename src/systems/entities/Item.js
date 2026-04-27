import DataManager from '../../core/DataManager.js';

/**
 * Item クラス
 * ロケット構成パーツおよび発射装備の基体となるエンティティ
 */
class Item {
    #master;

    constructor(masterId) {
        this.#master = DataManager.getItemById(masterId);
        
        // 識別子生成
        this.uid = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        this.id = this.#master.id;
        
        // 強化関連初期化
        this.enhancement = {};
        this.enhancementCount = 0;

        // 表示・基本情報
        this.name = this.#master.name;
        this.category = this.#master.category;
        this.rarity = this.#master.rarity;
        this.description = this.#master.description;
        
        // 加算系プロパティ (デフォルト 0)
        this.mass = this.#master.mass ?? 0;
        this.slots = this.#master.slots ?? 0;
        this.precision = this.#master.precision ?? 0;
        this.pickupRange = this.#master.pickupRange ?? 0;
        this.power = this.#master.power ?? 0;
        this.maxCharges = this.#master.maxCharges ?? 0;
        this.duration = this.#master.duration ?? 0;
        
        // 乗算系プロパティ (デフォルト 1.0)
        this.precisionMultiplier = this.#master.precisionMultiplier ?? 1.0;
        this.pickupMultiplier = this.#master.pickupMultiplier ?? 1.0;
        this.gravityMultiplier = this.#master.gravityMultiplier ?? 1.0;
        this.powerMultiplier = this.#master.powerMultiplier ?? 1.0;
        this.arcMultiplier = this.#master.arcMultiplier ?? 1.0;
        
        // フラグ・特殊 (デフォルト false / 文字列)
        this.onLostBonus = this.#master.onLostBonus ?? false;
        this.ghostType = this.#master.ghostType; // 仕様では特にデフォルト指定なし。undefinedならそのまま
        this.preventsLauncherWear = this.#master.preventsLauncherWear ?? false;

        // 初期状態の耐久度
        this.charges = this.maxCharges;
    }

    /**
     * 同性能判定
     * @param {Item} otherItem 比較対象のアイテム
     * @returns {boolean} 完全に同性能なら true
     */
    equals(otherItem) {
        if (!otherItem || !(otherItem instanceof Item)) return false;
        
        return this.id === otherItem.id &&
               this.charges === otherItem.charges &&
               this.maxCharges === otherItem.maxCharges &&
               this.mass === otherItem.mass &&
               this.slots === otherItem.slots &&
               this.precision === otherItem.precision &&
               this.pickupRange === otherItem.pickupRange &&
               this.power === otherItem.power &&
               this.precisionMultiplier === otherItem.precisionMultiplier &&
               this.pickupMultiplier === otherItem.pickupMultiplier &&
               this.gravityMultiplier === otherItem.gravityMultiplier &&
               this.powerMultiplier === otherItem.powerMultiplier &&
               this.arcMultiplier === otherItem.arcMultiplier;
    }

    /**
     * 耐久度の回復
     * @param {number} amount 回復量
     * @returns {number} 更新後の耐久度
     */
    repair(amount = 1) {
        this.charges = Math.min(this.maxCharges, this.charges + amount);
        return this.charges;
    }

    /**
     * 耐久度の消費
     * @param {number} amount 消費量
     * @returns {number} 更新後の耐久度
     */
    consumeCharge(amount = 1) {
        this.charges = Math.max(0, this.charges - amount);
        return this.charges;
    }
}

export default Item;
