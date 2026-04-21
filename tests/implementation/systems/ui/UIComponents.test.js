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
