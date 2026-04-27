/**
 * IDGenerator ユーティリティ
 * 一意な識別子 (UID) を生成するための共通クラス
 */
class IDGenerator {
    /**
     * 一意な UID を生成する
     * @param {string} prefix プレフィックス (デフォルト: 'entity')
     * @returns {string} 生成された UID
     */
    static generate(prefix = 'entity') {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 11);
        return `${prefix}_${timestamp}_${randomStr}`;
    }
}

export default IDGenerator;
