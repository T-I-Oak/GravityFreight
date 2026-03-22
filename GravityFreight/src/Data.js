// カテゴリ別のイメージカラー定義
export const CATEGORY_COLORS = {
    CHASSIS: '#ffab40',
    LOGIC: '#00bcd4',
    LOGIC_OPTIONS: '#9c27b0',
    ACCELERATORS: '#4caf50',
    ACC_OPTIONS: '#795548',
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
        { id: 'pad_standard', name: 'Standard Accelerator', power: 1200, durability: 2, mass: 1, slots: 0, precision: 0, precisionMultiplier: 0.0, pickupRange: 0, pickupMultiplier: 0.0, appearanceRate: 10, color: 'rgba(76, 175, 80, 0.15)', description: '標準的な初期加速。' },
        { id: 'pad_precision', name: 'Steady Accelerator', power: 1000, durability: 2, mass: 1, slots: 0, precision: 0, precisionMultiplier: 0.05, pickupRange: 0, pickupMultiplier: 0.0, appearanceRate: 10, color: 'rgba(76, 175, 80, 0.15)', description: '低速だが安定した射出が可能な安定型。' }
    ],
    LOGIC_OPTIONS: [
        { id: 'opt_range_up', name: 'Range Extender', mass: 1, slots: 0, precision: 0, precisionMultiplier: 0.2, pickupRange: 10, pickupMultiplier: 0.0, appearanceRate: 10, color: 'rgba(156, 39, 176, 0.15)', description: 'Logicの予測精度を補強し、射程を20%延長する。' },
        { id: 'opt_extender', name: 'Add-on Expander', mass: 2, slots: 2, precision: 0, precisionMultiplier: 0.0, pickupRange: 0, pickupMultiplier: 0.0, appearanceRate: 10, color: 'rgba(156, 39, 176, 0.15)', description: '拡張スロットを2つ追加する。重量が増加する。' }
    ],
    ACC_OPTIONS: [
        { id: 'opt_fuel', name: 'Reaction Fuel', mass: 1, slots: 0, precision: 0, precisionMultiplier: 0.0, pickupRange: 0, pickupMultiplier: 0.0, appearanceRate: 10, color: 'rgba(121, 85, 72, 0.15)', description: 'Acceleratorの摩耗を防ぎ、耐久減少を自動で無効化する。' }
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
        { id: 'hull_light', count: 1 },
        { id: 'hull_medium', count: 1 }
    ],
    logic: [
        { id: 'sensor_short', count: 1 },
        { id: 'sensor_normal', count: 1 }
    ],
    accelerators: [
        { id: 'pad_standard', hp: 2 },
        { id: 'pad_precision', hp: 2 }
    ],
    logicOptions: [
        { id: 'opt_range_up', count: 1 }
    ],
    accOptions: [
        { id: 'opt_fuel', count: 1 }
    ]
};


