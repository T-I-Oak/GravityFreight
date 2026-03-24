// レアリティの定数定義
export const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(255, 255, 255, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const RARITY = {
    COMMON: 5,
    UNCOMMON: 10,
    RARE: 15
};

// カテゴリ別のイメージカラー定義
export const CATEGORY_COLORS = {
    CHASSIS: '#ffab40',
    LOGIC: '#00bcd4',
    MODULES: '#9c27b0',
    LAUNCHERS: '#4caf50',
    BOOSTERS: '#795548',
    // 配送用貨物カテゴリ
    CARGO_SAFE: '#00e676',   // Green
    CARGO_NORMAL: '#2979ff', // Blue
    CARGO_DANGER: '#ff1744', // Red
    UNIT: '#e0e0ff'          // White/Blue for rocket units
};

export const PARTS = {
    CHASSIS: [
        { id: 'hull_light', category: 'CHASSIS', name: '軽量シャーシ', mass: 3, slots: 0, precision: 100, pickupRange: 0, rarity: RARITY.COMMON, description: '性能重視の軽量体。重力の影響を受けやすい。' },
        { id: 'hull_medium', category: 'CHASSIS', name: '標準シャーシ', mass: 8, slots: 1, precision: 100, pickupRange: 0, rarity: RARITY.COMMON, description: '汎用性の高い標準体。1スロット。' },
        { id: 'hull_heavy', category: 'CHASSIS', name: '堅牢シャーシ', mass: 18, slots: 2, precision: 100, pickupRange: 0, rarity: RARITY.COMMON, description: '堅牢な重厚体。2スロット。' }
    ],
    LOGIC: [
        { id: 'sensor_short', category: 'LOGIC', name: '広域回収ロジック', mass: 1, slots: 0, precision: 150, pickupRange: 80, pickupMultiplier: 1.2, rarity: RARITY.COMMON, description: '物資回収に特化した広域収集型。予測精度は低い。' },
        { id: 'sensor_normal', category: 'LOGIC', name: '標準航法ロジック', mass: 1, slots: 0, precision: 250, pickupRange: 40, pickupMultiplier: 1.1, rarity: RARITY.COMMON, description: '汎用性の高い標準的な予測精度を持つロジック。' },
        { id: 'sensor_long', category: 'LOGIC', name: '精密予測ロジック', mass: 1, slots: 0, precision: 600, precisionMultiplier: 1.1, pickupRange: 20, rarity: RARITY.COMMON, description: '長距離の軌道予測に特化した高精度演算ユニット。取得範囲は限定的。' }
    ],
    LAUNCHERS: [
        { id: 'pad_standard', category: 'LAUNCHERS', name: '標準発射台', power: 1200, maxCharges: 2, mass: 1, slots: 0, precision: 0, rarity: RARITY.COMMON, description: '標準的な初期加速。' },
        { id: 'pad_precision', category: 'LAUNCHERS', name: '精密発射台', power: 1000, maxCharges: 2, mass: 1, slots: 0, precision: 0, precisionMultiplier: 1.05, rarity: RARITY.COMMON, description: '低速だが安定した小回りが可能な安定型。' }
    ],
    MODULES: [
        { id: 'mod_capacity', category: 'MODULES', name: 'スロット拡張基板', mass: 1, slots: 2, rarity: RARITY.UNCOMMON, description: '拡張スロットを2つ追加する。重量が増加する。' },
        { id: 'mod_star_breaker', category: 'MODULES', name: 'スター・ブレイカー', mass: 2, maxCharges: 2, rarity: RARITY.RARE, description: '衝突の瞬間、チャージを消費して星を破壊し、クラッシュを回避する。' },
        { id: 'mod_cushion', category: 'MODULES', name: 'インパクト・クッション', mass: 1, maxCharges: 1, rarity: RARITY.RARE, description: '衝突時、チャージを消費してバウンドし、破壊を防ぐ。' },
        { id: 'mod_emergency', category: 'MODULES', name: '緊急スラスター', mass: 1, maxCharges: 1, rarity: RARITY.RARE, description: '境界線での消失(LOST)を防ぎ、コース内へ逆噴射する。' },
        { id: 'mod_stabilizer', category: 'MODULES', name: '軌道安定化装置', mass: 1, gravityMultiplier: 0.8, rarity: RARITY.RARE, description: '重力の影響を0.8倍に軽減し、軌道を安定させる。' },
        { id: 'mod_analyzer', category: 'MODULES', name: 'オービット・アナリスト', mass: 1, precisionMultiplier: 1.2, rarity: RARITY.UNCOMMON, description: '高度な軌道計算アルゴリズムを搭載し、予測精度を1.2倍に強化する。' }
    ],
    BOOSTERS: [
        { id: 'opt_fuel', category: 'BOOSTERS', name: '高反応燃料', mass: 1, slots: 0, rarity: RARITY.UNCOMMON, description: 'Launcherの摩耗を防ぎ、耐久減少を自動で無効化する。' },
        { id: 'boost_magnet', category: 'BOOSTERS', name: 'マグネティック・パルス', mass: 1, slots: 0, rarity: RARITY.RARE, description: '航行時間とともにアイテム回収範囲が徐々に拡大する。' },
        { id: 'boost_expander', category: 'BOOSTERS', name: 'ゴール・エクスパンダー', mass: 1, slots: 0, arcMultiplier: 1.2, rarity: RARITY.RARE, description: '出口（アーク）のサイズを1.2倍に拡大する。' }
    ],
    CARGO: [
        { id: 'cargo_safe', category: 'CARGO_SAFE', name: 'セーフ・カーゴ', mass: 1, description: '安全区域への配送用荷物。' },
        { id: 'cargo_normal', category: 'CARGO_NORMAL', name: 'ノーマル・カーゴ', mass: 2, description: '通常区域への配送用荷物。' },
        { id: 'cargo_danger', category: 'CARGO_DANGER', name: 'デンジャー・カーゴ', mass: 4, description: '危険区域への配送用荷物。' }
    ]
};

// 初期所持アイテムの定義 (数量管理)
export const INITIAL_INVENTORY = {
    chassis: [
        { id: 'hull_light', count: 1 },
        { id: 'hull_medium', count: 1 }
    ],
    logic: [
        { id: 'sensor_short', count: 1 },
        { id: 'sensor_normal', count: 1 }
    ],
    launchers: [
        { id: 'pad_standard', charges: 2 },
        { id: 'pad_precision', charges: 2 }
    ],
    modules: [
        { id: 'mod_analyzer', count: 1 }
    ],
    boosters: [
        { id: 'opt_fuel', count: 1 }
    ]
};
