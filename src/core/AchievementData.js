/**
 * Gravity Freight V2: Achievement Data Definition
 * Structure: Hierarchical (Category -> Tiers)
 * Tier 1 is the highest difficulty (SS Rank color).
 */

export const ACHIEVEMENT_DATA = {
    // 3.1 航行・セクション実績
    stat_runs: {
        label: "累積契約回数",
        tiers: [
            { goal: 100, title: "不屈のコントラクター" },
            { goal: 20, title: "常連の運び屋" },
            { goal: 5, title: "最初の契約" }
        ]
    },
    stat_sectors: {
        label: "最高到達セクター",
        tiers: [
            { goal: 25, title: "深淵を覗く者" },
            { goal: 10, title: "セクター開拓者" },
            { goal: 3, title: "軌道練習生" }
        ]
    },
    stat_total_sectors: {
        label: "累積到達セクター数",
        tiers: [
            { goal: 400, title: "銀河の踏破者" },
            { goal: 5, title: "パスファインダー" },
            { goal: 10, title: "新米開拓員" }
        ]
    },
    stat_launches: {
        label: "累積発射回数",
        tiers: [
            { goal: 1000, title: "銀河の英雄" },
            { goal: 150, title: "安定した打ち上げ" },
            { goal: 20, title: "最初の跳躍" }
        ]
    },

    // 3.2 航行距離実績
    stat_max_dist: {
        label: "最長航行距離",
        tiers: [
            { goal: 10000, title: "宇宙の測量士" },
            { goal: 5000, title: "無限の旅人" },
            { goal: 3000, title: "地平線の彼方" }
        ]
    },
    stat_distance: {
        label: "累積航行距離",
        tiers: [
            { goal: 250000, title: "銀河放浪者" },
            { goal: 30000, title: "星間航行者" },
            { goal: 5000, title: "周回軌道の住人" }
        ]
    },

    // 3.3 ミッション実績
    stat_max_deliveries: {
        label: "最高配達数",
        tiers: [
            { goal: 5, title: "伝説のデリバリー" },
            { goal: 3, title: "精鋭ロジスティクス" },
            { goal: 1, title: "新米運び屋" }
        ]
    },
    stat_deliveries: {
        label: "累積配達数",
        tiers: [
            { goal: 75, title: "軌道の生命線" },
            { goal: 10, title: "信頼の運送屋" },
            { goal: 2, title: "航路の端緒" }
        ]
    },

    // 3.4 評価実績
    stat_max_score: {
        label: "最高スコア",
        tiers: [
            { goal: 150000, title: "伝説の航跡" },
            { goal: 50000, title: "スーパープレイ" },
            { goal: 15000, title: "ハイスコア" }
        ]
    },
    stat_total_score: {
        label: "累積獲得スコア",
        tiers: [
            { goal: 2000000, title: "軌道の生ける伝説" },
            { goal: 200000, title: "高実績パイロット" },
            { goal: 30000, title: "蓄積者" }
        ]
    },

    // 3.5 経済実績
    stat_max_coins_earned: {
        label: "最高獲得コイン",
        tiers: [
            { goal: 2500, title: "ミリオネア・マインド" },
            { goal: 1000, title: "リッチ・フライト" },
            { goal: 300, title: "良い稼ぎ" }
        ]
    },
    stat_total_coins: {
        label: "累積獲得コイン",
        tiers: [
            { goal: 40000, title: "スター・ミリオネア" },
            { goal: 5000, title: "豪商の卵" },
            { goal: 1000, title: "小口取引家" }
        ]
    },
    stat_spend_coins: {
        label: "累積消費コイン",
        tiers: [
            { goal: 35000, title: "経済の心臓" },
            { goal: 4000, title: "寛大な出資者" },
            { goal: 750, title: "良いお客様" }
        ]
    },
    stat_max_coins: {
        label: "最高所持コイン数",
        tiers: [
            { goal: 1000, title: "金庫室の主" },
            { goal: 500, title: "膨らんだ財布" },
            { goal: 300, title: "小銭入れ" }
        ]
    },

    // 4.1 読了数実績
    stat_stories_read: {
        label: "既読ストーリー数",
        tiers: [
            { goal: 39, title: "物語の全知者" },
            { goal: 20, title: "語り部の守人" },
            { goal: 5, title: "聞き手" }
        ]
    },

    // 4.2 コンプリート実績 (1段階のみだが、統一性のために1要素の配列とする)
    stat_t_branch: {
        label: "ストーリー「だれかの願い」",
        tiers: [
            { goal: 13, title: "交易所の語り部" }
        ]
    },
    stat_r_branch: {
        label: "ストーリー「つくる人たち」",
        tiers: [
            { goal: 13, title: "整備工場の語り部" }
        ]
    },
    stat_b_branch: {
        label: "ストーリー「せかいの仕組み」",
        tiers: [
            { goal: 13, title: "闇市場の語り部" }
        ]
    }
};
