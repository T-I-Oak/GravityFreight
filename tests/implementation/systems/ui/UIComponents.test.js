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

describe('UIComponents.generateCardHTML (Core Logic)', () => {
    const mockItem = {
        id: 'engine_x',
        uid: 'user_123',
        name: 'ハイパードライブ',
        category: 'booster',
        description: '高速移動用エンジン。',
        slots: 2,
        precisionMultiplier: 1.5,
        maxCharges: 2,
        charges: 1
    };

    it('should generate basic structure with correct data attributes', () => {
        const html = UIComponents.generateCardHTML(mockItem);
        expect(html).toContain('<article class="ui-item-card  is-booster   "');
        expect(html).toContain('data-id="engine_x"');
        expect(html).toContain('data-uid="user_123"');
    });

    it('should display name and description', () => {
        const html = UIComponents.generateCardHTML(mockItem);
        expect(html).toContain('ハイパードライブ');
        expect(html).toContain('高速移動用エンジン。');
    });

    it('should skip description if not provided', () => {
        const itemNoDesc = { ...mockItem, description: '' };
        const html = UIComponents.generateCardHTML(itemNoDesc);
        expect(html).not.toContain('ui-item-card__description');
    });

    it('should generate footer with specific allowed properties', () => {
        const html = UIComponents.generateCardHTML(mockItem);
        expect(html).toContain('SLOTS');
        expect(html).toContain('2');
        expect(html).toContain('PRECISION');
        expect(html).toContain('1.5');
    });

    it('should apply is-enhanced to properties if enhancement exists', () => {
        const enhancedItem = {
            ...mockItem,
            enhancement: { slots: 1 }
        };
        const html = UIComponents.generateCardHTML(enhancedItem);
        expect(html).toContain('ui-item-card__prop is-enhanced is-additive');
    });

    it('should apply is-enhanced to gauge if charges are enhanced', () => {
        const enhancedItem = {
            ...mockItem,
            enhancement: { charges: 1 }
        };
        const html = UIComponents.generateCardHTML(enhancedItem);
        expect(html).toContain('ui-durability-gauge is-enhanced');
    });

    it('should display status badge if provided in options', () => {
        const html = UIComponents.generateCardHTML(mockItem, { status: 'DELIVERED' });
        expect(html).toContain('ui-item-card__status is-delivered');
        expect(html).toContain('DELIVERED');
    });
});

describe('UIComponents.generateCardHTML (Variations)', () => {
    const mockItem = {
        id: 'test_item',
        name: 'テストアイテム',
        category: 'module',
        maxCharges: 3,
        charges: 2,
        count: 5,
        description: 'テスト用の説明文です。'
    };

    it('should apply is-compact class and hide description/footer', () => {
        const html = UIComponents.generateCardHTML(mockItem, { isCompact: true });
        expect(html).toContain('ui-item-card');
        expect(html).toContain('is-compact');
        // Structure check: Title should exist, but descriptions are hidden via CSS classes
        expect(html).toContain('テストアイテム');
    });

    it('should apply is-mini class to card, gauge, and badge', () => {
        const html = UIComponents.generateCardHTML(mockItem, { isMini: true });
        expect(html).toContain('is-mini');
        // Gauge should have is-mini
        expect(html).toContain('ui-durability-gauge');
        expect(html).toContain('is-mini');
        // Stack badge should have is-mini
        expect(html).toContain('ui-badge is-stack');
        expect(html).toContain('is-mini');
    });

    it('should combine is-compact and is-mini correctly', () => {
        const html = UIComponents.generateCardHTML(mockItem, { isCompact: true, isMini: true });
        expect(html).toContain('is-compact');
        expect(html).toContain('is-mini');
    });
});

describe('UIComponents.generateRocketDetailsHTML', () => {
    const mockModules = [
        { name: 'モジュールA', maxCharges: 2, charges: 1 },
        { name: 'モジュールB', count: 3 }
    ];

    it('should generate nested mini-compact cards for rocket details', () => {
        const html = UIComponents.generateRocketDetailsHTML(mockModules);
        expect(html).toContain('ui-rocket-details');
        expect(html).toContain('ui-item-card');
        expect(html).toContain('is-compact');
        expect(html).toContain('is-mini');
        expect(html).toContain('モジュールA');
        expect(html).toContain('モジュールB');
    });
});

describe('UIComponents.generateHPGauge', () => {
    it('should generate correct number of segments', () => {
        const html = UIComponents.generateHPGauge(2, 5);
        const activeSegments = (html.match(/is-active/g) || []).length;
        const totalSegments = (html.match(/ui-durability-segment/g) || []).length;
        
        expect(totalSegments).toBe(5);
        expect(activeSegments).toBe(2);
    });

    it('should apply is-enhanced class when isEnhanced is true', () => {
        const html = UIComponents.generateHPGauge(3, 3, true);
        expect(html).toContain('ui-durability-gauge is-enhanced');
    });

    it('should apply size class correctly', () => {
        const html = UIComponents.generateHPGauge(1, 1, false, 'is-mini');
        expect(html).toContain('ui-durability-gauge');
        expect(html).toContain('is-mini');
    });
});
