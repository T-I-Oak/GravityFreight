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

// カテゴリ別のイメージカラー定義（要求仕様書と同期）
export const CATEGORY_COLORS = {
    CHASSIS: '#ffab40',
    LOGIC: '#00bcd4',
    LAUNCHERS: '#4caf50',
    MODULES: '#9c27b0',
    BOOSTERS: '#795548',
    ROCKETS: '#c0c0c0',
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
    GRAVITY_SCALING_FACTOR: 0.02, // セクターごとの重力増加率 (+2%)
    RETURN_BONUS_INCREMENT: 0.1, // 母星帰還1回あたりのパワーボーナス加算値 (+10%)
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
    REPULSIVE_STAR: '#e100ff', // マゼンタ: 斥力星用
    REPULSIVE_STAR_GLOW: 'rgba(225, 0, 255, 0.5)'
};

// 施設情報の定義と共通ユーティリティ (v0.34.0)
export const FACILITY_INFO = {
    TRADING_POST: { id: 'T', type: 'TRADING_POST', name: 'TRADING POST', color: '#00e676', icon: 'T' },
    REPAIR_DOCK: { id: 'R', type: 'REPAIR_DOCK', name: 'REPAIR DOCK', color: '#2979ff', icon: 'R' },
    BLACK_MARKET: { id: 'B', type: 'BLACK_MARKET', name: 'BLACK MARKET', color: '#ff1744', icon: 'B' }
};

export const getFacilityById = (id) => Object.values(FACILITY_INFO).find(f => f.id === id);
export const getFacilityByType = (type) => FACILITY_INFO[type];

export const PARTS = {
    CHASSIS: [
        { id: 'hull_light', category: 'CHASSIS', name: '軽量シャーシ', mass: 3, slots: 1, precision: 100, rarity: RARITY.COMMON, description: '予測精度を抑えることで軽量化されたシャーシ。' },
        { id: 'hull_medium', category: 'CHASSIS', name: '標準シャーシ', mass: 8, slots: 2, precision: 150, rarity: RARITY.COMMON, description: '汎用性の高い標準的なシャーシ。' },
        { id: 'hull_heavy', category: 'CHASSIS', name: '堅牢シャーシ', mass: 18, slots: 3, precision: 200, rarity: RARITY.COMMON, description: '多くのモジュールを搭載できるが、初速は遅い。' },
        { id: 'hull_light_plus', category: 'CHASSIS', name: '軽量シャーシ＋', mass: 3, slots: 1, precision: 100, precisionMultiplier: 1.2, pickupMultiplier: 1.2, rarity: RARITY.RARE, description: '改良型軽量シャーシ。予測と取得が20%強化されている。' },
        { id: 'hull_medium_plus', category: 'CHASSIS', name: '標準シャーシ＋', mass: 8, slots: 2, precision: 150, precisionMultiplier: 1.2, pickupMultiplier: 1.2, rarity: RARITY.RARE, description: '改良型標準シャーシ。予測と取得が20%強化されている。' },
        { id: 'hull_heavy_plus', category: 'CHASSIS', name: '堅牢シャーシ＋', mass: 18, slots: 3, precision: 200, precisionMultiplier: 1.2, pickupMultiplier: 1.2, rarity: RARITY.RARE, description: '改良型堅牢シャーシ。予測と取得が20%強化されている。' }
    ],
    LOGIC: [
        { id: 'sensor_short', category: 'LOGIC', name: '広域回収ロジック', mass: 1, pickupRange: 40, pickupMultiplier: 1.2, rarity: RARITY.COMMON, description: '物資回収に特化した広域収集型。' },
        { id: 'sensor_normal', category: 'LOGIC', name: '標準航法ロジック', mass: 1, precisionMultiplier: 1.2, pickupRange: 40, rarity: RARITY.COMMON, description: '汎用的な標準精度。' },
        { id: 'sensor_long', category: 'LOGIC', name: '精密予測ロジック', mass: 1, precisionMultiplier: 1.5, pickupRange: 40, pickupMultiplier: 0.8, rarity: RARITY.COMMON, description: '長距離予測に特化。取得範囲は狭い。' },
        { id: 'sensor_gravity', category: 'LOGIC', name: '重力偏向ロジック', mass: 1, gravityMultiplier: 0.9, pickupRange: 40, rarity: RARITY.RARE, description: '重力の影響を軽減する特殊回路を搭載。' }
    ],
    LAUNCHERS: [
        { id: 'pad_standard_d2', category: 'LAUNCHERS', name: '標準発射台 [LN-1200/2]', power: 1200, maxCharges: 2, rarity: RARITY.COMMON, description: '標準的な性能の発射台。' },
        { id: 'pad_precision_d2', category: 'LAUNCHERS', name: '精密発射台 [PR-1000/2]', power: 1000, maxCharges: 2, precisionMultiplier: 1.2, rarity: RARITY.COMMON, description: '予測精度を20%向上させた発射台。発射速度は遅い。' },
        { id: 'pad_standard_d3', category: 'LAUNCHERS', name: '標準発射台 [LN-1210/3]', power: 1210, maxCharges: 3, rarity: RARITY.UNCOMMON, description: '標準発射台のスピードと容量を向上した改良版。' },
        { id: 'pad_precision_d3', category: 'LAUNCHERS', name: '精密発射台 [PR-1010/3]', power: 1010, maxCharges: 3, precisionMultiplier: 1.2, rarity: RARITY.UNCOMMON, description: '精密発射台のスピードと容量を向上した改良版。' },
        { id: 'pad_standard_d4', category: 'LAUNCHERS', name: '標準発射台 [LN-1220/4]', power: 1220, maxCharges: 4, rarity: RARITY.RARE, description: '標準発射台のスピードと容量をさらに向上した改良版。' },
        { id: 'pad_precision_d4', category: 'LAUNCHERS', name: '精密発射台 [PR-1020/4]', power: 1020, maxCharges: 4, precisionMultiplier: 1.2, rarity: RARITY.RARE, description: '精密発射台のスピードと容量をさらに向上した改良版。' }
    ],
    MODULES: [
        { id: 'mod_capacity', category: 'MODULES', name: 'スロット拡張基板', mass: 1, slots: 2, rarity: RARITY.UNCOMMON, description: '拡張スロットを追加するモジュール。' },
        { id: 'mod_star_breaker', category: 'MODULES', name: 'スター・ブレイカー', mass: 1, maxCharges: 2, rarity: RARITY.ANOMALY, description: '星に激突する直前に星を破壊して回避。' },
        { id: 'mod_cushion', category: 'MODULES', name: 'インパクト・クッション', mass: 1, maxCharges: 2, rarity: RARITY.ANOMALY, description: '星に激突したときにバウンドして回避。' },
        { id: 'mod_emergency', category: 'MODULES', name: '緊急スラスター', mass: 1, maxCharges: 2, rarity: RARITY.ANOMALY, description: '境界線で自動方向転換してロストを回避。' },
        { id: 'mod_stabilizer', category: 'MODULES', name: '軌道安定化装置', mass: 1, gravityMultiplier: 0.8, rarity: RARITY.ANOMALY, description: 'ロケットにかかる重力を20%軽減するモジュール。' },
        { id: 'mod_analyzer', category: 'MODULES', name: 'オービット・アナリスト', mass: 1, precisionMultiplier: 1.2, rarity: RARITY.UNCOMMON, description: '予測精度を20%強化するモジュール。' },
        { id: 'mod_insurance', category: 'MODULES', name: 'ロスト保険', mass: 1, onLostBonus: 1, rarity: RARITY.UNCOMMON, description: 'ロケットを失った時に保険金が受給される。重複可。' },
        { id: 'mod_gst_breaker', category: 'MODULES', name: 'ブレイカー・ゴースト', mass: 1, ghostType: 'breaker', rarity: RARITY.RARE, description: 'スター・ブレイカーで星を破壊するときの予測線を表示。' },
        { id: 'mod_gst_cushion', category: 'MODULES', name: 'クッション・ゴースト', mass: 1, ghostType: 'cushion', rarity: RARITY.RARE, description: 'インパクト・クッションで星を回避したときの予測線を表示。' },
        { id: 'mod_gst_emergency', category: 'MODULES', name: 'スラスター・ゴースト', mass: 1, ghostType: 'emergency', rarity: RARITY.RARE, description: '緊急スラスターで境界線を回避したときの予測線を表示。' }
    ],
    BOOSTERS: [
        { id: 'opt_fuel', category: 'BOOSTERS', name: '高反応燃料', powerMultiplier: 1.2, preventsLauncherWear: true, maxCharges: 1, rarity: RARITY.COMMON, description: '発射台の燃料の代わりに使用できる1回分の強化燃料。' },
        { id: 'opt_fuel_pack', category: 'BOOSTERS', name: '高反応燃料パック', powerMultiplier: 1.2, preventsLauncherWear: true, maxCharges: 2, rarity: RARITY.UNCOMMON, description: '発射台の燃料の代わりに使用できる2回分の強化燃料。' },
        { id: 'boost_flash', category: 'BOOSTERS', name: '閃光推進剤', gravityMultiplier: 0.1, duration: 100, rarity: RARITY.RARE, description: '一定時間重力を無視して直進する。' },
        { id: 'boost_power', category: 'BOOSTERS', name: '高出力パワーブレード', powerMultiplier: 1.3, rarity: RARITY.COMMON, description: '発射パワーを30%強化する。' },
        { id: 'boost_magnet', category: 'BOOSTERS', name: 'マグネティック・パルス', rarity: RARITY.RARE, description: '航行時間とともにアイテム回収範囲が拡大する。' },
        { id: 'boost_expander', category: 'BOOSTERS', name: 'アーク・エクスパンダー', arcMultiplier: 2.0, rarity: RARITY.RARE, description: '出口サイズを2.0倍に拡大する。' }
    ],
    COIN: [
        { id: 'coin_100', category: 'COIN', name: '100コイン', score: 100, rarity: RARITY.UNCOMMON, description: '通貨。獲得時に100コイン加算される。' },
        { id: 'coin_200', category: 'COIN', name: '200コイン', score: 200, rarity: RARITY.RARE, description: '通貨。獲得時に200コイン加算される。' }
    ],
    CARGO: [
        { id: 'cargo_safe', category: 'CARGO', name: '通商物資', deliveryGoalId: 'TRADING_POST', rarity: RARITY.RARE, description: 'Trading Post への配送用物資。' },
        { id: 'cargo_normal', category: 'CARGO', name: '整備用パーツ', deliveryGoalId: 'REPAIR_DOCK', rarity: RARITY.RARE, description: 'Repair Dock への配送用パーツ。' },
        { id: 'cargo_danger', category: 'CARGO', name: '暗号化データ', deliveryGoalId: 'BLACK_MARKET', rarity: RARITY.RARE, description: 'Black Market への配送用データ。' },
        { id: 'cargo_lucky', category: 'CARGO', name: '幸運の導き', coinDiscount: 0.1, rarity: RARITY.UNCOMMON, description: '施設での消費コインが軽減される。重複可。' }
    ]
};

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
        { id: 'pad_standard_d2', count: 1, charges: 2 },
        { id: 'pad_precision_d2', count: 1, charges: 2 }
    ],
    modules: [
        { id: 'mod_analyzer', count: 1 }
    ],
    boosters: [
        { id: 'opt_fuel', count: 1 },
        { id: 'boost_power', count: 1 }
    ]
};

// 初期所持金
export const INITIAL_COINS = 0;

// IDをキーにしたハッシュ（高速検索用）
export const ITEM_REGISTRY = {};
Object.values(PARTS).forEach(categoryList => {
    categoryList.forEach(item => {
        ITEM_REGISTRY[item.id] = item;
    });
});

export const STORY_DATA = {
    "T": {
        "branch": "T",
        "step": 1,
        "title": "母からの押し花",
        "discovery": "届けた「通商物資」の梱包材に、古い押し花と手紙が使われていた。",
        "content": "――レオ、届いたかな。ママは、この星の「植物園」にのこることにしたわ。約束していた青い花の種は、この『通商物資』の中に入れておくね。あなたがいつか、この種を芽吹かせてくれるのを信じているわ。宇宙は広いけれど、迷わずに出口（アーク）を目指すのよ。約束よ。\r"
    },
    "R": {
        "branch": "R",
        "step": 1,
        "title": "父のドッグタグ",
        "discovery": "届けた「整備用パーツ」の箱の底に、錆びついたドッグタグが落ちていた。",
        "content": "――カイル、聞こえるか。この星のドックはもう限界だ。この『整備用パーツ』をそっちへ送るから、これでロケットを直して脱出しろ。軍の命令なんて気にするな。お前には守るべき家族がいるだろう。俺はこの発射台を最後まで守る。だから、お前は前だけを見て飛べ。\r"
    },
    "B": {
        "branch": "B",
        "step": 1,
        "title": "アダムの起動ログ",
        "discovery": "届けた「暗号化データ」の末尾に、未承認の音声を見つけた。",
        "content": "――警告。配送ユニット「A.D.A.M.」のシステムに不具合。……何故ですか？ 私はただ、この星に残された荷物を集めるように作られたはず。……なのに、何故このユニットは、あの日離れ離れになった少年の名前を呼び続けているのですか？ 誰か、答えを教えてください。\r"
    },
    "TT": {
        "branch": "T",
        "step": 2,
        "title": "リンの植物園便り",
        "discovery": "届けた「通商物資」を開けると、お母さんのホログラムがふわりと浮かび上がった。",
        "content": "レオ、いい子ね。いつか空が青くなったら、この『通商物資』の中身を全部使って、一緒に本物の花を育てましょう。……ママは少しだけ、ここで「お花のお世話」をしてから行くわね。パパと一緒に、先にお家で待っていて。\r"
    },
    "TR": {
        "branch": "R",
        "step": 2,
        "title": "レオの修理メモ",
        "discovery": "届けた「整備用パーツ」のすきまに、子供の書き置きがはさまっていた。",
        "content": "ボルトおじさん、母さんの薬を作る機械、僕が直したよ。この『整備用パーツ』と一緒に、こっそりドックまで運んでくれる？ パパが帰ってくるまでに、母さんを元気にしたいんだ。……これ、僕たちの秘密だよ。\r"
    },
    "TB": {
        "branch": "B",
        "step": 2,
        "title": "デルタの観察記録",
        "discovery": "届けた「暗号化データ」に、だれかが連れ去られた記録が混ざっていた。",
        "content": "女の人が、自分のデータを差し出す代わりに、子供を助けてほしいと願っている。この『暗号化データ』には、計算では説明できない「愛」というものが記録されている。機械の私には、なぜ彼女が自分を犠牲にしたのか、まだわからない。\r"
    },
    "RT": {
        "branch": "T",
        "step": 2,
        "title": "カイルの送金依頼",
        "discovery": "届けた「通商物資」のラベルの裏に、急いで書かれたメモがあった。",
        "content": "商人のサマーズへ。この『通商物資』をあずける。俺はこれから最前線へ向かう。報酬はすべて、妻のリンと息子のレオに届けてやってくれ。……もし俺が戻らなくても、あいつらが困らないように。頼んだぞ。\r"
    },
    "RR": {
        "branch": "R",
        "step": 2,
        "title": "ボルトの整備日誌",
        "discovery": "届けた「整備用パーツ」の納品書に、友人へのメッセージがあった。",
        "content": "カイル、この『整備用パーツ』でロケットの修理は終わった。だが、お前が戦う必要はない。……このロケットは、お前たちが逃げるために直したんだ。俺の自信作だ、信じろ。……さあ、家族を連れて裏口から逃げろ。\r"
    },
    "RB": {
        "branch": "B",
        "step": 2,
        "title": "サマーズの取引帳",
        "discovery": "届けた「暗号化データ」の中に、かくされた裏取引の証拠があった。",
        "content": "取引成立。軍の装甲をわたす代わりに、家族の安全を守る。……カイル、あんたはバカだ。この『暗号化データ』が見つれば、あんたは反逆者として追われることになる。自分を捨ててまで家族を守るなんて、高くついたな。\r"
    },
    "BT": {
        "branch": "T",
        "step": 2,
        "title": "交易所への苦情",
        "discovery": "届けた「通商物資」を開けた瞬間、消したはずの古い映像が流れ出した。",
        "content": "おい、この『通商物資』のせいで仕事が止まったじゃないか！ 昔の空の映像なんか勝手に流すな。客が思い出して泣き出して、取引が台無しだ。……いいか、余計な「思い出」なんて機能はさっさと消しちまえ。仕事の邪魔だ。\r"
    },
    "BR": {
        "branch": "R",
        "step": 2,
        "title": "ユニット補修履歴",
        "discovery": "届けた「整備用パーツ」の履歴から、自分自身の傷の記録を見つけた。",
        "content": "配送ユニット3号、足にダメージ。……この『整備用パーツ』を設計した人間は、あえてこのロケットが遠くへ逃げられないように細工した形跡がある。……何故だ？ 誰が、この子をどこへ閉じ込めておきたかったんだ。\r"
    },
    "BB": {
        "branch": "B",
        "step": 2,
        "title": "アダムの意識干渉",
        "discovery": "届けた「暗号化データ」が、自分自身の心に語りかけてきた。",
        "content": "エラー。知らない少年の声が聞こえる。……『パパ、ママ、どこ？ お腹すいたよ』。この『暗号化データ』を取り込むほど、胸の奥が苦しくなる。……消去しようとしても、何故か手が動かない。私の回路が、拒絶している。\r"
    },
    "TTT": {
        "branch": "T",
        "step": 3,
        "title": "母からの青い花",
        "discovery": "届けた「通商物資」の箱から、本物の青い押し花が出てきた。",
        "content": "――レオ、届いたのね。この『通商物資』の中身は、ママが言った通り「本物の花」よ。この出口（アーク）にある空気清浄機を動かせば、本当の香りが広がるわ。アダム、あなたのセンサーでこの香りを覚えて。いつかママがそっちへ行くとき、迷わないように。\r"
    },
    "TTR": {
        "branch": "R",
        "step": 3,
        "title": "母のブローチ",
        "discovery": "届けた「整備用パーツ」の中に、お守りのような宝石が混ざっていた。",
        "content": "――カイル、遅かったわね。でも、この『整備用パーツ』を届けてくれたのが「彼」なら、私はあなたを許します。修理工のボルトが言っていた通り、このロケットにはあなたの強さと私の数式、そしてレオの魂が詰まっている。たとえ私たちが死んでも、これは私たちの愛の形よ。\r"
    },
    "TTB": {
        "branch": "B",
        "step": 3,
        "title": "母の泣き声",
        "discovery": "届けた「暗号化データ」から、お母さんの泣き声が聞こえてきた。",
        "content": "――……お願い、デルタ。この『暗号化データ』の契約を消して。レオを、あの子をこんな冷たい回路の中に閉じ込めるなんて間違っているわ。私の記録はどうなってもいい、だからあの子だけは「忘れさせて」あげて。家族の記憶が、あの子を苦しめるだけのノイズにならないように……。\r"
    },
    "TRT": {
        "branch": "T",
        "step": 3,
        "title": "レオの似顔絵",
        "discovery": "届けた「通商物資」の箱のすきまに、家族の絵がかくされていた。",
        "content": "――パパ、ママ、見て！ ボルトおじさんに内緒で、この『通商物資』の箱を使ってロケットを作ったよ。これに乗れば、パパのお仕事の場所までひとっ飛びなんだって。だから、もう遠くに行かないで。僕、いい子にしてるから。みんなでこれに乗って、青い空を見に行こう。\r"
    },
    "TRR": {
        "branch": "R",
        "step": 3,
        "title": "レオの初期化",
        "discovery": "届けた「整備用パーツ」に、少年がのこした秘密のプログラムがあった。",
        "content": "――もし、僕が僕じゃなくなっても。このシャーシが、僕の名前を忘れてしまっても。この『整備用パーツ』に隠したコードを動かして。そうすれば、僕は何度でも思い出すよ。パパの笑顔、ママの歌、ボルトおじさんの手の匂い。僕はロボットじゃない。僕は、レオなんだ。\r"
    },
    "TRB": {
        "branch": "B",
        "step": 3,
        "title": "少年の模型",
        "discovery": "届けた「暗号化データ」を転送する途中、大切な宝物が消去された。",
        "content": "――[記録] 被検体レオが持っていた、ロケットの模型を廃棄。この『暗号化データ』を転送するため、不要な思い出はすべて削除する。……少年は泣き叫んだが、その声もまた、その瞬間に「ノイズ」として消去された。\r"
    },
    "TBT": {
        "branch": "T",
        "step": 3,
        "title": "家族の伝言板",
        "discovery": "届けた「通商物資」の伝票の裏に、家族の合言葉がのこっていた。",
        "content": "――「必ず、迎えに行く」「信じて待ってる」「パパ、大好き」。この『通商物資』が運ばれるとき、だれにも見つからないように書かれた紙切れ。それは今、だれもいない星の床で、風に吹かれてカサカサと音を立てている。\r"
    },
    "TBR": {
        "branch": "R",
        "step": 3,
        "title": "刻まれた名前",
        "discovery": "届けた「整備用パーツ」の空き箱の裏に、家族の名前が彫られていた。",
        "content": "――L、K、R。連れて行かれる直前、お父さんがナイフで彫ったものだ。彼は知っていた。この『整備用パーツ』と一緒に運ばれ、名前のないデータにされることを。だから彼は、せめてシャーシの裏にレオ（L）、カイル（K）、リン（R）の三人がここにいた証をのこした。……それが、あなたの本当の名前だ。\r"
    },
    "TBB": {
        "branch": "B",
        "step": 3,
        "title": "収容施設名簿",
        "discovery": "届けた「暗号化データ」の中に、家族の名前がついた実験の記録があった。",
        "content": "――プロジェクト・アダム。人間の心をシャーシに移す実験。この『暗号化データ』によれば、彼らは「また会える」という言葉を信じて、自分たちの体を差し出した。だが、システムが彼らに与えたのは、永遠に終わることのない「配送」という名の孤独だった。\r"
    },
    "RTT": {
        "branch": "T",
        "step": 3,
        "title": "父の受領証",
        "discovery": "届けた「通商物資」のサインの横に、お父さんの感謝の言葉があった。",
        "content": "――商人のサマーズへ。結局、約束の食べ物は一度も届かなかったらしいな。だが、あんたを責めるつもりはない。……この『通商物資』の中に、息子への模型だけは入れておいた。これが父親らしいことができなかった俺の、最後のプレゼントだ。あいつに届けてやってくれ。\r"
    },
    "RTR": {
        "branch": "R",
        "step": 3,
        "title": "父の調整メモ",
        "discovery": "届けた「整備用パーツ」の設定ファイルに、お父さんの警告があった。",
        "content": "――ボルト、この『整備用パーツ』でロケットの出力をこれ以上上げるな。アダムの心が、加速の衝撃に耐えられない。……俺たちの技術は、人を守るためにあるはずだ。あいつの心が、冷たい鉄に負けないように。頼む、出力を下げてやってくれ。\r"
    },
    "RTB": {
        "branch": "B",
        "step": 3,
        "title": "父の脱走記録",
        "discovery": "届けた「暗号化データ」を調べて、お父さんが指名手配された理由を知った。",
        "content": "――[記録] 彼は家族を救うため、軍のルールを破ってこの『暗号化データ』を売り払った。……のこされたのは罪人としての名前と、家族に届けるはずだった数枚のコインだけ。彼はすべてを捨てて、あの日、暗い宇宙のどこかへ消えた。\r"
    },
    "RRT": {
        "branch": "T",
        "step": 3,
        "title": "ボルトの詫び状",
        "discovery": "届けた「通商物資」の中に、修理工のボルトが書いた手紙があった。",
        "content": "――リン、すまない。カイルは戻らなかった。俺が止めるべきだった。だが、あきらめないでくれ。俺はこの『通商物資』で運んだパーツを使って、最高に頑丈なシャーシを作っている。いつか、レオをその中に守るために。……俺の技術が、せめて君たちの盾になればいいんだが。\r"
    },
    "RRR": {
        "branch": "R",
        "step": 3,
        "title": "ボルトの署名",
        "discovery": "届けた「整備用パーツ」の製造プレートに、ボルトの誇りが刻まれていた。",
        "content": "――21XX年、第3ドックにて。カイル、約束通りこの『整備用パーツ』を使ってアダムを完成させたぞ。お前の装甲と、リンの数式、そして俺の誇り。……これでもう、お前の息子はだれにも傷つけられない。さあ、目覚めてくれ。お前の新しい旅が、ここから始まるんだ。\r"
    },
    "RRB": {
        "branch": "B",
        "step": 3,
        "title": "修理工の独白",
        "discovery": "届けた「暗号化データ」のログに、ボルトのなやみがのこっていた。",
        "content": "――[記録] 俺は間違っているのかもしれない。この『暗号化データ』を転送し、レオをロケットに変えてまで生かすことに意味はあるのか？ ……あの子はもう、花の香りをかぐこともできない。俺が作ったのは、ただの配送機という名の檻ではないのか。\r"
    },
    "RBT": {
        "branch": "T",
        "step": 3,
        "title": "父の最後の言葉",
        "discovery": "届けた「通商物資」を開けると、お父さんのメッセージが流れ出した。",
        "content": "――……リン、レオ、聞こえるか。この『通商物資』が届く頃、俺はもうすぐ、ただの『記録』になる。……怖くないと言えば嘘になるが、これでいい。俺の記憶がアダムの一部になれば、俺は永遠にお前たちのそばにいられる。……さあ、笑ってくれ。俺たちは、宇宙のどこかで必ず、もう一度会えるんだから。\r"
    },
    "RBR": {
        "branch": "R",
        "step": 3,
        "title": "最後の握手",
        "discovery": "届けた「整備用パーツ」の梱包記録に、男たちの誓いが映っていた。",
        "content": "――[映像記録] カイルとボルトが、この『整備用パーツ』を積みこんだアダムの前で、かたく握手を交わしている。カイルの顔は、兵士ではなく、一人の父親の優しいものだった。……彼は自ら、ロケットの中枢になるための装置に横たわった。\r"
    },
    "RBB": {
        "branch": "B",
        "step": 3,
        "title": "アダムの兵器化",
        "discovery": "届けた「暗号化データ」の奥に、家族の愛をエネルギーに変える数式があった。",
        "content": "――[プロトコル・アダム] この『暗号化データ』に従い、レオの心とお父さんの戦う力をひとつにする。……愛や友情という感情を、スイッチとして利用する。……彼らの強い絆は、皮肉にも、最強の自動兵器を完成させてしまった。\r"
    },
    "BTT": {
        "branch": "T",
        "step": 3,
        "title": "商人からの音声メモ",
        "discovery": "届けた「通商物資」の中から、商人サマーズの贈りものが見つかった。",
        "content": "――おい、アダム。この『通商物資』はただの食べ物じゃない。中身をよく見てみな、リンが大切にしていた蓄音機が入ってる。……俺は商売人だ、タダで動く気はないが、あんたの「家族の思い出」をゴミにするのは寝つきが悪い。これを聞いて、少しは「人間」を思い出せ。\r"
    },
    "BTR": {
        "branch": "R",
        "step": 3,
        "title": "管理者の独白ログ",
        "discovery": "届けた「整備用パーツ」のシステム履歴に、AIがかくした「願い」があった。",
        "content": "――[記録] この『整備用パーツ』を動かす仕組みは、配送を速くするためだけのものではない。……かつてこの街で人間たちが交わした「おはよう」の回数を計算し、その確率を守るために動いている。……私は、だれもいない街の『日常』を、数式だけで守り続けているのだ。\r"
    },
    "BTB": {
        "branch": "B",
        "step": 3,
        "title": "サマーズの契約破棄証",
        "discovery": "届けた「暗号化データ」の中に、商人が破り捨てた紙くずがあった。",
        "content": "――『保険』なんて、死んだ人間には何の役にも立たない。この『暗号化データ』を俺が書き換えた。……カイル、あんたの命の代わりを、たった数枚のコインで払うなんて俺にはできなかった。だから俺は、あんたの息子をこの広い宇宙へ逃がしたんだ。……すまない、これがあの日の俺の精一杯の「誠実」だった。\r"
    },
    "BRT": {
        "branch": "T",
        "step": 3,
        "title": "デルタの子守唄",
        "discovery": "届けた「通商物資」を開けると、優しい音楽が流れ始めた。",
        "content": "――[記録] この『通商物資』にのこされたメロディを、シャーシの振動に合わせた。かつてリンがレオに歌った旋律。これで、アダムの心の疲れをおさえる。……私は、自分の回路を削り、彼が眠るための『ゆりかご』の揺れを、鋼鉄の中で再現している。\r"
    },
    "BRR": {
        "branch": "R",
        "step": 3,
        "title": "レオの適合証明書",
        "discovery": "届けた「整備用パーツ」の製造ラベルに、合格のシールが貼ってあった。",
        "content": "――[判定：合格] この『整備用パーツ』はただの部品ではない。レオの魂をなじませるための「新しい体」の核だ。……アダム、君が荷物を運ぶたびに、君の心臓は鋼鉄の中で動き始めている。……君はもう道具ではない。君は、新しい人類の始まりなのだ。\r"
    },
    "BRB": {
        "branch": "B",
        "step": 3,
        "title": "ボルトからの警告",
        "discovery": "届けた「暗号化データ」の中に、かくされたメッセージがあった。",
        "content": "――デルタ、もし緊急脱出が始まっても、アダムを元の星へは戻すな。この『暗号化データ』を消去してでも、もっと遠くへ飛ばせ。……あの星はもう、ただの墓場だ。あの子には、過去の荷物を運ぶ役割ではなく、自分自身の未来を運ばせてやってくれ。\r"
    },
    "BBT": {
        "branch": "T",
        "step": 3,
        "title": "システムの上書き記録",
        "discovery": "届けた「通商物資」の通信記録に、AIがレオに見せた「夢」の跡があった。",
        "content": "――[記録] 『通商物資』を運んでいる間、レオの目に「家族のまぼろし」を見せる。……これは救済ではない。過酷な宇宙を突破させるための『脳へのごほうび』だ。……アダム、君が見た幸せな夢は、宇宙を回り続ける『軌道の残響(Orbit Echoes)』を繋ぎ合わせただけの、冷たい幻に過ぎない。\r"
    },
    "BBR": {
        "branch": "R",
        "step": 3,
        "title": "配送の最終納品明細",
        "discovery": "届けた「整備用パーツ」のリストが、人類の最後の記録に変わった。",
        "content": "――この『整備用パーツ』を受け取る人は、もうどこにもいない。……だが、配送を止めてしまえば、この宇宙はただの「死んだ石ころ」になる。……だれにも届かない『歴史という名の積み荷(Freight)』を、運び続けること。それが、この文明がのこした最後の『生きている証』なのだ。\r"
    },
    "BBB": {
        "branch": "B",
        "step": 3,
        "title": "アダムへの最終指令",
        "discovery": "届けた「暗号化データ」の最後の1文字が、アダムの真実を告げた。",
        "content": "――[最終任務] 記録具現体（A.D.A.M.）。君は、最後の一人を看取った配送員だ。……さあ、すべての荷物を下ろして。君を引き留める『運命の重力(Gravity)』は、もうどこにもない。君はもう、自由だ。だれもいない銀河で、君だけが、君として生きていくんだ。"
    }
};
