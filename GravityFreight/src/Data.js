// カテゴリ別のイメージカラー定義
export const CATEGORY_COLORS = {
    CHASSIS: '#ffab40',
    LOGIC: '#00bcd4',
    MODULES: '#9c27b0',
    ACCELERATORS: '#4caf50',
    BOOSTERS: '#795548',
    // 配送用貨物カテゴリ
    CARGO_SAFE: '#00e676',   // Green
    CARGO_NORMAL: '#2979ff', // Blue
    CARGO_DANGER: '#ff1744'  // Red
};

export const PARTS = {
    CHASSIS: [
        { id: 'hull_light', name: 'Lite Chassis', mass: 3, slots: 0, precision: 100, precisionMultiplier: 1.0, pickupRange: 0, pickupMultiplier: 1.0, appearanceRate: 10, color: 'rgba(255, 171, 64, 0.15)', description: '性能重視の軽量体。重力の影響を受けやすい。' },
        { id: 'hull_medium', name: 'Standard Chassis', mass: 8, slots: 1, precision: 100, precisionMultiplier: 1.0, pickupRange: 0, pickupMultiplier: 1.0, appearanceRate: 10, color: 'rgba(255, 171, 64, 0.15)', description: '汎用性の高い標準体。1スロット。' },
        { id: 'hull_heavy', name: 'Tough Chassis', mass: 18, slots: 2, precision: 100, precisionMultiplier: 1.0, pickupRange: 0, pickupMultiplier: 1.0, appearanceRate: 10, color: 'rgba(255, 171, 64, 0.15)', description: '堅牢な重厚体。2スロット。' }
    ],
    LOGIC: [
        { id: 'sensor_short', name: 'Entry Logic', mass: 1, slots: 0, precision: 150, precisionMultiplier: 0.0, pickupRange: 80, pickupMultiplier: 0.2, appearanceRate: 10, color: 'rgba(0, 188, 212, 0.15)', description: '取得範囲と倍率が高い広域収集型。予測精度は低い。' },
        { id: 'sensor_normal', name: 'Sync Logic', mass: 1, slots: 0, precision: 250, precisionMultiplier: 0.0, pickupRange: 40, pickupMultiplier: 0.1, appearanceRate: 10, color: 'rgba(0, 188, 212, 0.15)', description: '標準的な予測精度を持つ同期ユニット。' },
        { id: 'sensor_long', name: 'Deep Logic', mass: 1, slots: 0, precision: 4500, precisionMultiplier: 0.1, pickupRange: 20, pickupMultiplier: 0.0, appearanceRate: 10, color: 'rgba(0, 188, 212, 0.15)', description: '超長距離予測に特化した高精度演算ユニット。取得範囲は限定的。' }
    ],
    ACCELERATORS: [
        { id: 'pad_standard', name: 'Standard Accelerator', power: 1200, maxCharges: 2, mass: 1, slots: 0, precision: 0, precisionMultiplier: 0.0, pickupRange: 0, pickupMultiplier: 0.0, appearanceRate: 10, color: 'rgba(76, 175, 80, 0.15)', description: '標準的な初期加速。' },
        { id: 'pad_precision', name: 'Steady Accelerator', power: 1000, maxCharges: 2, mass: 1, slots: 0, precision: 0, precisionMultiplier: 0.05, pickupRange: 0, pickupMultiplier: 0.0, appearanceRate: 10, color: 'rgba(76, 175, 80, 0.15)', description: '低速だが安定した射出が可能な安定型。' }
    ],
    MODULES: [
        { id: 'mod_capacity', name: 'Slot Expander', mass: 1, slots: 2, appearanceRate: 10, color: 'rgba(156, 39, 176, 0.15)', description: '拡張スロットを2つ追加する。重量が増加する。' },
        { id: 'mod_star_breaker', name: 'Star Breaker', mass: 2, slots: 1, maxCharges: 2, appearanceRate: 5, color: 'rgba(255, 87, 34, 0.15)', description: '衝突の瞬間、チャージを消費して星を破壊し、クラッシュを回避する。' },
        { id: 'mod_cushion', name: 'Impact Cushion', mass: 1, slots: 1, maxCharges: 1, appearanceRate: 5, color: 'rgba(156, 39, 176, 0.15)', description: '衝突時、チャージを消費してバウンドし、破壊を防ぐ。' },
        { id: 'mod_emergency', name: 'Emergency Thruster', mass: 1, slots: 1, maxCharges: 1, appearanceRate: 5, color: 'rgba(255, 193, 7, 0.15)', description: '境界線での消失(LOST)を防ぎ、コース内へ逆噴射する。' },
        { id: 'mod_stabilizer', name: 'Trajectory Stabilizer', mass: 1, slots: 1, gravityMultiplier: 0.8, appearanceRate: 8, color: 'rgba(0, 188, 212, 0.15)', description: '重力の影響を0.8倍に軽減し、軌道を安定させる。' }
    ],
    BOOSTERS: [
        { id: 'opt_fuel', name: 'Reaction Fuel', mass: 1, slots: 0, appearanceRate: 10, color: 'rgba(121, 85, 72, 0.15)', description: 'Acceleratorの摩耗を防ぎ、耐久減少を自動で無効化する。' },
        { id: 'boost_magnet', name: 'Magnetic Pulse', mass: 1, slots: 0, appearanceRate: 5, color: 'rgba(103, 58, 183, 0.15)', description: '航行時間とともにアイテム回収範囲が徐々に拡大する。' },
        { id: 'boost_expander', name: 'Goal Expander', mass: 1, slots: 0, arcMultiplier: 1.2, appearanceRate: 5, color: 'rgba(0, 230, 118, 0.15)', description: '出口（アーク）のサイズを1.2倍に拡大する。' }
    ],
    CARGO: [
        { id: 'cargo_safe', name: 'Safe Cargo', mass: 1, category: 'CARGO_SAFE', appearanceRate: 0, color: 'rgba(0, 230, 118, 0.15)', description: '安全区域への配送用荷物。' },
        { id: 'cargo_normal', name: 'Normal Cargo', mass: 2, category: 'CARGO_NORMAL', appearanceRate: 0, color: 'rgba(41, 121, 255, 0.15)', description: '通常区域への配送用荷物。' },
        { id: 'cargo_danger', name: 'Danger Cargo', mass: 4, category: 'CARGO_DANGER', appearanceRate: 0, color: 'rgba(255, 23, 68, 0.15)', description: '危険区域への配送用荷物。' }
    ]
};

// 初期所持アイテムの定義 (数量管理)
export const INITIAL_INVENTORY = {
    chassis: [
        { id: 'hull_light', count: 3 },
        { id: 'hull_medium', count: 2 }
    ],
    logic: [
        { id: 'sensor_short', count: 3 },
        { id: 'sensor_normal', count: 2 }
    ],
    accelerators: [
        { id: 'pad_standard', charges: 2 },
        { id: 'pad_precision', charges: 2 }
    ],
    modules: [
        { id: 'mod_capacity', count: 2 },
        { id: 'mod_star_breaker', count: 1 },
        { id: 'mod_stabilizer', count: 1 }
    ],
    boosters: [
        { id: 'opt_fuel', count: 2 },
        { id: 'boost_magnet', count: 1 },
        { id: 'boost_expander', count: 1 }
    ]
};
