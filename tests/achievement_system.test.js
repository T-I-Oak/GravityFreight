import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AchievementSystem } from '../GravityFreight/src/systems/AchievementSystem.js';

describe('AchievementSystem', () => {
    let achievementSystem;
    let mockGame;

    beforeEach(() => {
        // localStorage のモック
        const store = {};
        global.localStorage = {
            getItem: vi.fn(key => store[key] || null),
            setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
            clear: vi.fn(() => { for (const key in store) delete store[key]; })
        };

        mockGame = {
            uiSystem: { showAchievementToast: vi.fn((data, cb) => cb()) },
            audioSystem: { playAchievement: vi.fn() }
        };
        achievementSystem = new AchievementSystem(mockGame);
    });

    test('should update cumulative stats', () => {
        achievementSystem.updateStat('stat_runs', 5);
        expect(achievementSystem.stats['stat_runs']).toBe(5);
        
        achievementSystem.updateStat('stat_runs', 2);
        expect(achievementSystem.stats['stat_runs']).toBe(7);
    });

    test('should update max record stats', () => {
        // stat_max_score は isMax: true
        achievementSystem.updateStat('stat_max_score', 1000);
        expect(achievementSystem.stats['stat_max_score']).toBe(1000);
        
        // より小さい値では更新されない
        achievementSystem.updateStat('stat_max_score', 500);
        expect(achievementSystem.stats['stat_max_score']).toBe(1000);
        
        // より大きい値で更新される
        achievementSystem.updateStat('stat_max_score', 2000);
        expect(achievementSystem.stats['stat_max_score']).toBe(2000);
    });

    test('should unlock tiers when threshold is reached', () => {
        // stat_runs: 5 で '最初の契約'
        achievementSystem.updateStat('stat_runs', 5);
        expect(achievementSystem.unlockedIds.has('stat_runs_1')).toBe(true);
        expect(mockGame.uiSystem.showAchievementToast).toHaveBeenCalled();
    });

    test('should calculate derived value from StorySystem progress', () => {
        // localStorage にストーリー進捗をセット
        const storyProgress = { readIds: ['T', 'TR', 'TRT'] };
        localStorage.setItem('gravity_freight_story_progress', JSON.stringify(storyProgress));

        const val = achievementSystem.getDerivedValue('stat_stories_read');
        expect(val).toBe(3);
    });

    test('should unlock branch achievements correctly using unified check', () => {
        // T系のストーリー13個をシミュレート
        const tStories = ['T', 'TT', 'TR', 'TB', 'TTT', 'TTR', 'TTB', 'TRT', 'TRR', 'TRB', 'TBT', 'TBR', 'TBB'];
        const storyProgress = { readIds: tStories };
        localStorage.setItem('gravity_freight_story_progress', JSON.stringify(storyProgress));

        // 汎用チェック関数（これまでのcheckSpecialAchievementsの代わり）
        achievementSystem.checkAll();
        
        expect(achievementSystem.getDerivedValue('stat_t_branch')).toBe(13);
        expect(achievementSystem.unlockedIds.has('achievement_t_branch')).toBe(true);
    });

    test('should persist data to storage', () => {
        achievementSystem.updateStat('stat_launches', 10);
        
        const savedData = JSON.parse(localStorage.getItem('gravity_freight_game_stats'));
        expect(savedData.stats['stat_launches']).toBe(10);
        expect(savedData.unlockedIds).toBeDefined();
    });
});
