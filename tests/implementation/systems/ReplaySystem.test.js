import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReplaySystem } from '../../../GravityFreight/src/systems/ReplaySystem.js';

describe('ReplaySystem', () => {
    let system;
    let mockGame;

    beforeEach(() => {
        const store = {};
        global.localStorage = {
            getItem: vi.fn(key => store[key] || null),
            setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
            clear: vi.fn(() => { for (const key in store) delete store[key]; })
        };
        localStorage.clear();

        mockGame = {};
        system = new ReplaySystem(mockGame);
    });

    it('should initialize with empty records', () => {
        expect(system.getRecords().length).toBe(0);
    });

    it('should add a new record if within top 10', () => {
        const result = system.addRecord(1000, { seed: 123 });
        expect(result).not.toBeNull();
        expect(result.score).toBe(1000);
        expect(result.id).toBeDefined();
        
        const records = system.getRecords();
        expect(records.length).toBe(1);
        expect(records[0].score).toBe(1000);
        expect(records[0].isFavorite).toBe(false);
    });

    it('should keep only the top 10 score records (auto-deletion)', () => {
        // 11件のデータを追加する
        for (let i = 1; i <= 11; i++) {
            system.addRecord(i * 100, { seed: i });
        }

        const records = system.getRecords();
        // 10件に刈り込まれていること
        expect(records.length).toBe(10);
        // 最もスコアの低い 100 が消え、最高 1100 から最低 200 になっているはず
        expect(records[0].score).toBe(1100);
        expect(records[9].score).toBe(200);
        
        // 100のスコアで新たに追加しても、TOP10に入らないので弾かれる(nullが返る)
        const lowScoreResult = system.addRecord(100, { seed: 999 });
        expect(lowScoreResult).toBeNull();
    });

    it('should allow toggling favorite status up to 5 items', () => {
        // 5件追加
        const ids = [];
        for (let i = 1; i <= 5; i++) {
            const rec = system.addRecord(i * 100, { seed: i });
            ids.push(rec.id);
        }

        // 5件すべてお気に入り登録できる
        ids.forEach(id => {
            const success = system.toggleFavorite(id);
            expect(success).toBe(true);
        });

        const records = system.getRecords();
        expect(records.every(r => r.isFavorite)).toBe(true);

        // 6件目の追加と登録は失敗する
        const rec6 = system.addRecord(600, { seed: 6 });
        const failSuccess = system.toggleFavorite(rec6.id);
        expect(failSuccess).toBe(false); // 5件制限のため失敗
        
        // 既存のお気に入りを解除すると、新しく登録できるようになる
        system.toggleFavorite(ids[0]); // 解除 (true -> false)
        const retrySuccess = system.toggleFavorite(rec6.id);
        expect(retrySuccess).toBe(true);
    });

    it('should protect favorited items from auto-deletion even if they are out of top 10', () => {
        // まずスコア10のデータを作り、お気に入り登録する
        const favRec = system.addRecord(10, { seed: 0 });
        system.toggleFavorite(favRec.id);

        // さらに10件の詳細なデータを入れる (スコア 100 ~ 1000)
        for (let i = 1; i <= 10; i++) {
            system.addRecord(i * 100, { seed: i });
        }

        // お気に入り以外の上位10件 + お気に入りの1件 = 計11件が維持されるはず
        const records = system.getRecords();
        expect(records.length).toBe(11);
        
        // トップは1000
        expect(records[0].score).toBe(1000);
        
        // 最下位(だがお気に入りのため保護された)データが残っている
        const protectedRecord = records.find(r => r.id === favRec.id);
        expect(protectedRecord).toBeDefined();
        expect(protectedRecord.score).toBe(10);
    });

    it('should sort records by score descending, then by timestamp descending', () => {
        // mock Date.now so we can control timestamps
        const originalDateNow = Date.now;
        
        Date.now = vi.fn(() => 1000);
        system.addRecord(500, { seed: 1 });
        
        Date.now = vi.fn(() => 2000);
        system.addRecord(1000, { seed: 2 });
        
        Date.now = vi.fn(() => 3000);
        system.addRecord(500, { seed: 3 });

        Date.now = originalDateNow;

        const records = system.getRecords();
        expect(records.length).toBe(3);
        
        // score=1000 (timestamp=2000)
        expect(records[0].score).toBe(1000);
        
        // score=500 (timestamp=3000) <- newer comes first
        expect(records[1].score).toBe(500);
        expect(records[1].recordData.seed).toBe(3);
        
        // score=500 (timestamp=1000) <- older comes last
        expect(records[2].score).toBe(500);
        expect(records[2].recordData.seed).toBe(1);
    });
});
