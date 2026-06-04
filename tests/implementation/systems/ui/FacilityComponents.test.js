import { describe, it, expect } from 'vitest';
import { FacilityComponents } from '../../../../src/systems/ui/FacilityComponents.js';

describe('FacilityComponents.generateHTML', () => {
    it('renders facility metadata, entries, discounts, and credits', () => {
        const html = FacilityComponents.generateHTML({
            name: 'TRADING POST',
            icon: 'T',
            themeClass: 'trading-post',
            description: '貨物取引やパーツの売買ができる中継基地。',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: [
                {
                    id: 'buy',
                    title: '販売中のアイテム',
                    subtitle: 'ステーションで販売されている高度なパーツです。',
                    entries: [
                        {
                            action: 'buy',
                            actionLabel: 'BUY',
                            uid: 'item_1',
                            price: 40,
                            discountPercent: 30,
                            disabled: false,
                            itemViewData: {
                                uid: 'item_1',
                                id: 'sensor_long',
                                name: 'Long Sensor',
                                category: 'logic',
                                stats: {}
                            }
                        }
                    ],
                    emptyText: 'NO ITEMS',
                    emptySubtext: '現在表示できる項目はありません。',
                    themeClass: 'trading-post'
                }
            ]
        });

        expect(html).toContain('Panel trading-post');
        expect(html).toContain('TRADING POST');
        expect(html).toContain('Long Sensor');
        expect(html).toContain('40 c');
        expect(html).toContain('30');
        expect(html).toContain('120 c');
        expect(html).toContain('data-action="buy"');
        expect(html).toContain('data-uid="item_1"');
    });
});
