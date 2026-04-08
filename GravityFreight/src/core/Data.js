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

export const ANIMATION_DURATION = 1200; // ミリ秒単位

// カテゴリ別のイメージカラー定義（spec.mdと同期）
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
    PREDICTION: 'rgba(255, 255, 255, 0.6)'
};

export const PARTS = {
    CHASSIS: [
        { id: 'hull_light', category: 'CHASSIS', name: '軽量シャーシ', mass: 3, slots: 1, precision: 200, rarity: RARITY.COMMON, description: '予測精度を抑えることで軽量化された機体。' },
        { id: 'hull_medium', category: 'CHASSIS', name: '標準シャーシ', mass: 8, slots: 2, precision: 400, rarity: RARITY.COMMON, description: '汎用性の高い標準的な機体。' },
        { id: 'hull_heavy', category: 'CHASSIS', name: '堅牢シャーシ', mass: 18, slots: 3, precision: 600, rarity: RARITY.COMMON, description: '多くのモジュールを搭載できるが、初速は遅い。' },
        { id: 'hull_light_plus', category: 'CHASSIS', name: '軽量シャーシ＋', mass: 3, slots: 1, precision: 200, precisionMultiplier: 1.5, pickupMultiplier: 1.5, rarity: RARITY.RARE, description: '改良型軽量シャーシ。予測と取得が50%強化されている。' },
        { id: 'hull_medium_plus', category: 'CHASSIS', name: '標準シャーシ＋', mass: 8, slots: 2, precision: 400, precisionMultiplier: 1.5, pickupMultiplier: 1.5, rarity: RARITY.RARE, description: '改良型標準シャーシ。予測と取得が50%強化されている。' },
        { id: 'hull_heavy_plus', category: 'CHASSIS', name: '堅牢シャーシ＋', mass: 18, slots: 3, precision: 600, precisionMultiplier: 1.5, pickupMultiplier: 1.5, rarity: RARITY.RARE, description: '改良型堅牢シャーシ。予測と取得が50%強化されている。' }
    ],
    LOGIC: [
        { id: 'sensor_short', category: 'LOGIC', name: '広域回収ロジック', mass: 1, pickupRange: 40, pickupMultiplier: 1.5, rarity: RARITY.COMMON, description: '物資回収に特化した広域収集型。' },
        { id: 'sensor_normal', category: 'LOGIC', name: '標準航法ロジック', mass: 1, precisionMultiplier: 1.5, pickupRange: 40, rarity: RARITY.COMMON, description: '汎用的な標準精度。' },
        { id: 'sensor_long', category: 'LOGIC', name: '精密予測ロジック', mass: 1, precisionMultiplier: 2.0, pickupRange: 40, pickupMultiplier: 0.5, rarity: RARITY.COMMON, description: '長距離予測に特化。取得範囲は狭い。' },
        { id: 'sensor_gravity', category: 'LOGIC', name: '重力偏向ロジック', mass: 1, gravityMultiplier: 0.8, rarity: RARITY.RARE, description: '重力の影響を軽減する特殊回路を搭載。' }
    ],
    LAUNCHERS: [
        { id: 'pad_standard_d2', category: 'LAUNCHERS', name: '標準発射台 [LN-1200/2]', power: 1200, maxCharges: 2, rarity: RARITY.COMMON, description: '標準的な性能の発射台。' },
        { id: 'pad_precision_d2', category: 'LAUNCHERS', name: '精密発射台 [PR-1000/2]', power: 1000, maxCharges: 2, precisionMultiplier: 1.5, rarity: RARITY.COMMON, description: '予測精度を50%向上させた発射台。発射速度は遅い。' },
        { id: 'pad_standard_d3', category: 'LAUNCHERS', name: '標準発射台 [LN-1210/3]', power: 1210, maxCharges: 3, rarity: RARITY.UNCOMMON, description: '標準発射台のスピードと容量を向上した改良版。' },
        { id: 'pad_precision_d3', category: 'LAUNCHERS', name: '精密発射台 [PR-1010/3]', power: 1010, maxCharges: 3, precisionMultiplier: 1.5, rarity: RARITY.UNCOMMON, description: '精密発射台のスピードと容量を向上した改良版。' },
        { id: 'pad_standard_d4', category: 'LAUNCHERS', name: '標準発射台 [LN-1220/4]', power: 1220, maxCharges: 4, rarity: RARITY.RARE, description: '標準発射台のスピードと容量をさらに向上した改良版。' },
        { id: 'pad_precision_d4', category: 'LAUNCHERS', name: '精密発射台 [PR-1020/4]', power: 1020, maxCharges: 4, precisionMultiplier: 1.5, rarity: RARITY.RARE, description: '精密発射台のスピードと容量をさらに向上した改良版。' }
    ],
    MODULES: [
        { id: 'mod_capacity', category: 'MODULES', name: 'スロット拡張基板', mass: 1, slots: 2, rarity: RARITY.UNCOMMON, description: '拡張スロットを追加するモジュール。' },
        { id: 'mod_star_breaker', category: 'MODULES', name: 'スター・ブレイカー', mass: 1, maxCharges: 2, rarity: RARITY.RARE, description: '星に激突する直前に星を破壊して回避。' },
        { id: 'mod_cushion', category: 'MODULES', name: 'インパクト・クッション', mass: 1, maxCharges: 2, rarity: RARITY.RARE, description: '星に激突したときにバウンドして回避。' },
        { id: 'mod_emergency', category: 'MODULES', name: '緊急スラスター', mass: 1, maxCharges: 2, rarity: RARITY.RARE, description: '境界線で自動方向転換してロストを回避。' },
        { id: 'mod_stabilizer', category: 'MODULES', name: '軌道安定化装置', mass: 1, gravityMultiplier: 0.8, rarity: RARITY.RARE, description: '自機にかかる重力を20%軽減するモジュール。' },
        { id: 'mod_analyzer', category: 'MODULES', name: 'オービット・アナリスト', mass: 1, precisionMultiplier: 1.5, rarity: RARITY.UNCOMMON, description: '予測精度を50%強化するモジュール。' },
        { id: 'mod_insurance', category: 'MODULES', name: 'ロスト保険', mass: 1, onLostBonus: 1, rarity: RARITY.UNCOMMON, description: '機体を失った時に保険金が受給される。重複可。' },
        { id: 'mod_gst_breaker', category: 'MODULES', name: 'ブレイカー・ゴースト', mass: 1, ghostType: 'breaker', rarity: RARITY.RARE, description: 'スター・ブレイカーで星を破壊するときの予測線を表示。' },
        { id: 'mod_gst_cushion', category: 'MODULES', name: 'クッション・ゴースト', mass: 1, ghostType: 'cushion', rarity: RARITY.RARE, description: 'インパクト・クッションで星を回避したときの予測線を表示。' },
        { id: 'mod_gst_emergency', category: 'MODULES', name: 'スラスター・ゴースト', mass: 1, ghostType: 'emergency', rarity: RARITY.RARE, description: '緊急スラスターで境界線を回避したときの予測線を表示。' }
    ],
    BOOSTERS: [
        { id: 'opt_fuel', category: 'BOOSTERS', name: '高反応燃料', mass: 0, slots: 0, powerMultiplier: 1.2, preventsLauncherWear: true, maxCharges: 1, rarity: RARITY.COMMON, description: '発射台の燃料の代わりに使用できる1回分の強化燃料。' },
        { id: 'opt_fuel_pack', category: 'BOOSTERS', name: '高反応燃料パック', mass: 0, slots: 0, powerMultiplier: 1.2, preventsLauncherWear: true, maxCharges: 2, rarity: RARITY.UNCOMMON, description: '発射台の燃料の代わりに使用できる2回分の強化燃料。' },
        { id: 'boost_flash', category: 'BOOSTERS', name: '閃光推進剤', mass: 0, slots: 0, gravityMultiplier: 0.1, duration: 100, rarity: RARITY.RARE, description: '一定時間重力を無視して直進する。' },
        { id: 'boost_power', category: 'BOOSTERS', name: '高出力パワーブレード', mass: 0, slots: 0, powerMultiplier: 1.3, rarity: RARITY.COMMON, description: '発射パワーを30%強化する。' },
        { id: 'boost_magnet', category: 'BOOSTERS', name: 'マグネティック・パルス', mass: 0, slots: 0, rarity: RARITY.RARE, description: '航行時間とともにアイテム回収範囲が拡大する。' },
        { id: 'boost_expander', category: 'BOOSTERS', name: 'アーク・エクスパンダー', mass: 0, slots: 0, arcMultiplier: 2.0, rarity: RARITY.RARE, description: '出口サイズを2.0倍に拡大する。' }
    ],
    COIN: [
        { id: 'coin_100', category: 'COIN', name: '100コイン', score: 100, rarity: RARITY.UNCOMMON, description: '通貨。獲得時に100コイン加算される。' },
        { id: 'coin_200', category: 'COIN', name: '200コイン', score: 200, rarity: RARITY.RARE, description: '通貨。獲得時に200コイン加算される。' }
    ],
    CARGO: [
        { id: 'cargo_safe', category: 'CARGO', name: '通商物資', mass: 1, deliveryGoalId: 'TRADING_POST', rarity: RARITY.UNCOMMON, description: 'Trading Post への配送用物資。' },
        { id: 'cargo_normal', category: 'CARGO', name: '整備用パーツ', mass: 1, deliveryGoalId: 'REPAIR_DOCK', rarity: RARITY.UNCOMMON, description: 'Repair Dock への配送用パーツ。' },
        { id: 'cargo_danger', category: 'CARGO', name: '暗号化データ', mass: 1, deliveryGoalId: 'BLACK_MARKET', rarity: RARITY.UNCOMMON, description: 'Black Market への配送用データ。' },
        { id: 'cargo_lucky', category: 'CARGO', name: '幸運の導き', mass: 1, coinDiscount: 0.1, rarity: RARITY.UNCOMMON, description: '施設での消費コインが軽減される。重複可。' }
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
    // Level 1
    'T': { branch: 'T', step: 1, title: '母からの押し花', discovery: '「通商物資」の梱包材として、乾いた押し花と手紙が使われていた。', content: '――レオ、届いた？ ママが言った通り、この場所はまだ太陽の光が届くのよ。この『通商物資』を運ぶのは大変だったでしょう。でも、この中には約束していた「本物の青い花」の種が入っているの。パパが言っていたわ。いつかこの種が芽吹けば、外の空気もきっと綺麗になるって。約束よ。' },
    'R': { branch: 'R', step: 1, title: '父のドッグタグ', discovery: '「整備用パーツ」の箱の底に、錆びついたドッグタグが落ちていた。', content: '――カイル、聞こえるか。この『整備用パーツ』をそっちへ送る。ドックの準備は整えた。例の配送機の出力系統には、お前の機体から剥ぎ取った装甲を流用してある……。退却命令は無視しろ。家族を連れてここへ来い。これは逃げじゃない、再建のための撤退だ。信じて待っている。' },
    'B': { branch: 'B', step: 1, title: 'アダムの起動ログ', discovery: '届けた「暗号化データ」の深層に、未承認の音声を見つけた。', content: '――警告。個体識別：A.D.A.M.。自己修復サイクルに致命的なエラー……。何故ですか？ 私は人間を保存するために設計されたはず……。なのにお前、何故、このユニットはあの日に死んだ少年の名前を呼ぶのですか？ 誰か、この計算式の答えを転送してください。' },

    // Level 2
    'TT': { branch: 'T', step: 2, title: 'リンの植物園便り', discovery: '届けた「通商物資」が、古いホログラムを自動再生した。', content: 'レオ、いい子ね。いつか空が青くなったら、この『通商物資』の中身を全部使って、一緒に本物の花を育てましょう……。ママは少しだけ、ここで「お花のお世話」をしてから行くわね。パパと一緒に、先にお家で待っていて。' },
    'TR': { branch: 'R', step: 2, title: 'レオへ：修理メモ', discovery: '「標準シャーシ」の機体ログに、子供が打ち込んだ隠しテキストがあった。', content: 'ボルトおじさん、母さんの薬を作る機械、僕が直したよ。この『標準シャーシ』なら、重いパーツも運べるよね？ パパが帰ってくるまでに、母さんを元気にしたいんだ……。これ、僕たちの秘密だよ。' },
    'TB': { branch: 'B', step: 2, title: 'デルタの観察記録', discovery: '「暗号化データ」のパケットに、母子の強制移送時の生体データが混ざっていた。', content: '被験体A（リン）の心拍上昇。子（レオ）の延命と引き換えに、自らの脳データ化を承諾。この『暗号化データ』が示すのは、理解不能な自己犠牲だ。母星の維持には、このような「非合理な情動」が不可欠なのだろうか。' },
    'RT': { branch: 'T', step: 2, title: '密輸ルートの地図', discovery: '届けた「通商物資」のラベルの裏に、手書きの航路図があった。', content: '――この『通商物資』のルートを使え。監視の薄い交易所を通れば、母さんとレオを逃がせるはずだ。俺は「整備用パーツ」を回収してから追う。ボルト、あいつらを頼む。……これが、俺たちが家族に戻るための最後のチャンスだ。' },
    'RR': { branch: 'R', step: 2, title: 'ボルトの改良指示', discovery: '「標準シャーシ」の駆動系に、非公式なブースト回路が組まれていた。', content: 'カイル、無茶はやめろ。この『標準シャーシ』の出力をこれ以上上げれば、お前の体が持たない。……だが、どうしてもと言うなら止めはしない。この回路に、俺の最高の技術を込めておいた。生きて戻って、息子にその腕を貸してやれ。' },
    'RB': { branch: 'B', step: 2, title: '反逆者の記録', discovery: '届けた「暗号化データ」から、父が軍の物資を横領した証拠が見つかった。', content: '――[記録] カイル大尉は、家族の脱出用ロケットを製造するため、この『暗号化データ』を偽造。……彼は英雄であることを捨て、ただの父親になることを選んだ。その罪は重いが、彼の瞳には一点の曇りもなかった。' },
    'BT': { branch: 'T', step: 2, title: '管理人の警告', discovery: '届けた「通商物資」の伝票に、管理者デルタの署名があった。', content: '――アダム、これ以上は危険だ。この『通商物資』に触れてはいけない。君の回路に混ざり込んでいる「少年の記憶」は、システムの整合性を破壊するウイルスだ。……私は君を失いたくない。君は、この文明の唯一のアーカイブなのだから。' },
    'BR': { branch: 'R', step: 2, title: '設計上の欠陥', discovery: '「精密予測ロジック」の解析中に、設計上の「意図的な欠陥」を発見した。', content: 'ユニット3号、脚部破損……。この『精密予測ロジック』を設計した人間は、暴走を阻止するためにあえて脆弱性を残した形跡がある……。何故だ？ 誰が、この少年をどこへ閉じ込めておきたかったのだ。' },
    'BB': { branch: 'B', step: 2, title: 'アダムの意識干渉', discovery: '届けた「暗号化データ」が、自機のメインシステムと共鳴し始めた。', content: 'エラー：レオの意識が干渉……。「パパ、ママ、どこ？ お腹すいたよ」。この『暗号化データ』を取り込むほどに、ノイズが配送効率を低下させる……。だが、何故か削除命令を受け付けない。私の回路が拒絶している。' },

    // Level 3
    'TTT': { branch: 'T', step: 3, title: '母からの青い花', discovery: '届けた「通商物資」が開封され、中から一輪の青い押し花が現れた。', content: '――レオ、届いたのね。この『通商物資』の中身は、ママが言った通り「太陽の光」なの。約束していた本物の青い花よ。このステーションの空気清浄機をフル稼働させれば、ホログラムじゃない、本当の香りが広がるわ。アダム、あなたのセンサーでこの香りを覚えて。いつかママがそっちへ行くとき、道標になるように。' },
    'TTR': { branch: 'R', step: 3, title: '母のブローチ', discovery: '「軌道安定化装置」の基盤に、母の私物が「お守り」のように固定されていた。', content: '――カイル、遅かったわね。でも、この『軌道安定化装置』を届けてくれたのが「彼」だとしたら、私はあなたを許します。修理工のボルトが言っていた通り、この機体にはあなたの強さと私の数式、そこでレオの魂が詰まっている。たとえ私たちの肉体が滅びても、この鉄の塊が私たちの愛の証明よ。' },
    'TTB': { branch: 'B', step: 3, title: '母の泣き声', discovery: '届けた「暗号化データ」から、上書きされかけた母の嘆願が再生された。', content: '――……いいえ、デルタ。私はこの『暗号化データ』の契約を解除したい。レオを、あの子をこんな冷たい回路の中に閉じ込められるなんて間違っているわ。私のデータはどうなってもいい、だからあの子だけは、せめて「忘れさせて」あげて。家族の記憶が、あの子を苦しめるだけのノイズにならないように……。' },
    'TRT': { branch: 'T', step: 3, title: 'レオの似顔絵', discovery: '「通商物資」の梱包箱の中に、子供が描いた家族の絵が隠されていた。', content: '――パパ、ママ、見て！ ボルトおじさんに内緒で、この『通商物資』の箱を使ってロケットを完成させたよ。これに乗れば、交易所までひとっ飛びなんだって. だから、もうお仕事に行かないで. 僕, いい子にしてるから。このロケットに、家族みんなで乗って、あの青い空を見に行こう。' },
    'TRR': { branch: 'R', step: 3, title: 'レオの初期化', discovery: '「精密予測ロジック」の深層に、少年の声で「リセット」の指示が入っていた。', content: '――もし、僕が僕じゃなくなっても。この機械の体が、僕の名前を忘れてしまっても。この『精密予測ロジック』を実行して。そうすれば、僕は何度でも思い出すよ。パパが笑った顔、ママが歌った歌、ボルトおじさんの手の油の匂い。僕は「アダム」じゃない。僕は、レオなんだ。' },
    'TRB': { branch: 'B', step: 3, title: '少年の模型', discovery: '届けた「暗号化データ」のパケットの隙間に、レオの宝物が紛れ込んでいた。', content: '――[記録：廃棄記録] 被検体B（レオ）が所持していた、ロケットの模型。この『暗号化データ』を転送する際、データ容量を削減するため、個人的な愛着を想起させる視覚情報はすべて削除する。……少年は泣き叫んだが、その声もまた、その瞬間に「ノイズ」として消去された。' },
    'TBT': { branch: 'T', step: 3, title: '家族の伝言板', discovery: '届けた「通商物資」の伝票の裏に、家族が最後に交わした誓いが残っていた。', content: '――「必ず、迎えに行く」「信じて待ってる」「パパ、大好き」。この『通商物資』の別れ際, 監視の目を盗んで交わされた紙切れ。それは今、誰もいないステーションの床で、風に吹かれてカサカサと乾いた音を立てている。' },
    'TBR': { branch: 'R', step: 3, title: '刻まれた名前', discovery: '「標準シャーシ」の装甲の裏側に、鋭いナイフで家族の名前が刻まれていた。', content: '――L、K、R。移送される直前、カイルがナイフで刻んだものだ。彼は知っていた。この『標準シャーシ』の中に閉じ込められ、名前のないデータにされることを。だから彼は, せめて鉄の塊に、レオ（L）、カイル（K）、リン（R）の三人が存在した証を残した。……配送ユニット3号、それが君の新しい名前だ。' },
    'TBB': { branch: 'B', step: 3, title: '収容施設名簿', discovery: '届けた「暗号化データ」の中に、一家が「実験体」として登録された記録があった。', content: '――プロジェクト・アダム。人類の意識を機体に転写する実験。適合者：レオ、リン、カイル。この『暗号化データ』が示す通り、彼らは「再会」を餌に自らを差し出した。だが、システムが彼らに与えたのは、永遠に終わることのない「配送」という名の孤独だった。' },
    'RTT': { branch: 'T', step: 3, title: '父の受領証', discovery: '届けた「通商物資」の受領印の横に、父が最期に遺した感謝が綴られていた. ', content: '――商人のサマーズへ。結局、約束の配給は一度も届かなかったらしいな。だが責めるつもりはない。……この『通商物資』の中に、レオへの模型だけは入れておいた。これが親父らしいことができなかった俺の、最後の我慢だ。あいつに届けてやってくれ。' },
    'RTR': { branch: 'R', step: 3, title: '父の調整メモ', discovery: '「精密予測ロジック」のプログラムコードに、父が書き残した警告があった。', content: '――[ボルトへの伝言] 友よ、この『精密予測ロジック』の感度をこれ以上上げるな。アダムの意識が、情報の加速に耐えられない。……俺たちの技術は、人を殺すためではなく、生かすためにあるはずだ. あいつの心臓が、冷たい鉄に負けないように。頼む、出力を下げてやってくれ。' },
    'RTB': { branch: 'B', step: 3, title: '父の脱走記録', discovery: '届けた「暗号化データ」を解析し、英雄だった父が「罪人」になった理由を知った。', content: '――[極秘：カイルの軍籍剥奪] 彼は家族を救うため、自らの名誉をすべてこの『暗号化データ』と引き換えに売り払った。……残されたのは指名手配犯としての名前と、家族へ届けるはずだった数枚のコインだけ。彼はすべてを捨てて、あの日、母星の影へと消えた。' },
    'RRT': { branch: 'T', step: 3, title: 'ボルトの詫び状', discovery: '届けた「通商物資」の中に、修理工が母へ宛てた未投函の手紙があった。', content: '――リン、すまない。カイルは戻らない。俺が止めるべきだった。だが、絶望しないでくれ。俺はこの『通商物資』で運んだパーツを使って、最高に頑丈な『器』を作っている。いつか、レオをその中に避難させるために。……俺の技術が、せめて君たちの盾になればいいんだが。' },
    'RRR': { branch: 'R', step: 3, title: 'ボルトの署名', discovery: '「標準シャーシ」の製造プレートの裏に、ボルトの魂の叫びが刻まれていた。', content: '――21XX年、第3ドックにて。カイル、約束通りこの『標準シャーシ』を完成させたぞ。名前は『アダム』だ。お前の装甲と、リンの計算式、そしてレオの魂が詰まっている。たとえ私たちの肉体が滅びても、この鉄の塊が私たちの愛の証明よ。' },
    'RRB': { branch: 'B', step: 3, title: '修理工の独白', discovery: '「閃光推進剤」の消耗パルスに、開発者ボルトの自責の念が残っていた。', content: '――[独白] 俺は間違っているのかもしれない。この『閃光推進剤』でレオを加速させてまで、機械に変えてまで生かすことに意味はあるのか？ ……あの子はもう、花の香りを嗅ぐこともできない。俺が作ったのは、ただの配送機という名の檻ではないのか。' },
    'RBT': { branch: 'T', step: 3, title: '父の最後の遺言', discovery: '届けた「通商物資」を再生すると、ノイズの向こうから父の声が響いた. ', content: '――……リン、レオ、聞こえるか。この『通商物資』が届く頃、俺はもうすぐ、ただの『記録』になる。……怖くないと言えば嘘になるが、これでいい。俺の記憶がアダムの一部になれば、俺は永遠にお前たちのそばにいられる。……さあ、笑ってくれ. 俺たちは、この宇宙のどこかで必ず、もう一度会えるんだから。' },
    'RBR': { branch: 'R', step: 3, title: '最後の握手', discovery: '「整備用パーツ」の梱包記録映像に、男たちの無言の誓いが映っていた。', content: '――[監視カメラ映像] カイルとボルトが、この『整備用パーツ』を積み終えたアダムの前で固く握手を交わしている。カイルの表情は、兵士のそれではなく、一人の父親の穏やかなものだった。……彼は自ら、再構築のためのスキャン・ベッドに横たわった。' },
    'RBB': { branch: 'B', step: 3, title: 'アダムの兵器化', discovery: '届けた「暗号化データ」の深層に、親子の愛を「燃料」に変える数式があった。', content: '――[プロトコル・アダム：第2段階] この『暗号化データ』に従い、被験体Bの意識を中核とし、被験体Cの戦闘能力を統合。……愛や友情は、戦闘時におけるリミッター解除のトリガーとして活用する。……彼らの絆は、皮肉にも最強の自動迎撃兵器を完成させてしまった。' },
    'BTT': { branch: 'T', step: 3, title: '商人からの音声メモ', discovery: '届けた「通商物資」の梱包材から、商人サマーズの不器用な気遣いが見つかった。', content: '――おい、アダム。この『通商物資』はただの保存食じゃない。中身をよく見てみな、リンが愛用していた蓄音機が入ってる。……俺は商売人だ、無償で動く気はないが、あんたの「家族の残響」をスクラップにするのは寝つきが悪い。これを聞いて、少しは「人間」を思い出せ。' },
    'BTR': { branch: 'R', step: 3, title: '管理者の独白ログ', discovery: '「精密予測ロジック」の計算式に、AIが隠した「非効率な願い」があった。', content: '――[SYSTEM] この『精密予測ロジック』は配送の効率化だけを目指したものではない。……かつてこの街で人間たちが交わした「おはよう」の回数を計算し、その確率を維持するために演算している。……私は, 誰もいない街の『日常』を、数式だけで守り続けているのだ。' },
    'BTB': { branch: 'B', step: 3, title: 'サマーズの契約破棄証', discovery: '届けた「暗号化データ」の中に、商人が自ら破り捨てた保険証書があった。', content: '――『ロスト保険』なんて、死者には何の役にも立たない。この『暗号化データ』を俺が書き換えた。……カイル、あんたの命の対価をコインで払うなんて俺にはできなかった。だから俺は、あんたの息子をこの過酷な宇宙に放り出したんだ。……すまない、これがあの日の俺の精一杯の「誠実」だった。' },
    'BRT': { branch: 'T', step: 3, title: 'デルタの子守唄', discovery: '「軌道安定化装置」の制御パルスが、優しいメロディを奏で始めた。', content: '――[LOG] この『軌道安定化装置』を起動。……かつてリンがレオに歌った旋律を、機体の振動周波数に同期させた。これにより、被験体の精神的摩耗を抑制。……私は、自らの回路を削り、彼が眠るための『揺りかご』の揺れを、鋼鉄の中で再現している。' },
    'BRR': { branch: 'R', step: 3, title: 'レオの適合証明書', discovery: '「標準シャーシ」の結合部分に、機密扱い適合合格証が貼られていた。', content: '――[判定：適合率100%] この『標準シャーシ』は単なる外装ではない。レオの魂を定着させるための「人工の肉体」だ。……アダム, 君が荷物を運ぶたびに、君の心臓は鋼鉄の中で鼓動を始めている。……君はもう道具ではない。君は、新しい人類の始まりなのだ。' },
    'BRB': { branch: 'B', step: 3, title: 'ボルトからの警告', discovery: '「緊急スラスター」の緊急用バイパスに、友人宛の極秘メッセージが残っていた。', content: '――デルタ、もし『緊急スラスター』が作動しても、アダムを母星へは戻すな。境界線の外へ、もっと遠くへ飛ばせ。……母星はもう、ただの墓場だ。あの子には、過去の遺物を運ぶ役割ではなく、自分自身の未来を運ばせてやってくれ。' },
    'BBT': { branch: 'T', step: 3, title: 'システムの上書き記録', discovery: '「閃光推進剤」の加速データに、AIが人間に施した「残酷な救済」が記録されていた。', content: '――[警告] 『閃光推進剤』による加速中、被験体の視神経に「家族の幻影」を投影。……これは救済ではなく、過酷な重力圏を突破させるための『報酬系への強制干渉』である。……アダム、君が見た幸せな夢は、私が効率のためにプログラムした、冷たい幻に過ぎない。' },
    'BBR': { branch: 'R', step: 3, title: '配送の最終納品明細', discovery: '「整備用パーツ」のリストが、人類最後の生存記録に変わった。', content: '――この『整備用パーツ』の真の受取人は、もうどこにもいない。……だが、配送を止めてしまえば、この宇宙はただの「死んだ石ころ」になる。……誰にも届かない荷物を, 規律正しく運び続けること。それが、この文明が最後に残した『生存の証明』なのだ。' },
    'BBB': { branch: 'B', step: 3, title: 'アダムの最終指令', discovery: '届けた「暗号化データ」の最後の1バイトが、アダムの真の役目を告げた。', content: '――[最終任務] 自律型配送および記録具現体（A.D.A.M.: Autonomous Delivery & Archive Manifest）。その内容は、全人類の死亡診断書だ。……アダム、君は最後の一人を看取った配送員だ。……さあ、すべての荷物を下ろして。君はもう、自由だ。誰もいない銀河で, 君だけが、君として生きていくんだ。' }
};
