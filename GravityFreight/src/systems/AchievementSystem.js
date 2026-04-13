import { StorageUtils } from '../utils/StorageUtils.js';

/**
 * AchievementSystem
 * 累積統計の管理、実績の解除判定、および通知（Toast）の制御を担当するシステム。
 */
export class AchievementSystem {
    constructor(game) {
        this.game = game;
        this.STATS_KEY = 'gravity_freight_game_stats';
        
        // 実績定義
        this.ACHIEVEMENTS = {
            // 航行
            stat_runs: {
                label: '累積契約回数',
                tiers: [
                    { id: 'stat_runs_1', goal: 5, title: '最初の契約' },
                    { id: 'stat_runs_2', goal: 20, title: '常連の運び屋' },
                    { id: 'stat_runs_3', goal: 100, title: '不屈のコントラクター' }
                ]
            },
            stat_sectors: {
                label: '最高到達セクター',
                isMax: true,
                tiers: [
                    { id: 'stat_sectors_1', goal: 3, title: '軌道練習生' },
                    { id: 'stat_sectors_2', goal: 10, title: 'セクター開拓者' },
                    { id: 'stat_sectors_3', goal: 25, title: '深淵を覗く者' }
                ]
            },
            stat_total_sectors: {
                label: '累積到達セクター数',
                tiers: [
                    { id: 'stat_total_sectors_1', goal: 10, title: '新米開拓員' },
                    { id: 'stat_total_sectors_2', goal: 50, title: 'パスファインダー' },
                    { id: 'stat_total_sectors_3', goal: 400, title: '銀河の踏破者' }
                ]
            },
            stat_launches: {
                label: '累積発射回数',
                tiers: [
                    { id: 'stat_launches_1', goal: 20, title: '最初の跳躍' },
                    { id: 'stat_launches_2', goal: 150, title: '安定した打ち上げ' },
                    { id: 'stat_launches_3', goal: 1000, title: '銀河の英雄' }
                ]
            },
            // 距離
            stat_max_dist: {
                label: '最長航行距離',
                isMax: true,
                tiers: [
                    { id: 'stat_max_dist_1', goal: 1000, title: '地平線の彼方' },
                    { id: 'stat_max_dist_2', goal: 2000, title: '無限の旅人' },
                    { id: 'stat_max_dist_3', goal: 5000, title: '宇宙の測量士' }
                ]
            },
            stat_distance: {
                label: '累積航行距離',
                tiers: [
                    { id: 'stat_distance_1', goal: 5000, title: '周回軌道の住人' },
                    { id: 'stat_distance_2', goal: 30000, title: '星間航行者' },
                    { id: 'stat_distance_3', goal: 250000, title: '銀河放浪者' }
                ]
            },
            // 配達
            stat_max_deliveries: {
                label: '最高配達数',
                isMax: true,
                tiers: [
                    { id: 'stat_max_deliveries_1', goal: 1, title: '新米運び屋' },
                    { id: 'stat_max_deliveries_2', goal: 3, title: '精鋭ロジスティクス' },
                    { id: 'stat_max_deliveries_3', goal: 5, title: '伝説のデリバリー' }
                ]
            },
            stat_deliveries: {
                label: '累積配達数',
                tiers: [
                    { id: 'stat_deliveries_1', goal: 2, title: '航路の端緒' },
                    { id: 'stat_deliveries_2', goal: 10, title: '信頼の運送屋' },
                    { id: 'stat_deliveries_3', goal: 75, title: '軌道の生命線' }
                ]
            },
            // スコア
            stat_max_score: {
                label: '最高スコア',
                isMax: true,
                tiers: [
                    { id: 'stat_max_score_1', goal: 15000, title: 'ハイスコア' },
                    { id: 'stat_max_score_2', goal: 50000, title: 'スーパープレイ' },
                    { id: 'stat_max_score_3', goal: 150000, title: '伝説の航跡' }
                ]
            },
            stat_total_score: {
                label: '累積獲得スコア',
                tiers: [
                    { id: 'stat_total_score_1', goal: 30000, title: '蓄積者' },
                    { id: 'stat_total_score_2', goal: 200000, title: '高実績パイロット' },
                    { id: 'stat_total_score_3', goal: 2000000, title: '軌道の生ける伝説' }
                ]
            },
            // 経済
            stat_max_coins_earned: {
                label: '最高獲得コイン',
                isMax: true,
                tiers: [
                    { id: 'stat_max_coins_earned_1', goal: 300, title: '良い稼ぎ' },
                    { id: 'stat_max_coins_earned_2', goal: 1000, title: 'リッチ・フライト' },
                    { id: 'stat_max_coins_earned_3', goal: 2500, title: 'ミリオネア・マインド' }
                ]
            },
            stat_total_coins: {
                label: '累積獲得コイン',
                tiers: [
                    { id: 'stat_total_coins_1', goal: 1000, title: '小口取引家' },
                    { id: 'stat_total_coins_2', goal: 5000, title: '豪商の卵' },
                    { id: 'stat_total_coins_3', goal: 40000, title: 'スター・ミリオネア' }
                ]
            },
            stat_spend_coins: {
                label: '累積消費コイン',
                tiers: [
                    { id: 'stat_spend_coins_1', goal: 750, title: '良いお客様' },
                    { id: 'stat_spend_coins_2', goal: 4000, title: '寛大な出資者' },
                    { id: 'stat_spend_coins_3', goal: 35000, title: '経済の心臓' }
                ]
            },
            stat_max_coins: {
                label: '最高所持コイン',
                isMax: true,
                tiers: [
                    { id: 'stat_max_coins_1', goal: 300, title: '小銭入れ' },
                    { id: 'stat_max_coins_2', goal: 500, title: '膨らんだ財布' },
                    { id: 'stat_max_coins_3', goal: 1000, title: '金庫室の主' }
                ]
            },
            // ストーリー
            stat_stories_read: {
                label: '既読ストーリー数',
                isDerived: true, // StorySystemから取得
                tiers: [
                    { id: 'stat_stories_read_1', goal: 5, title: '聞き手' },
                    { id: 'stat_stories_read_2', goal: 20, title: '語り部の守人' },
                    { id: 'stat_stories_read_3', goal: 39, title: '物語の全知者' }
                ]
            },
            stat_t_branch: {
                label: 'ストーリー「だれかの願い」',
                isDerived: true,
                tiers: [
                    { id: 'achievement_t_branch', goal: 13, title: '交易所の語り部' }
                ]
            },
            stat_r_branch: {
                label: 'ストーリー「つくる人たち」',
                isDerived: true,
                tiers: [
                    { id: 'achievement_r_branch', goal: 13, title: '整備工場の語り部' }
                ]
            },
            stat_b_branch: {
                label: 'ストーリー「せかいの仕組み」',
                isDerived: true,
                tiers: [
                    { id: 'achievement_b_branch', goal: 13, title: '闇市場の語り部' }
                ]
            }
        };

        // 状態
        this.stats = {};
        this.unlockedIds = new Set();
        this.toastQueue = [];
        this.isToastVisible = false;

        this.load();
    }

    /**
     * 実績定義を返す
     */
    getDefinitions() {
        return this.ACHIEVEMENTS;
    }

    /**
     * 統計値を更新し、必要であれば判定を行う
     * @param {string} id 統計ID
     * @param {number} value 追加する値（累積）または新しい値（最高）
     * @param {boolean} forceSet 強制的代入（累積項目を直接セットしたい場合など）
     */
    updateStat(id, value, forceSet = false) {
        const def = this.ACHIEVEMENTS[id];
        if (!def) return;

        if (def.isMax) {
            // 最高記録の更新
            const current = this.stats[id] || 0;
            if (value > current) {
                this.stats[id] = value;
                this.checkAchievements(id);
                this.save();
            }
        } else {
            // 累積
            if (forceSet) {
                this.stats[id] = value;
            } else {
                this.stats[id] = (this.stats[id] || 0) + value;
            }
            this.checkAchievements(id);
            this.save();
        }
    }

    /**
     * 特定の項目の実績条件をチェック
     */
    checkAchievements(statId) {
        const def = this.ACHIEVEMENTS[statId];
        if (!def) return;

        let currentVal = this.stats[statId] || 0;
        
        // ストーリーなど外部参照項目の場合
        if (def.isDerived) {
             currentVal = this.getDerivedValue(statId);
        }

        def.tiers.forEach(tier => {
            if (!this.unlockedIds.has(tier.id) && currentVal >= tier.goal) {
                this.unlock(tier.id, tier.title, def.label, tier.goal);
            }
        });
    }

    /**
     * すべての項目について実績条件をチェックする（外部要因などの再評価用）
     */
    checkAll() {
        Object.keys(this.ACHIEVEMENTS).forEach(id => {
            this.checkAchievements(id);
        });
    }

    /**
     * 外部システムから値を算出する
     */
    getDerivedValue(id) {
        const storyData = StorageUtils.get('gravity_freight_story_progress');
        const readIds = (storyData && storyData.readIds) ? storyData.readIds : [];

        switch (id) {
            case 'stat_stories_read':
                return readIds.length;
            case 'stat_t_branch':
                return readIds.filter(str => str.startsWith('T')).length;
            case 'stat_r_branch':
                return readIds.filter(str => str.startsWith('R')).length;
            case 'stat_b_branch':
                return readIds.filter(str => str.startsWith('B')).length;
            default:
                return 0;
        }
    }

    /**
     * 実績解禁処理
     */
    unlock(id, title, label, goal) {
        if (this.unlockedIds.has(id)) return;

        this.unlockedIds.add(id);
        this.save();

        // トースト通知をキューに追加
        this.queueToast({ id, title, label, goal });
        
        // 解除音
        if (this.game.audioSystem) {
            this.game.audioSystem.playAchievement();
        }
    }

    queueToast(data) {
        this.toastQueue.push(data);
        this.processQueue();
    }

    processQueue() {
        if (this.isToastVisible || this.toastQueue.length === 0) return;

        const data = this.toastQueue.shift();
        this.showToast(data);
    }

    showToast(data) {
        this.isToastVisible = true;
        
        // UI実装時に、UISystem経由または直接DOM操作で表示
        if (this.game.uiSystem && this.game.uiSystem.showAchievementToast) {
            this.game.uiSystem.showAchievementToast(data, () => {
                this.isToastVisible = false;
                this.processQueue();
            });
        } else {
            console.log(`ACHIEVEMENT UNLOCKED: ${data.title} (${data.label}: ${data.goal})`);
            setTimeout(() => {
                this.isToastVisible = false;
                this.processQueue();
            }, 3000);
        }
    }

    save() {
        const data = {
            stats: this.stats,
            unlockedIds: Array.from(this.unlockedIds)
        };
        StorageUtils.set(this.STATS_KEY, data);
    }

    load() {
        const data = StorageUtils.get(this.STATS_KEY);
        if (data) {
            this.stats = data.stats || {};
            this.unlockedIds = new Set(data.unlockedIds || []);
        }
    }
}
