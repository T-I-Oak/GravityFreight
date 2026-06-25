import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlightResultComponents } from '../../../../src/systems/ui/FlightResultComponents.js';

const repository = {
    getStoryContent: vi.fn(id => ({
        T: {
            title: '母からの押し花',
            discovery: '青い花の種',
            content: '青い花の種を封筒に入れた。',
            branch: 'T'
        }
    })[id]),
    getFacilityDefinition: vi.fn(id => ({
        T: { id: 'T', icon: 'T', className: 'trading-post' }
    })[id]),
    getUiText: vi.fn(key => ({
        'flightResult.replay.recorded': 'RECORDED',
        'flightResult.replay.notRecorded': 'NOT RECORDED',
        'flightResult.replay.protected': 'PROTECTED',
        'flightResult.replay.protectRecord': 'PROTECT RECORD',
        'flightResult.sections.performance': 'FLIGHT PERFORMANCE DATA',
        'flightResult.sections.assets': 'COLLECTED SPACE ASSETS',
        'flightResult.stats.score': 'FLIGHT SCORE',
        'flightResult.stats.credits': 'CREDITS EARNED',
        'flightResult.actions.viewMap': 'VIEW MAP',
        'flightResult.actions.continue': 'CONTINUE',
        'flightResult.bonusTitle': 'DELIVERY BONUS'
    })[key])
};

beforeEach(() => {
    repository.getStoryContent.mockClear();
    repository.getFacilityDefinition.mockClear();
    repository.getUiText.mockClear();
});

describe('FlightResultComponents.generateHTML', () => {
    it('renders flight result summary, entries, items, and replay status', () => {
        const item = {
            id: 'cargo_safe',
            uid: 'stack_1',
            name: '通商物資',
            category: 'cargo',
            description: '壊れにくい貨物。',
            count: 2,
            stats: {}
        };
        const bonus = {
            id: 'boost_power',
            uid: 'stack_2',
            name: 'Power Booster',
            category: 'booster',
            stats: {}
        };
        const html = FlightResultComponents.generateHTML({
            title: 'SECTOR 3 COMPLETED',
            themeClass: 'trading-post',
            totalScore: 3260,
            totalCoins: 30,
            actionLabel: 'TO TRADING POST',
            replay: { recorded: true, favorite: false, pending: false },
            entries: [
                { label: 'Flight Duration', score: 260 },
                { label: 'Goal Bonus', score: 3000, coin: 30 },
                { label: 'Delivery Bonus', score: 1500, coin: 310 },
                { label: 'Collected Coins', coin: 100 },
                { label: 'Insurance Payout', coin: 120 }
            ],
            itemReport: [
                { type: 'delivery', status: 'match', item, bonusItems: [bonus] }
            ],
            storyCards: [
                { id: 'T', type: 'T', isUnread: true }
            ]
        }, repository);

        expect(html).toContain('SECTOR 3 COMPLETED');
        expect(html).toContain('data-count-to="3260"');
        expect(html).toContain('data-count-to="3000"');
        expect(html).toContain('data-count-to="30"');
        expect(html).toContain('<span class="report-data-label">Goal Bonus</span>');
        expect(html).toContain('<span class="report-data-label">Delivery Bonus</span>');
        expect(html).toContain('<span class="report-data-value score"><span data-count-to="3000" data-count-prefix="+">+0</span></span>');
        expect(html).toContain('<span class="report-data-value num-coin"><span data-count-to="30" data-count-prefix="+">+0</span></span>');
        expect(html).toContain('<span class="report-data-value num-coin"><span data-count-to="310" data-count-prefix="+">+0</span></span>');
        expect(html).toContain('<span class="report-data-label">Collected Coins</span>');
        expect(html).toContain('<span class="report-data-label">Insurance Payout</span>');
        expect(html).toContain('RECORDED');
        expect(html).toContain('state-recorded');
        expect(html).toContain('PROTECT RECORD');
        expect(html).toContain('通商物資');
        expect(html).toContain('DELIVERY BONUS');
        expect(html).toContain('Power Booster');
        expect(html).toContain('acquired-items-list state-staggered-list');
        expect(html).toContain('class="acquired-item-report state-staggered-item" style="--item-appear-index: 0;"');
        expect(html).toContain('母からの押し花');
        expect(html).toContain('TO TRADING POST');
    });

    it('renders pending replay state for unsaved records', () => {
        const html = FlightResultComponents.generateHTML({
            title: 'LOST IN SPACE',
            themeClass: 'home',
            totalScore: 260,
            totalCoins: 0,
            actionLabel: 'BACK TO BASE',
            replay: { recorded: false, favorite: false, pending: true },
            entries: [],
            itemReport: []
        }, repository);

        expect(html).toContain('NOT RECORDED');
        expect(html).toContain('state-not-recorded');
        expect(html).toContain('PROTECT RECORD');
        expect(html).toContain('BACK TO BASE');
    });
});
