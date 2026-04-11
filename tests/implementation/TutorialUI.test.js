// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TutorialUI } from '../../GravityFreight/src/systems/ui/TutorialUI.js';
import { setupStandardDOM } from '../test-utils.js';

// Mock ITEM_REGISTRY and other data
vi.mock('../../GravityFreight/src/core/Data.js', () => ({
    GOAL_NAMES: { TRADING_POST: 'TRADING POST', REPAIR_DOCK: 'REPAIR DOCK', BLACK_MARKET: 'BLACK MARKET' },
    UI_COLORS: { HOME_STAR: '#fff', HOME_STAR_GLOW: '#fff', NORMAL_STAR: '#fff', NORMAL_STAR_GLOW: '#fff' },
    GOAL_COLORS: { TRADING_POST: '#00f', REPAIR_DOCK: '#f00', BLACK_MARKET: '#0f0' },
    CATEGORY_COLORS: { ROCKETS: '#0ff' },
    MAP_CONSTANTS: { HOME_STAR_RADIUS: 50 },
    GAME_BALANCE: { SHIP_START_OFFSET: 10 },
    ITEM_REGISTRY: {},
    hexToRgba: (hex) => hex
}));

describe('TutorialUI Implementation Tests', () => {
    let gameMock;
    let uiSystemMock;
    let tutorialUI;

    beforeEach(() => {
        setupStandardDOM();
        
        // TutorialUIが期待するDOM構造を追加（index.html準拠）
        // += はJSDOMで既存の要素を再構築して参照を壊す可能性があるため、一括代入する
        document.body.innerHTML = `
            <div id="how-to-play-overlay" class="hidden">
                <div id="tutorial-slides"></div>
                <div id="tutorial-dots"></div>
                <button id="prev-tutorial-btn"></button>
                <button id="next-tutorial-btn"></button>
                <button id="tutorial-close-btn-bottom"></button>
            </div>
        `;

        gameMock = {
            generateCardHTML: vi.fn().mockReturnValue('<div class="item-card"></div>')
        };
        uiSystemMock = {};
        
        tutorialUI = new TutorialUI(gameMock, uiSystemMock);
    });

    it('should initialize with correct slide data', () => {
        expect(tutorialUI.slidesData.length).toBeGreaterThan(0);
        expect(tutorialUI.currentTutorialSlide).toBe(0);
        expect(tutorialUI.isTransitioning).toBe(false);
    });

    it('should render slides in the container', () => {
        tutorialUI._ensureInitialized();
        const slides = document.querySelectorAll('.tutorial-slide');
        expect(slides.length).toBe(tutorialUI.slidesData.length);
        expect(slides[0].querySelector('h3').textContent).toBe(tutorialUI.slidesData[0].title);
    });

    it('should show overlay and start at slide 0', async () => {
        vi.useFakeTimers();
        const p = tutorialUI.show();
        
        // updateSlide(0) 内の待機時間 (600ms) を進める
        await vi.advanceTimersByTimeAsync(650);
        await p;
        
        const overlay = document.getElementById('how-to-play-overlay');
        expect(overlay.classList.contains('hidden')).toBe(false);
        expect(tutorialUI.currentTutorialSlide).toBe(0);
        vi.useRealTimers();
    });

    it('should transition to next slide asynchronously', async () => {
        vi.useFakeTimers();
        
        // 明示的に初期化を促す
        const showPromise = tutorialUI.show();
        await vi.advanceTimersByTimeAsync(800);
        await showPromise;
        
        expect(tutorialUI.currentTutorialSlide).toBe(0);
        
        // 遷移開始 (slide 0 -> slide 1)
        const transitionPromise = tutorialUI.nextSlide();
        
        // フェードアウト (400ms) + スライド (600ms) = 1000ms
        await vi.advanceTimersByTimeAsync(1500);
        await transitionPromise;
        
        // マイクロタスクの完了を待機
        await Promise.resolve();
        
        expect(tutorialUI.currentTutorialSlide).toBe(1);
        
        // DOMから直接状態を確認
        const slides = document.querySelectorAll('.tutorial-slide');
        expect(slides[1].classList.contains('is-active')).toBe(true);
        expect(slides[0].classList.contains('is-active')).toBe(false);
        
        vi.useRealTimers();
    });

    it('should stop animations when hidden', () => {
        const stopSpy = vi.spyOn(tutorialUI.diagrams, 'stopAll');
        tutorialUI.hide();
        expect(stopSpy).toHaveBeenCalled();
        expect(document.getElementById('how-to-play-overlay').classList.contains('hidden')).toBe(true);
    });
});
