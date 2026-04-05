/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupStandardDOM } from '../../test-utils.js';
import { StorySystem } from '../../../GravityFreight/src/systems/StorySystem.js';

describe('StorySystem', () => {
    let mockGame;
    let storySystem;

    beforeEach(() => {
        setupStandardDOM();
        
        // Mock localStorage behavior
        const store = {};
        vi.spyOn(localStorage, 'getItem').mockImplementation(key => store[key] || null);
        vi.spyOn(localStorage, 'setItem').mockImplementation((key, val) => store[key] = val.toString());

        mockGame = {
            updateUI: vi.fn()
        };
        storySystem = new StorySystem(mockGame);
    });

    it('初期化時に進捗が空であること', () => {
        expect(storySystem.sessionUnlocked).toEqual([]);
        expect(storySystem.currentPath).toBe('');
    });

    it('最初の配送（T）で T が解放されること', () => {
        const id = storySystem.unlockNext('T');
        expect(id).toBe('T');
        expect(storySystem.sessionUnlocked).toContain('T');
        expect(storySystem.currentPath).toBe('T');
    });

    it('T -> R の配送で TR が解放されること', () => {
        storySystem.unlockNext('T');
        storySystem.resetFlightFlag(); // フライト間のフラグリセットをシミュレート
        const id = storySystem.unlockNext('R');
        expect(id).toBe('TR');
        expect(storySystem.sessionUnlocked).toContain('TR');
        expect(storySystem.currentPath).toBe('TR');
    });

    it('T -> R -> B の配送で TRB が解放されること', () => {
        storySystem.unlockNext('T');
        storySystem.resetFlightFlag();
        storySystem.unlockNext('R');
        storySystem.resetFlightFlag();
        const id = storySystem.unlockNext('B');
        expect(id).toBe('TRB');
        expect(storySystem.sessionUnlocked).toContain('TRB');
        expect(storySystem.currentPath).toBe('TRB');
    });

    it('3個を超えて解放しようとしても何も起きないこと', () => {
        storySystem.unlockNext('T');
        storySystem.resetFlightFlag();
        storySystem.unlockNext('R');
        storySystem.resetFlightFlag();
        storySystem.unlockNext('B');
        storySystem.resetFlightFlag();
        const id = storySystem.unlockNext('T');
        expect(id).toBeNull();
        expect(storySystem.sessionUnlocked.length).toBe(3);
    });

    it('同一フライト内では1度しか解放されないこと', () => {
        const id1 = storySystem.unlockNext('T');
        const id2 = storySystem.unlockNext('R');
        expect(id1).toBe('T');
        expect(id2).toBeNull();
        expect(storySystem.sessionUnlocked.length).toBe(1);
    });

    it('未読ストーリーを正しく検知できること', () => {
        expect(storySystem.hasUnread()).toBe(false);
        storySystem.unlockNext('T');
        expect(storySystem.hasUnread()).toBe(true);
        storySystem.markAsRead('T');
        expect(storySystem.hasUnread()).toBe(false);
    });

    it('localStorage から既読データを正常に復元できること', () => {
        storySystem.markAsRead('T');

        // 新しいインスタンス作成
        const newSystem = new StorySystem(mockGame);
        expect(newSystem.isRead('T')).toBe(true);
    });

    it('resetSession() でセッションの進捗がクリアされること', () => {
        storySystem.unlockNext('T');
        storySystem.resetSession();
        expect(storySystem.currentPath).toBe('');
        expect(storySystem.sessionUnlocked).toEqual([]);
    });
});
