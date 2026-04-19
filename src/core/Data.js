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
    RARE: 15,
    ANOMALY: 20
};

export const RARITY_PRICES = {
    [RARITY.COMMON]: 20,
    [RARITY.UNCOMMON]: 40,
    [RARITY.RARE]: 60,
    [RARITY.ANOMALY]: 100
};

export const ANIMATION_DURATION = 1200; // ミリ秒単位

// カテゴリ別のイメージカラー定義（Data.js オリジナルのアイデンティティを保持）
export const CATEGORY_COLORS = {
    CHASSIS: '#90a4ae',
    LOGIC: '#4488ff',
    LAUNCHERS: '#4caf50',
    MODULES: '#9c27b0',
    BOOSTERS: '#8d6e63',
    ROCKETS: '#81ecec',
    COIN: '#ffd700',
    CARGO: '#00e5ff',
    MARKET: '#ff4d4d'
};

export const GOAL_COLORS = {
    TRADING_POST: '#00e676',
    REPAIR_DOCK: '#2979ff',
    BLACK_MARKET: '#ff1744'
};

export const GOAL_NAMES = {
    TRADING_POST: 'TRADING POST',
    REPAIR_DOCK: 'REPAIR DOCK',
    BLACK_MARKET: 'BLACK MARKET'
};

export const REPAIR_BASE_COST = 10;

// ゲームバランス調整用定数
export const GAME_BALANCE = {
    DEFAULT_SHIP_MASS: 10,
    DELIVERY_REWARD: { SCORE: 1500, COINS: 100 },
    UNMATCHED_DELIVERY_REWARD: { SCORE: 0, COINS: 10 },
    MAX_COIN_DISCOUNT: 0.5,
    LUCKY_CARGO_DISCOUNT: 0.1,
    SHIP_START_OFFSET: 12,
    GRADE_STEPS: { SINGLE: 20, TOTAL: 50 },
    SECTOR_NOTIFICATION_DURATION: 3600,
    SCORE_PER_STEP: 1,
    TRAIL_MAX_LENGTH: 80,
    MAGNET_PULSE_GROWTH: 20,
    GRAVITY_SCALING_FACTOR: 0.02,
    RETURN_BONUS_INCREMENT: 0.1,
    SAFE_DISTANCE_FROM_HOME: 30,
    COLLISION_MARGIN: 1,
    CUSHION_BOUNCE: 1.0,
    EMERGENCY_THRUST_MULT: 0.8
};

// マップ生成用定数
export const MAP_CONSTANTS = {
    BOUNDARY_RADIUS: 900,
    MIN_STAR_DISTANCE: 180,
    HOME_STAR_RADIUS: 25,
    HOME_STAR_MASS: 4000,
    STAR_DEFAULT_RADIUS: 20,
    STAR_HIT_MARGIN: 15
};

// UI・エフェクト用カラー定義
export const UI_COLORS = {
    BG: '#050510',
    HOME_STAR: '#ff6600',
    HOME_STAR_GLOW: '#ff3300',
    NORMAL_STAR: '#ffcc00',
    NORMAL_STAR_GLOW: 'rgba(255,204,0,0.5)',
    BOUNDARY: 'rgba(255, 255, 255, 0.1)',
    SCANNER: 'rgba(0, 255, 204, 1.0)',
    SCANNER_FILL: 'rgba(0, 255, 204, 0.15)',
    TRAIL: 'rgba(255, 255, 255, 1.0)',
    PREDICTION: 'rgba(255, 255, 255, 0.6)',
    REPULSIVE_STAR: '#e100ff',
    REPULSIVE_STAR_GLOW: 'rgba(225, 0, 255, 0.5)'
};

// 実績UI用カラー
export const ACHIEVEMENT_TIER_COLORS = ['#10b981', '#3b82f6', '#d4af37'];

// 施設情報の定義と共通ユーティリティ (v0.34.0)
export const FACILITY_INFO = {
    TRADING_POST: { id: 'T', type: 'TRADING_POST', name: 'TRADING POST', color: '#00e676', icon: 'T' },
    REPAIR_DOCK: { id: 'R', type: 'REPAIR_DOCK', name: 'REPAIR DOCK', color: '#2979ff', icon: 'R' },
    BLACK_MARKET: { id: 'B', type: 'BLACK_MARKET', name: 'BLACK MARKET', color: '#ff1744', icon: 'B' }
};

export const getFacilityById = (id) => Object.values(FACILITY_INFO).find(f => f.id === id);
export const getFacilityByType = (type) => FACILITY_INFO[type];

export const PARTS = {
    chassis: [
        { id: 'hull_light', category: 'chassis', name: '軽量シャーシ', mass: 3, slots: 1, precision: 100, rarity: RARITY.COMMON, description: 'スロットを減らした軽量化設計で機動性能を向上させたシャーシ。' },
        { id: 'hull_medium', category: 'chassis', name: '標準シャーシ', mass: 8, slots: 2, precision: 150, rarity: RARITY.COMMON, description: '汎用性と拡張性のバランスに優れた標準規格のシャーシ。' },
        { id: 'hull_heavy', category: 'chassis', name: '堅牢シャーシ', mass: 18, slots: 3, precision: 200, rarity: RARITY.COMMON, description: '初速制限と引き換えに多数の拡張枠を確保した重装甲シャーシ。' },
        { id: 'hull_light_plus', category: 'chassis', name: '軽量シャーシ＋', mass: 3, slots: 1, precision: 100, precisionMultiplier: 1.2, pickupMultiplier: 1.2, rarity: RARITY.RARE, description: '軌道予測とアイテム回収機能が強化された軽量シャーシの改良版。' },
        { id: 'hull_medium_plus', category: 'chassis', name: '標準シャーシ＋', mass: 8, slots: 2, precision: 150, precisionMultiplier: 1.2, pickupMultiplier: 1.2, rarity: RARITY.RARE, description: '軌道予測とアイテム回収機能が強化された標準シャーシの改良版。' },
        { id: 'hull_heavy_plus', category: 'chassis', name: '堅牢シャーシ＋', mass: 18, slots: 3, precision: 200, precisionMultiplier: 1.2, pickupMultiplier: 1.2, rarity: RARITY.RARE, description: '軌道予測とアイテム回収機能が強化された堅牢シャーシの改良版。' }
    ],
    logic: [
        { id: 'sensor_short', category: 'logic', name: '広域回収ロジック', mass: 1, pickupRange: 40, pickupMultiplier: 1.2, rarity: RARITY.COMMON, description: '物資回収範囲の拡大に特化した広域収集型のアルゴリズム。' },
        { id: 'sensor_normal', category: 'logic', name: '標準航法ロジック', mass: 1, precisionMultiplier: 1.2, pickupRange: 40, rarity: RARITY.COMMON, description: '状況を選ばず安定した性能を維持する標準仕様のロジック。' },
        { id: 'sensor_long', category: 'logic', name: '精密予測ロジック', mass: 1, precisionMultiplier: 1.5, pickupRange: 40, pickupMultiplier: 0.8, rarity: RARITY.COMMON, description: 'アイテム回収範囲を犠牲にし遠方までの軌道予測を優先した精密演算ロジック。' },
        { id: 'sensor_gravity', category: 'logic', name: '重力偏向ロジック', mass: 1, gravityMultiplier: 0.9, pickupRange: 40, rarity: RARITY.RARE, description: '星からの重力を特殊回路で軽減し軌道を安定させる偏向ロジック。' }
    ],
    launcher: [
        { id: 'pad_standard_d2', category: 'launcher', name: '標準発射台 [LN-1200/2]', power: 1200, maxCharges: 2, rarity: RARITY.COMMON, description: '標準的なパワーと容量を備えた、基本設計の発射台。' },
        { id: 'pad_precision_d2', category: 'launcher', name: '精密発射台 [PR-1000/2]', power: 1000, maxCharges: 2, precisionMultiplier: 1.2, rarity: RARITY.COMMON, description: '出力を抑える代わりに、予測精度の向上を図った精密射出装置。' },
        { id: 'pad_standard_d3', category: 'launcher', name: '標準発射台 [LN-1210/3]', power: 1210, maxCharges: 3, rarity: RARITY.UNCOMMON, description: '高い射出パワーと余裕のある耐久力を両立した、標準型の発射台。' },
        { id: 'pad_precision_d3', category: 'launcher', name: '精密発射台 [PR-1010/3]', power: 1010, maxCharges: 3, precisionMultiplier: 1.2, rarity: RARITY.UNCOMMON, description: '予測精度を維持しつつ、耐久性能の向上を図った精密射出装置。' },
        { id: 'pad_standard_d4', category: 'launcher', name: '標準発射台 [LN-1220/4]', power: 1220, maxCharges: 4, rarity: RARITY.RARE, description: '最大級の耐久性能を確保した、標準型発射台の最上位モデル。' },
        { id: 'pad_precision_d4', category: 'launcher', name: '精密発射台 [PR-1020/4]', power: 1020, maxCharges: 4, precisionMultiplier: 1.2, rarity: RARITY.RARE, description: '最大級の耐久性能を確保した、精密射出装置の最上位モデル。' }
    ],
    module: [
        { id: 'mod_capacity', category: 'module', name: 'スロット拡張基板', mass: 1, slots: 2, rarity: RARITY.UNCOMMON, description: 'スロット数を増設しロケットの拡張性を高める追加基板。' },
        { id: 'mod_star_breaker', category: 'module', name: 'スター・ブレイカー', mass: 1, maxCharges: 2, rarity: RARITY.ANOMALY, description: '星に激突する直前、高出力パルスで対象を破壊する衝突回避装置。' },
        { id: 'mod_cushion', category: 'module', name: 'インパクト・クッション', mass: 1, maxCharges: 2, rarity: RARITY.ANOMALY, description: '星に激突した際、反発場を展開してバウンドする衝突緩衝モジュール。' },
        { id: 'mod_emergency', category: 'module', name: '緊急スラスター', mass: 1, maxCharges: 2, rarity: RARITY.ANOMALY, description: '境界線でのロストを回避するための、自動方向転換用スラスター。' },
        { id: 'mod_stabilizer', category: 'module', name: '軌道安定化装置', mass: 1, gravityMultiplier: 0.8, rarity: RARITY.ANOMALY, description: '強力な重力軽減で軌道を安定させる、1フライト限りの使い切り装置。' },
        { id: 'mod_analyzer', category: 'module', name: 'オービット・アナリスト', mass: 1, precisionMultiplier: 1.2, rarity: RARITY.UNCOMMON, description: '演算アルゴリズムを最適化して予測精度を向上させる解析モジュール。' },
        { id: 'mod_insurance', category: 'module', name: 'ロスト保険', mass: 1, onLostBonus: 1, rarity: RARITY.COMMON, description: 'ロケット消失時に査定価格に応じた保険金が支払われる、重複受給可能な保証プラン。' },
        { id: 'mod_gst_breaker', category: 'module', name: 'ブレイカー・ゴースト', mass: 1, ghostType: 'breaker', rarity: RARITY.RARE, description: 'スター・ブレイカー作動時の想定軌道を演算し、航法システムへ表示する補助機能。' },
        { id: 'mod_gst_cushion', category: 'module', name: 'クッション・ゴースト', mass: 1, ghostType: 'cushion', rarity: RARITY.RARE, description: 'インパクト・クッション作動時の想定軌道を演算し、航法システムへ表示する補助機能。' },
        { id: 'mod_gst_emergency', category: 'module', name: 'スラスター・ゴースト', mass: 1, ghostType: 'emergency', rarity: RARITY.RARE, description: '緊急スラスター作動時の想定軌道を演算し、航法システムへ表示する補助機能。' }
    ],
    booster: [
        { id: 'opt_fuel', category: 'booster', name: '高反応燃料', powerMultiplier: 1.2, preventsLauncherWear: true, maxCharges: 1, rarity: RARITY.COMMON, description: '燃料を代用しつつ射出パワーを強化する、1回分の高反応燃料カートリッジ。' },
        { id: 'opt_fuel_pack', category: 'booster', name: '高反応燃料パック', powerMultiplier: 1.2, preventsLauncherWear: true, maxCharges: 2, rarity: RARITY.UNCOMMON, description: '燃料を代用しつつ射出パワーを強化する、大容量の高反応燃料カートリッジ。' },
        { id: 'boost_flash', category: 'booster', name: '閃光推進剤', gravityMultiplier: 0.1, duration: 100, rarity: RARITY.RARE, description: '一定時間、星の重力をほぼ無効化して直進性能を向上させる高反応添加剤。' },
        { id: 'boost_power', category: 'booster', name: '高出力パワーブレード', powerMultiplier: 1.3, rarity: RARITY.COMMON, description: 'エンジンの燃焼効率を一時的に高め、射出パワーを強化する高出力添加剤。' },
        { id: 'boost_magnet', category: 'booster', name: 'マグネティック・パルス', rarity: RARITY.RARE, description: '航行時間とともに回収範囲を拡大し続ける、1回限りの磁気パルス発生装置。' },
        { id: 'boost_expander', category: 'booster', name: 'アーク・エクスパンダー', arcMultiplier: 2.0, rarity: RARITY.RARE, description: '出口（アーク）の有効半径を2倍に拡大させる、1回限りの磁気干渉装置。' }
    ],
    coin: [
        { id: 'coin_100', category: 'coin', name: '100コイン', score: 100, rarity: RARITY.UNCOMMON, description: '交易所での支払いや設備の利用に用いられる、標準的な通貨チップ。' },
        { id: 'coin_200', category: 'coin', name: '200コイン', score: 200, rarity: RARITY.RARE, description: '大口取引のために高密度のデータが記録された上位の通貨チップ。' }
    ],
    cargo: [
        { id: 'cargo_safe', category: 'cargo', name: '通商物資', deliveryGoalId: 'TRADING_POST', rarity: RARITY.RARE, description: 'Trading Post への配送を目的とした荷物。' },
        { id: 'cargo_normal', category: 'cargo', name: '整備用パーツ', deliveryGoalId: 'REPAIR_DOCK', rarity: RARITY.RARE, description: 'Repair Dock への配送を目的とした整備用パーツ。' },
        { id: 'cargo_danger', category: 'cargo', name: '暗号化データ', deliveryGoalId: 'BLACK_MARKET', rarity: RARITY.RARE, description: 'Black Market への配送を目的とした暗号化データ。' },
        { id: 'cargo_lucky', category: 'cargo', name: '幸運の導き', coinDiscount: 0.1, rarity: RARITY.UNCOMMON, description: '施設への配送完了時に取引コストを軽減する特殊貨物。複数配送による効果の累積が可能。' }
    ]
};

// IDをキーにしたハッシュ（高速検索用）
export const ITEM_REGISTRY = {};
Object.values(PARTS).forEach(categoryList => {
    categoryList.forEach(item => {
        ITEM_REGISTRY[item.id] = item;
    });
});
