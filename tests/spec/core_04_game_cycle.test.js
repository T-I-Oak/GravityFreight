/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UISystem } from '../../GravityFreight/src/systems/UISystem.js';
import { setupStandardDOM } from '../test-utils.js';

// TitleAnimation のモック化 (非同期エラー防止)
vi.mock('../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Spec: Game Cycle & Mission Flow (Chapter 5)', () => {
    let game;
    let uiSystem;

    beforeEach(() => {
        setupStandardDOM();

        game = {
            state: 'title',
            score: 0,
            displayScore: 0,
            coins: 0,
            displayCoins: 0,
            launchScore: 0,
            launchCoins: 0,
            sector: 1,
            totalCollectedItems: 0,
            isFactoryOpen: false,
            selection: { chassis: null, logic: null, modules: {}, boosters: null },
            inventory: { chassis: [], logic: [], modules: [], boosters: [], rockets: [], launchers: [] },
            flightResults: { status: '', bonuses: [], items: [] },
            rankingSystem: { checkRank: vi.fn(), addEntry: vi.fn(() => ({ sectorRank: 1, collectedRank: 1, scoreRank: 1 })) },
            storySystem: { unlockedIds: [], hasUnread: vi.fn(() => false), markAsRead: vi.fn() },
            audioSystem: { playTick: vi.fn(), playStamp: vi.fn() },
            addScore: vi.fn(),
            addCoins: vi.fn(),
            achievementSystem: { updateStat: vi.fn() },
            updateUI: vi.fn()
        };
        uiSystem = new UISystem(game);
    });

    it('5.1 TITLE: should show only title screen and hide mission HUD', () => {
        game.state = 'title';
        uiSystem.updateUI();

        const titleScreen = document.getElementById('title-screen');
        const missionHud = document.getElementById('mission-hud');
        const terminalPanel = document.getElementById('terminal-panel');

        expect(titleScreen.classList.contains('hidden')).toBe(false);
        expect(terminalPanel.classList.contains('hidden')).toBe(true);
        expect(missionHud.classList.contains('hidden')).toBe(true);
    });

    it('5.1 BUILDING: should show terminal panel and mission HUD', () => {
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
        expect(launchBtn.disabled).toBe(true); // Must assemble first
    });

    it('5.1 AIMING: should enable launch button', () => {
        game.state = 'aiming';
        uiSystem.updateUI();

        const launchBtn = document.getElementById('launch-btn');
        expect(launchBtn.classList.contains('hidden')).toBe(false);
        expect(launchBtn.disabled).toBe(false);
    });

    it('5.2.D Crashed / 5.2.C Lost: should hide result overlay (until status reached)', () => {
        game.state = 'cleared'; // Intermediate state before result
        uiSystem.updateUI();
        const resultOverlay = document.getElementById('result-overlay');
        expect(resultOverlay.classList.contains('hidden')).toBe(true, 'Result overlay should be hidden in cleared state before showResult()');
    });

    it('5.3 GAMEOVER: should show BOTH result and receipt overlays via showResult("gameover")', () => {
        game.state = 'gameover';
        // showResult('gameover') is the entry point that manages both overlays (Spec 2.6)
        uiSystem.showResult('gameover');
        
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        expect(resultOverlay.classList.contains('hidden')).toBe(false, 'Result overlay should be visible');
        expect(receiptOverlay.classList.contains('hidden')).toBe(false, 'Receipt overlay should be visible');
    });

    it('Fail-Fast: should throw error for invalid states', () => {
        game.state = 'corrupted_state';
        expect(() => uiSystem.updateUI()).toThrow('Invalid game state');
    });
});
