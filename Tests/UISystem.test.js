/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UISystem } from '../GravityFreight/src/systems/UISystem.js';

// TitleAnimation のモック化 (非同期エラー防止)
vi.mock('../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

// Canvas getContext のモック化 (JSDOM用)
// ルール5.1(Fail-Fast)により、nullが返るとクラッシュするため。
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    drawImage: vi.fn()
});

// DOMのモック
document.body.innerHTML = `
    <div id="title-screen">
        <canvas id="title-bg-canvas"></canvas>
        <canvas id="title-fg-canvas"></canvas>
    </div>
    <div id="mission-hud"></div>
    <div id="terminal-panel" class="collapsed">
        <div class="collapse-btn"><span class="icon">∧</span></div>
        <div id="chassis-list"></div>
        <div id="logic-list"></div>
        <div id="logic-option-list"></div>
        <div id="acc-option-list"></div>
        <div id="launcher-list"></div>
        <div id="rocket-list"></div>
        <button id="build-btn"></button>
    </div>
    <div id="build-overlay"></div>
    <div id="launch-btn"></div>
    <div id="launch-control"></div>
    <div id="result-overlay">
        <div id="result-title"></div>
        <div id="result-subtitle"></div>
        <div id="result-stats-list"></div>
        <div id="result-items-list"></div>
        <div id="result-total-score"></div>
        <div id="result-total-coin"></div>
        <button id="result-close-btn"></button>
    </div>
    <div id="event-screen">
        <div id="event-location"></div>
        <div id="event-description"></div>
        <div id="event-content"></div>
        <div id="event-player-credits"></div>
        <button id="event-continue-btn"></button>
    </div>
    <div id="how-to-play-overlay"></div>
    <div id="star-info-panel" data-item-count="0">
        <div id="star-info-list"></div>
        <div id="star-info-title"></div>
    </div>
    <div id="receipt-overlay">
        <div id="receipt-content-area"></div>
    </div>
    <div id="score-display">0</div>
    <div id="coin-display">0</div>
    <div id="sector-display">1</div>
    <div id="flight-tab"></div>
    <div id="factory-tab"></div>
`;

describe('UISystem', () => {
    let game;
    let uiSystem;

    beforeEach(() => {
        game = {
            state: 'title',
            score: 0,
            displayScore: 0,
            coins: 0,
            displayCoins: 0,
            sector: 1,
            isFactoryOpen: false,
            selection: { chassis: null, logic: null, modules: {}, boosters: null },
            inventory: { chassis: [], logic: [], modules: [], boosters: [], rockets: [], launchers: [] }
        };
        uiSystem = new UISystem(game);
    });

    it('should correctly toggle visibility in title state', () => {
        game.state = 'title';
        uiSystem.updateUI();

        const titleScreen = document.getElementById('title-screen');
        const missionHud = document.getElementById('mission-hud');
        const terminalPanel = document.getElementById('terminal-panel');

        expect(titleScreen.classList.contains('hidden')).toBe(false);
        expect(terminalPanel.classList.contains('hidden')).toBe(true);
        expect(missionHud.classList.contains('hidden')).toBe(true);
    });

    it('should correctly toggle visibility in building state', () => {
        game.state = 'building';
        uiSystem.updateUI();

        const titleScreen = document.getElementById('title-screen');
        const missionHud = document.getElementById('mission-hud');
        const terminalPanel = document.getElementById('terminal-panel');
        const buildOverlay = document.getElementById('build-overlay');
        const launchBtn = document.getElementById('launch-btn');

        expect(titleScreen.classList.contains('hidden')).toBe(true);
        expect(terminalPanel.classList.contains('hidden')).toBe(false);
        expect(missionHud.classList.contains('hidden')).toBe(false);
        expect(buildOverlay.classList.contains('hidden')).toBe(false);
        expect(launchBtn.classList.contains('hidden')).toBe(false);
        expect(launchBtn.disabled).toBe(true); // 建造中は無効
    });

    it('should enable launch button in aiming state', () => {
        game.state = 'aiming';
        uiSystem.updateUI();

        const launchBtn = document.getElementById('launch-btn');
        expect(launchBtn.classList.contains('hidden')).toBe(false);
        expect(launchBtn.disabled).toBe(false); // エイミング中は有効
    });

    it('should hide result overlay during animation states (cleared, crashed, etc.)', () => {
        game.state = 'cleared';
        uiSystem.updateUI();
        const resultOverlay = document.getElementById('result-overlay');
        expect(resultOverlay.classList.contains('hidden')).toBe(true);
    });

    it('should show result overlay in result or gameover states', () => {
        game.state = 'result';
        uiSystem.updateUI();
        const resultOverlay = document.getElementById('result-overlay');
        expect(resultOverlay.classList.contains('hidden')).toBe(false);

        game.state = 'gameover';
        uiSystem.updateUI();
        const receiptOverlay = document.getElementById('receipt-overlay');
        expect(receiptOverlay.classList.contains('hidden')).toBe(false);
        expect(resultOverlay.classList.contains('hidden')).toBe(false); // 重ねて表示する仕様に変更
    });
    it('should throw error for invalid states (Rule 5.1 Fail-Fast)', () => {
        game.state = 'invalid_state_123';
        expect(() => uiSystem.updateUI()).toThrow('Invalid game state detected');
        
        // 有効な追加ステートで投げないことを確認
        game.state = 'result';
        expect(() => uiSystem.updateUI()).not.toThrow();
        game.state = 'gameover';
        expect(() => uiSystem.updateUI()).not.toThrow();
    });

    it('should apply heavy reset in title state (inline styles)', () => {
        game.state = 'title';
        const missionHud = document.getElementById('mission-hud');
        const launchBtn = document.getElementById('launch-btn');
        
        // シミュレーション: 以前に表示されていた状態
        missionHud.style.display = 'block';
        launchBtn.style.display = 'block';
        
        uiSystem.updateUI();

        expect(missionHud.classList.contains('hidden')).toBe(true);
        expect(missionHud.style.display).toBe('none');
        expect(launchBtn.classList.contains('hidden')).toBe(true);
        expect(launchBtn.style.display).toBe('none');
    });

    it('should restore styles in building state after title-reset', () => {
        // 1. タイトル状態での重いリセットをシミュレート
        game.state = 'title';
        uiSystem.updateUI();
        
        const missionHud = document.getElementById('mission-hud');
        const launchBtn = document.getElementById('launch-btn');
        expect(missionHud.style.display).toBe('none');
        expect(launchBtn.style.display).toBe('none');

        // 2. ビルディング状態へ遷移
        game.state = 'building';
        uiSystem.updateUI();

        // 全主要要素のインラインスタイルが除去されていることを確認
        expect(missionHud.classList.contains('hidden')).toBe(false);
        expect(missionHud.style.display).toBe('');
        expect(launchBtn.classList.contains('hidden')).toBe(false);
        expect(launchBtn.style.display).toBe('');
    });
});
