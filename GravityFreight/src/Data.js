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
    COIN: '#ffd700',         // Gold
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
        { id: 'hull_heavy', category: 'CHASSIS', name: '堅牢シャーシ', mass: 18, slots: 2, precision: 100, pickupRange: 0, rarity: RARITY.COMMON, description: '堅牢な重厚体。2スロット。' },
        { id: 'hull_light_plus', category: 'CHASSIS', name: '軽量シャーシ＋', mass: 3, slots: 0, precision: 100, precisionMultiplier: 1.2, pickupMultiplier: 1.2, rarity: RARITY.RARE, description: '改良型。予測と取得が20%強化されている。' },
        { id: 'hull_medium_plus', category: 'CHASSIS', name: '標準シャーシ＋', mass: 8, slots: 1, precision: 100, precisionMultiplier: 1.2, pickupMultiplier: 1.2, rarity: RARITY.RARE, description: '改良型。予測と取得が20%強化されている。' },
        { id: 'hull_heavy_plus', category: 'CHASSIS', name: '堅牢シャーシ＋', mass: 18, slots: 2, precision: 100, precisionMultiplier: 1.2, pickupMultiplier: 1.2, rarity: RARITY.RARE, description: '改良型。予測と取得が20%強化されている。' }
    ],
    LOGIC: [
        { id: 'sensor_short', category: 'LOGIC', name: '広域回収ロジック', mass: 1, slots: 0, precision: 150, pickupRange: 80, pickupMultiplier: 1.2, rarity: RARITY.COMMON, description: '物資回収に特化した広域収集型。' },
        { id: 'sensor_normal', category: 'LOGIC', name: '標準航法ロジック', mass: 1, slots: 0, precision: 250, pickupRange: 40, pickupMultiplier: 1.1, rarity: RARITY.COMMON, description: '汎用的な標準精度。' },
        { id: 'sensor_long', category: 'LOGIC', name: '精密予測ロジック', mass: 1, slots: 0, precision: 600, precisionMultiplier: 1.1, pickupRange: 20, rarity: RARITY.COMMON, description: '長距離予測に特化。取得範囲は狭い。' },
        { id: 'sensor_gravity', category: 'LOGIC', name: '重力偏向ロジック', mass: 1, slots: 0, precision: 250, gravityMultiplier: 0.8, rarity: RARITY.RARE, description: '重力の影響を軽減する特殊回路を搭載。' }
    ],
    LAUNCHERS: [
        { id: 'pad_standard_d2', category: 'LAUNCHERS', name: '標準発射台 [LNC-2]', power: 1200, maxCharges: 2, mass: 0, slots: 0, precision: 0, rarity: RARITY.COMMON, description: '標準的な性能。初期装備。' },
        { id: 'pad_precision_d2', category: 'LAUNCHERS', name: '精密発射台 [PRC-2]', power: 1000, maxCharges: 2, mass: 0, slots: 0, precision: 250, precisionMultiplier: 1.05, rarity: RARITY.COMMON, description: '予測線を延長し、安定した制御が可能。' },
        { id: 'pad_standard_d3', category: 'LAUNCHERS', name: '標準発射台 [LNC-3]', power: 1200, maxCharges: 3, mass: 0, slots: 0, precision: 0, rarity: RARITY.UNCOMMON, description: '改良型。耐久力が向上。' },
        { id: 'pad_precision_d3', category: 'LAUNCHERS', name: '精密発射台 [PRC-3]', power: 1000, maxCharges: 3, mass: 0, slots: 0, precision: 250, precisionMultiplier: 1.05, rarity: RARITY.UNCOMMON, description: '改良型。耐久力が向上。' },
        { id: 'pad_standard_d4', category: 'LAUNCHERS', name: '標準発射台 [LNC-4]', power: 1200, maxCharges: 4, mass: 0, slots: 0, precision: 0, rarity: RARITY.RARE, description: '最終型。高い耐久力を誇る。' },
        { id: 'pad_precision_d4', category: 'LAUNCHERS', name: '精密発射台 [PRC-4]', power: 1000, maxCharges: 4, mass: 0, slots: 0, precision: 250, precisionMultiplier: 1.05, rarity: RARITY.RARE, description: '最終型。高い耐久力を誇る。' }
    ],
    MODULES: [
        { id: 'mod_capacity', category: 'MODULES', name: 'スロット拡張基板', mass: 1, slots: 2, rarity: RARITY.UNCOMMON, description: '拡張スロットを2つ追加。' },
        { id: 'mod_star_breaker', category: 'MODULES', name: 'スター・ブレイカー', mass: 2, maxCharges: 2, rarity: RARITY.RARE, description: '衝突時に星を破壊して回避する。' },
        { id: 'mod_cushion', category: 'MODULES', name: 'インパクト・クッション', mass: 1, maxCharges: 1, rarity: RARITY.RARE, description: '衝突時にバウンドして回避。' },
        { id: 'mod_emergency', category: 'MODULES', name: '緊急スラスター', mass: 1, maxCharges: 1, rarity: RARITY.RARE, description: '境界線で自動方向転換。' },
        { id: 'mod_stabilizer', category: 'MODULES', name: '軌道安定化装置', mass: 1, gravityMultiplier: 0.8, rarity: RARITY.RARE, description: '自機にかかる重力を0.8倍に軽減。' },
        { id: 'mod_analyzer', category: 'MODULES', name: 'オービット・アナリスト', mass: 1, precisionMultiplier: 1.2, rarity: RARITY.UNCOMMON, description: '予測精度を1.2倍に強化。' },
        { id: 'mod_insurance', category: 'MODULES', name: 'ロスト保険', mass: 1, onLostBonus: 50, rarity: RARITY.UNCOMMON, description: 'Lost時に保険金を受給。重複可。' },
        { id: 'mod_gst_breaker', category: 'MODULES', name: 'スター・ゴースト', mass: 1, ghostType: 'breaker', rarity: RARITY.RARE, description: '破壊回避時の予測軌道を表示。' },
        { id: 'mod_gst_cushion', category: 'MODULES', name: 'クッション・ゴースト', mass: 1, ghostType: 'cushion', rarity: RARITY.RARE, description: '跳ね返り時の予測軌道を表示。' },
        { id: 'mod_gst_emergency', category: 'MODULES', name: 'スラスター・ゴースト', mass: 1, ghostType: 'emergency', rarity: RARITY.RARE, description: '境界復帰時の予測軌道を表示。' }
    ],
    BOOSTERS: [
        { id: 'opt_fuel', category: 'BOOSTERS', name: '高反応燃料', mass: 0, slots: 0, maxCharges: 1, rarity: RARITY.COMMON, description: '耐久減少を無効化する。' },
        { id: 'opt_fuel_pack', category: 'BOOSTERS', name: '高反応燃料パック', mass: 0, slots: 0, maxCharges: 2, rarity: RARITY.UNCOMMON, description: '2回分使用可能な燃料パック。' },
        { id: 'boost_lucky', category: 'BOOSTERS', name: '幸運の導き', mass: 0, slots: 0, nextSectorThresholdBonus: 2, rarity: RARITY.UNCOMMON, description: 'ゴール成功時、次セクターの出現率を向上。' },
        { id: 'boost_flash', category: 'BOOSTERS', name: '閃光推進剤', mass: 0, slots: 0, gravityMultiplier: 0.1, duration: 100, rarity: RARITY.RARE, description: '一定時間重力を無視して直進する。' },
        { id: 'boost_power', category: 'BOOSTERS', name: '高出力パワーブレード', mass: 0, slots: 0, powerMultiplier: 1.3, rarity: RARITY.RARE, description: '発射パワーを1.3倍に強化。' },
        { id: 'boost_magnet', category: 'BOOSTERS', name: 'マグネティック・パルス', mass: 0, slots: 0, rarity: RARITY.RARE, description: '航行時間とともにアイテム回収範囲が拡大。' },
        { id: 'boost_expander', category: 'BOOSTERS', name: 'ゴール・エクスパンダー', mass: 0, slots: 0, arcMultiplier: 1.2, rarity: RARITY.RARE, description: '出口サイズを1.2倍に拡大。' }
    ],
    COIN: [
        { id: 'coin_100', category: 'COIN', name: '100コイン', score: 100, rarity: RARITY.UNCOMMON, description: '通貨。100点分。' },
        { id: 'coin_200', category: 'COIN', name: '200コイン', score: 200, rarity: RARITY.RARE, description: '通貨。200点分。' }
    ],
    CARGO: [
        { id: 'cargo_safe', category: 'CARGO_SAFE', name: 'セーフ・カーゴ', mass: 1, rarity: RARITY.UNCOMMON, description: '安全区域への配送用荷物。' },
        { id: 'cargo_normal', category: 'CARGO_NORMAL', name: 'ノーマル・カーゴ', mass: 1, rarity: RARITY.UNCOMMON, description: '通常区域への配送用荷物。' },
        { id: 'cargo_danger', category: 'CARGO_DANGER', name: 'デンジャー・カーゴ', mass: 1, rarity: RARITY.UNCOMMON, description: '危険区域への配送用荷物。' }
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
        { id: 'pad_standard_d2', charges: 2 },
        { id: 'pad_precision_d2', charges: 2 }
    ],
    modules: [
        { id: 'mod_analyzer', count: 1 }
    ],
    boosters: [
        { id: 'opt_fuel', count: 1 }
    ]
};
