/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UISystem } from '../../../GravityFreight/src/systems/UISystem.js';
import { setupStandardDOM } from '../../test-utils.js';

describe('UISystem - Terminal Report Core Logic (Preservation Test)', () => {
    let game;
    let ui;

    beforeEach(() => {
        setupStandardDOM();
        // Mock requestAnimationFrame to execute immediately
        vi.stubGlobal('requestAnimationFrame', vi.fn(cb => cb()));
        // Mock game object with necessary propertiesm
        game = {
            sector: 5,
            score: 50000,
            totalCollectedItems: 20,
            rankingSystem: {
                addEntry: vi.fn((key, val) => ({ rank: 1, isNewBest: true })),
                checkRank: vi.fn((key, val) => 1)
            },
            storySystem: { sessionUnlocked: [], isRead: () => true },
            updateUI: vi.fn(),
            fullReset: vi.fn(),
            isGameOver: () => true
        };
        ui = new UISystem(game);
    });

    it('should generate correct terminal report content', () => {
        const overlay = document.getElementById('receipt-overlay');
        const content = document.getElementById('receipt-content-area');
        
        ui.showTerminalReport();
        
        expect(overlay.classList.contains('hidden')).toBe(false);
        expect(content.innerHTML).toContain('TERMINAL REPORT');
        expect(content.innerHTML).toContain('SECTORS COMPLETED');
        expect(content.innerHTML).toContain('4 SCS'); // sector - 1
        expect(content.innerHTML).toContain('TOTAL COLLECTED');
        expect(content.innerHTML).toContain('20 PCS');
        expect(content.innerHTML).toContain('FINAL SCORE');
        expect(content.innerHTML).toContain('50,000 PTS');
    });

    it('should assign a grade based on values', () => {
        // Test _getGradeInfo specifically as it is core to logic
        const infoS = ui._getGradeInfo(100000, 100000); // Perfect score target
        expect(infoS.grade).toBe('S'); // Based on current logic: floor(100/20)=5 -> 'S'
        
        const infoSS = ui._getGradeInfo(150000, 100000); 
        expect(infoSS.grade).toBe('SS');
        
        const infoE = ui._getGradeInfo(0, 100000); 
        expect(infoE.grade).toBe('E');
    });

    it('should render a stamp with correct grade', () => {
        const overlay = document.getElementById('receipt-overlay');
        const content = document.getElementById('receipt-content-area');
        
        ui.showTerminalReport();
        
        const stamp = content.querySelector('.receipt-official-seal');
        expect(stamp).not.toBeNull();
        // Since score is 50,000 and target was 100,000; sqrt(0.5)*100 = ~70?
        // Let's see the _getGradeInfo logic: Math.sqrt(value/target)*100
        // Math.sqrt(50000/100000)*100 = 70.7. index = Math.floor(70.7/20) = 3. grades[3] = 'B'
        expect(stamp.classList.contains('stamp-b')).toBe(true);
    });
});
