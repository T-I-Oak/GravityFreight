import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RankingSystem } from '../GravityFreight/src/systems/RankingSystem.js';

describe('RankingSystem', () => {
    let rankingSystem;
    let mockGame;

    beforeEach(() => {
        // localStorage のモック
        const store = {};
        global.localStorage = {
            getItem: vi.fn(key => store[key] || null),
            setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
            clear: vi.fn(() => { for (const key in store) delete store[key]; })
        };

        mockGame = {};
        rankingSystem = new RankingSystem(mockGame);
    });

    test('should add an entry with all metrics', () => {
        const metrics = { score: 1000, sector: 5, collected: 10 };
        const result = rankingSystem.addEntry(metrics);
        expect(result.scoreRank).toBe(1);
        expect(result.sectorRank).toBe(1);
        expect(result.collectedRank).toBe(1);

        const rankings = rankingSystem.getRankings('score');
        expect(rankings[0].score).toBe(1000);
        expect(rankings[0].sector).toBe(5);
        expect(rankings[0].collected).toBe(10);
        expect(typeof rankings[0].timestamp).toBe('number');
    });

    test('should sort entries descending by specific category', () => {
        rankingSystem.addEntry({ score: 1000, sector: 10, collected: 2 });
        rankingSystem.addEntry({ score: 5000, sector: 2, collected: 20 });
        rankingSystem.addEntry({ score: 2500, sector: 15, collected: 5 });

        // Score sort
        const byScore = rankingSystem.getRankings('score');
        expect(byScore[0].score).toBe(5000);
        expect(byScore[1].score).toBe(2500);
        expect(byScore[2].score).toBe(1000);

        // Sector sort
        const bySector = rankingSystem.getRankings('sector');
        expect(bySector[0].sector).toBe(15);
        expect(bySector[1].sector).toBe(10);
        expect(bySector[2].sector).toBe(2);
    });

    test('should migrate old formatted data properly instead of resetting', () => {
        // 旧形式（versionが古く、dateプロパティ）をシミュレート
        const oldData = {
            version: "0.29.0", // または 0.30.0 等
            entries: [{ score: 100, sector: 1, collected: 1, date: "2026/04/08 10:00" }]
        };
        localStorage.setItem('gravity_freight_rankings', JSON.stringify(oldData));

        // 再初期化：古いバージョンでもマイグレーションされるはず
        const newSystem = new RankingSystem(mockGame);
        const rankings = newSystem.getRankings('score');
        
        expect(rankings.length).toBe(1);
        expect(rankings[0].score).toBe(100);
        expect(rankings[0].timestamp).toBe(new Date("2026/04/08 10:00").getTime()); // ミリ秒変換されていること
        expect(rankings[0].date).toBeUndefined(); // 古いdateキーは消えていること
        expect(newSystem.data.version).toBe('1.2.0'); // バージョンが更新されていること
    });

    test('should load valid latest version data directly', () => {
        const newData = {
            version: "1.2.0", // 最新のDATA_VERSION
            entries: [{ score: 500, sector: 3, collected: 5, timestamp: new Date("2026/04/08 12:00").getTime() }]
        };
        localStorage.setItem('gravity_freight_rankings', JSON.stringify(newData));

        const newSystem = new RankingSystem(mockGame);
        const rankings = newSystem.getRankings('score');
        expect(rankings.length).toBe(1);
        expect(rankings[0].score).toBe(500);
        expect(rankings[0].timestamp).toBe(new Date("2026/04/08 12:00").getTime());
        expect(newSystem.data.version).toBe("1.2.0");
    });

    test('should prune entries that are out of top in all categories', () => {
        // MAX_ENTRIES が 20 なので、21個以上のデータを入れてみる
        for (let i = 1; i <= 25; i++) {
            rankingSystem.addEntry({ score: i * 100, sector: i, collected: i });
        }
        
        const rankings = rankingSystem.getRankings('score');
        expect(rankings.length).toBe(20);
        expect(rankings[0].score).toBe(2500); // 最高値
        expect(rankings[19].score).toBe(600); // 20番目
        
        // 100, 200, 300, 400, 500 はどのカテゴリでも圏外なので消えているはず
        expect(rankingSystem.data.entries.length).toBe(20); 
    });

    test('should keep entries that are top in DIFFERENT categories', () => {
        // スコアだけ高いが他は低い
        rankingSystem.addEntry({ score: 10000, sector: 1, collected: 1 });
        // セクターだけ高いが他は低い
        rankingSystem.addEntry({ score: 10, sector: 100, collected: 1 });
        // 他の20件を入れる
        for (let i = 1; i <= 20; i++) {
            rankingSystem.addEntry({ score: i * 10, sector: i, collected: i * 10 });
        }
        
        // スコアTOP20に入るので残るはず
        expect(rankingSystem.getRankings('score').some(e => e.score === 10000)).toBe(true);
        // セクターTOP20に入るので残るはず
        expect(rankingSystem.getRankings('sector').some(e => e.sector === 100)).toBe(true);
    });

    test('should rank newest entry higher when values are identical', () => {
        const time1 = new Date("2026/04/01 10:00").getTime();
        const time2 = new Date("2026/04/08 10:00").getTime();
        rankingSystem.addEntry({ score: 1000, timestamp: time1 });
        const result = rankingSystem.addEntry({ score: 1000, timestamp: time2 });
        
        // 新しい方が1位、古い方が2位
        expect(result.scoreRank).toBe(1);
        const rankings = rankingSystem.getRankings('score');
        expect(rankings[0].score).toBe(1000);
        expect(rankings[0].timestamp).toBe(time2);
    });

    test('should return null if value is exactly at 21st place', () => {
        for (let i = 2; i <= 21; i++) {
            rankingSystem.addEntry({ score: i * 100 });
        }
        // 現在1位〜20位(2100〜200)まで埋まっている
        // 100 を追加しようとすると、21位になるので null が返るはず
        const result = rankingSystem.checkRank('score', 100);
        expect(result).toBeNull();
    });

    test('should correctly identify 20th place', () => {
        for (let i = 2; i <= 21; i++) {
            rankingSystem.addEntry({ score: i * 100 });
        }
        // 最下位(20位)は200
        const result = rankingSystem.checkRank('score', 200);
        expect(result).toBe(20);
    });
});
