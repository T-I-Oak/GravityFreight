/**
 * StorySystem
 * 貨物の配送成功をトリガーとして、ストーリー（メール）の解放および状態を管理するシステム。
 */
export class StorySystem {
    constructor(game) {
        this.game = game;
        this.STORAGE_KEY = 'gravity_freight_story_progress';
        
        // セッション・データ（ゲームごとの分岐履歴）
        this.currentPath = ''; // 行き先の累積パス (例: 'TRT')
        this.sessionUnlocked = []; // 今セッションで解放したストーリーIDの配列
        this.hasUnlockedThisFlight = false; // 同一フライトでの重複解放防止フラグ

        // 永続化データ（既読ステータスなど）
        this.readIds = new Set();
        
        this.load();
    }

    /**
     * 新しいストーリーを解放する
     * @param {string} choice 'T', 'R', 'B' のいずれか
     * ストーリーを一つ進める。
     * @param {string} branch 'T', 'R', 'B' のいずれか
     */
    unlockNext(branch) {
        if (this.sessionUnlocked.length >= 3) return null;
        if (this.hasUnlockedThisFlight) return null;

        this.currentPath += branch;
        const newId = this.currentPath;
        this.sessionUnlocked.push(newId);
        this.hasUnlockedThisFlight = true;

        this.game.updateUI();
        return newId;
    }

    resetFlightFlag() {
        this.hasUnlockedThisFlight = false;
    }

    markAsRead(storyId) {
        this.readIds.add(storyId);
        this.save();
    }

    isRead(storyId) {
        return this.readIds.has(storyId);
    }

    hasUnread() {
        return this.sessionUnlocked.some(id => !this.isRead(id));
    }

    /**
     * 指定された系列（T/R/B）での未読ストーリーがあるか
     */
    hasUnreadForBranch(branchChar) {
        return this.sessionUnlocked.some(id => id.endsWith(branchChar) && !this.isRead(id));
    }

    save() {
        const data = {
            readIds: Array.from(this.readIds)
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                if (data.readIds) this.readIds = new Set(data.readIds);
            }
        } catch (e) {
            console.error("Failed to load story progress", e);
        }
    }

    /**
     * セッションの進捗をリセット (新ゲーム開始時用)
     */
    resetSession() {
        this.currentPath = "";
        this.sessionUnlocked = [];
        this.hasUnlockedThisFlight = false;
    }
}
