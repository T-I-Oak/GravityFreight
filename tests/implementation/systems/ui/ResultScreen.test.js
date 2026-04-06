/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UISystem } from '../../../../GravityFreight/src/systems/UISystem.js';
import { setupStandardDOM } from '../../../test-utils.js';

describe('UISystem - Result Screen Core Logic (Preservation Test)', () => {
    let game;
    let ui;

    beforeEach(() => {
        setupStandardDOM();
        // Mock requestAnimationFrame to execute immediately
        vi.stubGlobal('requestAnimationFrame', vi.fn(cb => cb()));
        // Mock game object with necessary properties
        game = {
            state: 'flying',
            sector: 2,
            score: 1000,
            coins: 50,
            launchScore: 800,
            launchCoins: 40,
            displayScore: 0,
            displayCoins: 0,
            pendingGoalBonus: 0,
            pendingScore: 0,
            pendingCoins: 0,
            flightResults: { bonuses: [], items: [] },
            setState: vi.fn((s) => { game.state = s; }),
            isGameOver: () => false,
            inventory: { chassis: [], logic: [], modules: [], boosters: [], launchers: [], rockets: [] },
            selection: { modules: {} },
            storySystem: { sessionUnlocked: [], isRead: () => true, hasUnlockedThisFlight: false },
            rankingSystem: { checkRank: vi.fn(() => 1), addEntry: vi.fn(() => 1) },
            updateUI: vi.fn()
        };
        ui = new UISystem(game);
    });

    it('should set correct title and visibility in showResult', () => {
        const resultOverlay = document.getElementById('result-overlay');
        const titleEl = document.getElementById('result-title');
        
        ui.showResult('success');
        
        expect(resultOverlay.classList.contains('hidden')).toBe(false);
        expect(titleEl.textContent).toBe('SECTOR 1 COMPLETED');
        expect(game.setState).toHaveBeenCalledWith('result');
    });

    it('should create correct HTML structure in addRow', () => {
        const parent = document.createElement('div');
        ui.resultScreen._resultDelay = 0.5;
        
        ui.resultScreen.addRow(parent, 'Test Label', 123, 'score-class', 'UNIT');
        
        const row = parent.querySelector('.result-row');
        expect(row).not.toBeNull();
        expect(row.classList.contains('stagger-in')).toBe(true);
        expect(row.style.animationDelay).toBe('0.5s');
        
        const mainContent = row.querySelector('.main-content');
        expect(mainContent).not.toBeNull();
        
        const label = mainContent.querySelector('.label');
        expect(label.textContent).toBe('Test Label');
        
        const value = mainContent.querySelector('.value.score-class');
        expect(value.textContent).toBe('+123 UNIT');
    });

    it('should aggregate bonuses correctly in showResult', () => {
        game.flightResults.bonuses = [
            { name: 'Bonus A', value: 10, coins: 5 },
            { name: 'Bonus A', value: 10, coins: 5 }
        ];
        const statsList = document.getElementById('result-stats-list');
        
        ui.showResult('success');
        
        // Bonus A [x 2] should be present
        const bonusRows = Array.from(statsList.querySelectorAll('.result-row'));
        const bonusALabel = bonusRows.find(r => r.textContent.includes('Bonus A [x 2]'));
        expect(bonusALabel).not.toBeNull();
    });

    it('should reset overlay before showing new result', () => {
        const statsList = document.getElementById('result-stats-list');
        statsList.innerHTML = '<div>Old Content</div>';
        
        ui.showResult('success');
        
        expect(statsList.innerHTML).not.toContain('Old Content');
    });

    describe('v0.18.0 Bug Reproduction', () => {
        it('should show success result screen even if the previous session was gameover', () => {
            const resultOverlay = document.getElementById('result-overlay');
            
            // 1. ゲームオーバー発生
            ui.showResult('gameover');
            expect(resultOverlay.classList.contains('hidden')).toBe(false);
            expect(resultOverlay.getAttribute('data-result-type')).toBe('gameover');

            // 2. [バグの核心] UI状態のリセット（fullResetやタイトル戻りを想定）
            // 現状、手動で hidden だけ付与されるケースや、reset() が属性を消さないケースをシミュレート
            ui.resetResultOverlay(); 
            expect(resultOverlay.classList.contains('hidden')).toBe(true);
            
            // 3. 次のプレイで成功
            ui.showResult('success');
            
            // 【検証】表示されているべき
            expect(resultOverlay.classList.contains('hidden')).toBe(false);
            expect(resultOverlay.getAttribute('data-result-type')).toBe('success');
        });
    });
});
