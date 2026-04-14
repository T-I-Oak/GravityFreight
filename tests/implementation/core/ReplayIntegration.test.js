/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';

// Mock TitleAnimation
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => {
    return {
        TitleAnimation: class {
            constructor() {}
            start() {}
            stop() {}
            draw() {}
            update() {}
        }
    };
});

describe('Replay Integration: Data Consistency', () => {
    let mockCanvas, mockUI, game;

    beforeEach(() => {
        // 必要最小限の DOM セットアップ
        document.body.innerHTML = `
            <canvas id="gameCanvas"></canvas>
            <div id="ui-layer"></div>
            <div id="title-screen"></div>
            <div id="mission-hud" class="hidden"></div>
            <div id="terminal-panel" class="hidden">
                <div id="chassis-list"></div>
                <div id="logic-list"></div>
                <div id="logic-option-list"></div>
                <div id="acc-option-list"></div>
                <div id="launcher-list"></div>
                <div id="rocket-list"></div>
            </div>
            <div id="build-overlay" class="hidden"></div>
            <div id="launch-control" class="hidden"></div>
            <div id="launch-btn" class="hidden"></div>
            <div id="replay-overlay" class="hidden">
                <button id="exit-replay-btn"></button>
            </div>
            <div id="replay-config-list"></div>
            <canvas id="title-bg-canvas"></canvas>
            <canvas id="title-fg-canvas"></canvas>
            <div id="sector-notification" class="hidden"></div>
            <div id="archive-overlay" class="hidden"></div>
        `;
        mockCanvas = document.getElementById('gameCanvas');
        mockCanvas.getContext = vi.fn().mockReturnValue({
            measureText: () => ({ width: 0 }),
            createLinearGradient: () => ({ addColorStop: () => {} }),
            clearRect: () => {},
            fillRect: () => {},
        });

        // TitleAnimation のモック（グローバルまたはインポートのモックが必要な場合があるが、まずはこれで行く）
        mockUI = { layer: document.getElementById('ui-layer') };
        game = new Game(mockCanvas, mockUI);
    });

    it('should not crash when loading a replay with missing modules property (Regression Test for UISystem.js:323)', () => {
        // [再現用データ] selection 内に modules プロパティが存在しない不完全なデータ
        const malformedReplay = {
            id: 'replay_test',
            recordData: {
                bodies: [],
                goals: [],
                ship: {
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 },
                    rotation: 0,
                    mass: 10,
                    equippedModules: {}
                },
                selection: {
                    chassis: { id: 'hull_light', instanceId: 'inst_c1' },
                    logic: { id: 'logic_basic', instanceId: 'inst_l1' }
                    // modules, booster, launcher 等が欠落している
                }
            }
        };

        // startReplayMode を実行
        // ここで game.selection が malformedReplay.recordData.selection で上書きされる
        game.startReplayMode(malformedReplay);

        // 修正前は、ここで game.selection.modules が undefined になっている
        // UISystem.updateUI() -> renderList() を呼び出すと、
        // game.selection.modules['inst_...'] を参照しようとして TypeError が発生するはず
        
        expect(() => {
            game.updateUI();
        }).not.toThrow();

        // 期待値: game.selection.modules が自動的に空オブジェクトなどで補完されていること
        expect(game.selection.modules).toBeDefined();
        expect(typeof game.selection.modules).toBe('object');
    });

    it('should return to previous state and hide replay UI when stopReplayMode is called', () => {
        // 1. アーカイブ画面の状態をエミュレート
        game.state = 'archive';
        
        const replayDetails = {
            recordData: {
                bodies: [], goals: [], ship: { position: {x:0, y:0}, velocity: {x:0, y:1}, rotation: 0, mass: 10, equippedModules: {} },
                selection: {}
            }
        };

        // 2. リプレイ開始
        game.startReplayMode(replayDetails);
        expect(game.state).toBe('replaying');
        
        const replayOverlay = document.getElementById('replay-overlay');
        expect(replayOverlay.classList.contains('hidden')).toBe(false);

        // 3. リプレイ終了 (ボタンクリック経由)
        const exitBtn = document.getElementById('exit-replay-btn');
        expect(exitBtn).toBeDefined();
        
        // 実際にクリックイベントを発火させる
        exitBtn.click();

        // 4. 検証: ステートが 'archive' に戻っていること
        expect(game.state).toBe('archive');

        // 5. 検証: UI要素が隠されていること
        expect(replayOverlay.classList.contains('hidden')).toBe(true);

        // その他、リプレイ中に表示されるパネルなどもチェック
        const configHud = document.getElementById('replay-config-hud');
        if (configHud) {
            expect(configHud.classList.contains('hidden')).toBe(true);
        }
    });

    it('should close archive UI and return to title screen when hideArchive is called', () => {
        // 1. アーカイブ画面を表示
        game.uiSystem.showArchive();
        expect(game.state).toBe('archive');
        
        const archiveOverlay = document.getElementById('archive-overlay');
        expect(archiveOverlay.classList.contains('hidden')).toBe(false);

        // 2. 閉じるボタン（またはロジック）を実行
        game.uiSystem.hideArchive();

        // 3. 検証: タイトルに戻り、アーカイブが隠れていること
        expect(game.state).toBe('title');
        expect(archiveOverlay.classList.contains('hidden')).toBe(true);
        
        const titleScreen = document.getElementById('title-screen');
        expect(titleScreen.classList.contains('hidden')).toBe(false);
    });

    it('should include pendingScore (bonuses) in the recorded replay score', () => {
        // 1. セットアップ（発射前のスコアを 1000 とする）
        game.score = 1000;
        game.launchScore = 1000;
        
        // 航行中の獲得スコア（Per step加算分など）
        game.score += 500; 

        // 2. ボーナスの発生（内訳管理APIを使用）
        game.addScore(2000, 'bonus'); 
        
        // 保存するためのフライトデータ（モック）
        game.lastFlightRecordData = {
            bodies: [], goals: [], ship: { position: {x:0, y:0}, velocity: {x:0, y:0}, rotation: 0, mass: 10, equippedModules: {} },
            selection: {}
        };

        // 3. ミッション終了（上位に食い込むスコアとして保存される）
        game.showResult('cleared');

        // 期待されるスコア: (1000 + 500 + 2000) - 1000 = 2500
        // 修正前は (1000 + 500) - 1000 = 500 になっていた
        const latestRecord = game.replaySystem.getRecords()[0];
        expect(latestRecord.score).toBe(2500);
    });
});
