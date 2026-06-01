import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UIComponents } from '../../../../src/systems/ui/UIComponents.js';

const storyRepository = {
    getStoryContent: vi.fn(id => {
        const stories = {
            T: {
                title: '母からの押し花',
                discovery: '青い花の種',
                content: '青い花の種を封筒に入れた。',
                branch: 'T'
            },
            R: {
                title: '整備士の手紙',
                discovery: '古い工具',
                content: '整備記録が残されている。',
                branch: 'R'
            }
        };
        return stories[id];
    }),
    getFacilityDefinition: vi.fn(id => {
        const facilities = {
            T: { id: 'T', icon: 'T', className: 'trading-post' },
            R: { id: 'R', icon: 'R', className: 'repair-dock' }
        };
        return facilities[id];
    })
};

beforeEach(() => {
    storyRepository.getStoryContent.mockClear();
    storyRepository.getFacilityDefinition.mockClear();
});

describe('UIComponents.generatePlaceholderHTML', () => {
    it('should generate basic placeholder HTML with text and subtext', () => {
        const html = UIComponents.generatePlaceholderHTML('Main Text', 'Sub Text');
        expect(html).toContain('ItemCard placeholder-card');
        expect(html).toContain('<div class="placeholder-text">Main Text</div>');
        expect(html).toContain('<div class="placeholder-subtext">Sub Text</div>');
    });

    it('should apply notable class when isNotable is true', () => {
        const html = UIComponents.generatePlaceholderHTML('T', 'S', { isNotable: true });
        expect(html).toContain('state-notable');
    });

    it('should apply clickable class when isClickable is true', () => {
        const html = UIComponents.generatePlaceholderHTML('T', 'S', { isClickable: true });
        expect(html).toContain('state-clickable');
    });

    it('should apply category class when category is provided', () => {
        const html = UIComponents.generatePlaceholderHTML('T', 'S', { category: 'theme' });
        expect(html).toContain('theme');
    });

    it('should combine multiple options correctly', () => {
        const html = UIComponents.generatePlaceholderHTML('T', 'S', { 
            isNotable: true, 
            isClickable: true, 
            category: 'home' 
        });
        expect(html).toContain('placeholder-card');
        expect(html).toContain('state-notable');
        expect(html).toContain('state-clickable');
        expect(html).toContain('home');
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
        expect(html).toContain('theme-printing');
        expect(html).toContain('AchievementCard state-locked');
        expect(html).toContain('NOT ACHIEVED');
        expect(html).toContain('1 / 5');
        expect(html).toContain('style="width: 20%;"');
    });

    it('should generate tier card when some tiers are achieved', () => {
        const html = UIComponents.generateAchievementCardHTML(mockAchievement, 12);
        expect(html).toContain('AchievementCard');
        expect(html).not.toContain('state-locked');
        expect(html).toContain('最初の契約');
        expect(html).toContain('tier-3');
        expect(html).toContain('12 / 20');
        expect(html).toContain('style="width: 60%;"');
    });

    it('should generate max tier card when all tiers are achieved', () => {
        const html = UIComponents.generateAchievementCardHTML(mockAchievement, 105);
        expect(html).toContain('tier-1');
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
        expect(html).toContain('<article class="ItemCard  booster   "');
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
        expect(html).not.toContain('item-card-description');
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
        expect(html).toContain('item-card-prop state-enhanced additive');
    });

    it('should apply is-enhanced to gauge if charges are enhanced', () => {
        const enhancedItem = {
            ...mockItem,
            enhancement: { charges: 1 }
        };
        const html = UIComponents.generateCardHTML(enhancedItem);
        expect(html).toContain('DurabilityGauge state-enhanced');
    });

    it('should display status badge if provided in options', () => {
        const html = UIComponents.generateCardHTML(mockItem, { status: 'DELIVERED' });
        expect(html).toContain('item-card-status state-delivered');
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

    it('should apply state-compact class and hide description/footer', () => {
        const html = UIComponents.generateCardHTML(mockItem, { isCompact: true });
        expect(html).toContain('ItemCard');
        expect(html).toContain('state-compact');
        // Structure check: Title should exist, but descriptions are hidden via CSS classes
        expect(html).toContain('テストアイテム');
    });

    it('should apply state-mini class to card, gauge, and badge', () => {
        const html = UIComponents.generateCardHTML(mockItem, { isMini: true });
        expect(html).toContain('state-mini');
        // Gauge should have state-mini
        expect(html).toContain('DurabilityGauge');
        expect(html).toContain('state-mini');
        // Stack badge should have state-mini
        expect(html).toContain('Badge item-count');
        expect(html).toContain('state-mini');
    });

    it('should combine state-compact and state-mini correctly', () => {
        const html = UIComponents.generateCardHTML(mockItem, { isCompact: true, isMini: true });
        expect(html).toContain('state-compact');
        expect(html).toContain('state-mini');
    });
});

describe('UIComponents.generateRocketDetailsHTML', () => {
    const mockModules = [
        { name: 'モジュールA', maxCharges: 2, charges: 1 },
        { name: 'モジュールB', count: 3 }
    ];

    it('should generate nested mini-compact cards for rocket details', () => {
        const html = UIComponents.generateRocketDetailsHTML(mockModules);
        expect(html).toContain('rocket-details');
        expect(html).toContain('ItemCard');
        expect(html).toContain('state-compact');
        expect(html).toContain('state-mini');
        expect(html).toContain('モジュールA');
        expect(html).toContain('モジュールB');
    });
});

describe('UIComponents.generateHPGauge', () => {
    it('should generate correct number of segments', () => {
        const html = UIComponents.generateHPGauge(2, 5);
        const activeSegments = (html.match(/state-active/g) || []).length;
        const totalSegments = (html.match(/durability-segment/g) || []).length;
        
        expect(totalSegments).toBe(5);
        expect(activeSegments).toBe(2);
    });

    it('should apply is-enhanced class when isEnhanced is true', () => {
        const html = UIComponents.generateHPGauge(3, 3, true);
        expect(html).toContain('DurabilityGauge state-enhanced');
    });

    it('should apply size class correctly', () => {
        const html = UIComponents.generateHPGauge(1, 1, false, 'state-mini');
        expect(html).toContain('DurabilityGauge');
        expect(html).toContain('state-mini');
    });
});

describe('UIComponents.generateStoryCardHTML', () => {
    it('should generate story card with correct title and discovery text', () => {
        const html = UIComponents.generateStoryCardHTML('T', storyRepository);
        expect(html).toContain('story-card');
        expect(html).toContain('母からの押し花');
        expect(html).toContain('trading-post');
        expect(storyRepository.getStoryContent).toHaveBeenCalledWith('T');
        expect(storyRepository.getFacilityDefinition).toHaveBeenCalledWith('T');
    });

    it('should apply is-new class to icon when isNew is true', () => {
        const html = UIComponents.generateStoryCardHTML('T', storyRepository, true);
        expect(html).toContain('mail state-new');
    });
});

describe('UIComponents.generateStoryModalHTML', () => {
    it('should generate modal with full story content', () => {
        const html = UIComponents.generateStoryModalHTML('T', storyRepository);
        expect(html).toContain('Panel trading-post story-card');
        expect(html).toContain('母からの押し花');
        expect(html).toContain('Well');
        expect(html).toContain('青い花の種');
        expect(html).toContain('story-modal-close');
    });

    it('should include facility icon in header', () => {
        const html = UIComponents.generateStoryModalHTML('R', storyRepository);
        expect(html).toContain('FacilityBadge');
        expect(html).toContain('R');
    });
});

describe('UIComponents.generateAchievementGridHTML', () => {
    const mockAllAchievements = {
        stat_runs: { label: "フライト回数", tiers: [{ goal: 5, title: "T1" }] },
        stat_coins: { label: "獲得コイン", tiers: [{ goal: 100, title: "T1" }] }
    };
    const mockUserStats = { stat_runs: 2, stat_coins: 150 };

    it('should generate a grid containing all provided achievements', () => {
        const html = UIComponents.generateAchievementGridHTML(mockAllAchievements, mockUserStats);
        expect(html).toContain('achievement-showcase ScrollArea');
        
        // Check for specific labels
        expect(html).toContain('フライト回数');
        expect(html).toContain('獲得コイン');
        
        // Check if stats are passed (2/5 for runs, 150/MAX for coins)
        expect(html).toContain('2 / 5');
        expect(html).toContain('MAX');
    });
});
