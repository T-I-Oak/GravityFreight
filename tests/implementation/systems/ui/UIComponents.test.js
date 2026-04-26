import { describe, it, expect } from 'vitest';
import { UIComponents } from '../../../../src/systems/ui/UIComponents.js';

describe('UIComponents.generatePlaceholderHTML', () => {
    it('should generate basic placeholder HTML with text and subtext', () => {
        const html = UIComponents.generatePlaceholderHTML('Main Text', 'Sub Text');
        expect(html).toContain('ui-item-card is-placeholder');
        expect(html).toContain('<div class="placeholder-text">Main Text</div>');
        expect(html).toContain('<div class="placeholder-subtext">Sub Text</div>');
    });

    it('should apply notable class when isNotable is true', () => {
        const html = UIComponents.generatePlaceholderHTML('T', 'S', { isNotable: true });
        expect(html).toContain('is-notable');
    });

    it('should apply clickable class when isClickable is true', () => {
        const html = UIComponents.generatePlaceholderHTML('T', 'S', { isClickable: true });
        expect(html).toContain('is-clickable');
    });

    it('should apply category class when category is provided', () => {
        const html = UIComponents.generatePlaceholderHTML('T', 'S', { category: 'theme' });
        expect(html).toContain('is-theme');
    });

    it('should combine multiple options correctly', () => {
        const html = UIComponents.generatePlaceholderHTML('T', 'S', { 
            isNotable: true, 
            isClickable: true, 
            category: 'home' 
        });
        expect(html).toContain('is-placeholder');
        expect(html).toContain('is-notable');
        expect(html).toContain('is-clickable');
        expect(html).toContain('is-home');
    });
});

describe('UIComponents.generateAchievementCardHTML', () => {
    const mockAchievement = {
        label: "累積契約回数",
        tiers: [
            { goal: 100, title: "不屈のコントラクター" },
            { goal: 20, title: "常連の運び屋" },
            { goal: 5, title: "最初の契約" }
        ]
    };

    it('should generate locked card when no tiers are achieved', () => {
        const html = UIComponents.generateAchievementCardHTML(mockAchievement, 1);
        expect(html).toContain('ui-style--printing');
        expect(html).toContain('ui-achievement-card is-locked');
        expect(html).toContain('NOT ACHIEVED');
        expect(html).toContain('1 / 5');
        expect(html).toContain('style="width: 20%;"');
    });

    it('should generate tier card when some tiers are achieved', () => {
        const html = UIComponents.generateAchievementCardHTML(mockAchievement, 12);
        expect(html).toContain('ui-achievement-card');
        expect(html).not.toContain('is-locked');
        expect(html).toContain('最初の契約');
        expect(html).toContain('is-tier-3');
        expect(html).toContain('12 / 20');
        expect(html).toContain('style="width: 60%;"');
    });

    it('should generate max tier card when all tiers are achieved', () => {
        const html = UIComponents.generateAchievementCardHTML(mockAchievement, 105);
        expect(html).toContain('is-tier-1');
        expect(html).toContain('不屈のコントラクター');
        expect(html).toContain('MAX');
        expect(html).toContain('style="width: 100%;"');
    });
});
