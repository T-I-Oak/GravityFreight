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
        expect(html).toContain('data-facility-credits-value="120"');
        expect(html).toContain('data-action="buy"');
        expect(html).toContain('data-uid="item_1"');
    });

    it('renders grouped sections in a single column', () => {
        const html = FacilityComponents.generateHTML({
            name: 'REPAIR DOCK',
            icon: 'R',
            themeClass: 'repair-dock',
            description: '発射台の整備やロケットの分解・強化を行える高度な設備。',
            coins: 50,
            creditsLabel: 'CREDITS:',
            departLabel: 'DEPART FROM STATION',
            sections: [
                {
                    id: 'maintenance',
                    sections: [
                        {
                            id: 'repair',
                            title: '発射台のメンテナンス',
                            subtitle: 'ランチャーの使用回数を全回復します。',
                            entries: [],
                            emptyText: 'NO REPAIR',
                            emptySubtext: '修理対象はありません。',
                            themeClass: 'repair-dock'
                        },
                        {
                            id: 'dismantle',
                            title: 'ロケットの分解・強化',
                            subtitle: '構成パーツを回収します。',
                            entries: [],
                            emptyText: 'NO ROCKET',
                            emptySubtext: '分解対象はありません。',
                            themeClass: 'repair-dock'
                        }
                    ]
                },
                {
                    id: 'received',
                    title: '強化済みパーツ（受取り）',
                    subtitle: '回収されたパーツの一覧。',
                    entries: [],
                    emptyText: 'NO PARTS',
                    emptySubtext: '受け取り待ちのパーツはありません。',
                    themeClass: 'repair-dock'
                }
            ]
        });

        expect(html).toContain('data-section="maintenance"');
        expect(html).toContain('発射台のメンテナンス');
        expect(html).toContain('ロケットの分解・強化');
        expect(html).toContain('data-section="received"');
    });

    it('applies entry button modifier classes', () => {
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
                    id: 'sell',
                    title: 'パーツの売却',
                    subtitle: '不要なパーツを売却して資金を獲得できます。',
                    entries: [
                        {
                            action: 'sell',
                            actionLabel: 'SELL',
                            uid: 'stack_1',
                            price: 20,
                            discountPercent: 0,
                            disabled: false,
                            buttonClass: 'color-theme-sub',
                            itemViewData: {
                                uid: 'item_1',
                                id: 'hull_light',
                                name: 'Light Hull',
                                category: 'chassis',
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

        expect(html).toContain('Button state-primary facility-action-button color-theme-sub');
    });

    it('stagger-animates received and acquired item lists only', () => {
        const html = FacilityComponents.generateHTML({
            name: 'BLACK MARKET',
            icon: 'B',
            themeClass: 'black-market',
            description: '非正規のパーツ取引所。',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: [
                {
                    id: 'stock',
                    title: '販売中のアイテム',
                    subtitle: '購入候補です。',
                    entries: [
                        {
                            action: 'buy',
                            actionLabel: 'BUY',
                            uid: 'stock_1',
                            price: 100,
                            discountPercent: 0,
                            disabled: false,
                            itemViewData: {
                                uid: 'stock_1',
                                id: 'mod_a',
                                name: 'Stock A',
                                category: 'module',
                                stats: {}
                            }
                        }
                    ],
                    emptyText: 'NO ITEMS',
                    emptySubtext: '現在表示できる項目はありません。',
                    themeClass: 'black-market'
                },
                {
                    id: 'acquired',
                    title: '獲得アイテム',
                    subtitle: '今回取得したアイテムです。',
                    entries: [
                        {
                            action: 'received',
                            actionLabel: '',
                            uid: 'acquired_1',
                            price: 0,
                            discountPercent: 0,
                            hideAction: true,
                            itemViewData: {
                                uid: 'acquired_1',
                                id: 'mod_b',
                                name: 'Acquired B',
                                category: 'module',
                                stats: {}
                            }
                        },
                        {
                            action: 'received',
                            actionLabel: '',
                            uid: 'acquired_2',
                            price: 0,
                            discountPercent: 0,
                            hideAction: true,
                            itemViewData: {
                                uid: 'acquired_2',
                                id: 'mod_c',
                                name: 'Acquired C',
                                category: 'module',
                                stats: {}
                            }
                        }
                    ],
                    emptyText: 'NO ITEMS',
                    emptySubtext: 'まだ獲得していません。',
                    themeClass: 'black-market'
                }
            ]
        });

        expect(html).toContain('data-section="stock"');
        expect(html).toContain('data-section="acquired"');
        expect(html).toContain('<div class="item-list state-staggered-list">');
        expect(html).toContain('class="trade-entry SplitRow state-staggered-item" style="--item-appear-index: 0;" data-action="received" data-uid="acquired_1"');
        expect(html).toContain('class="trade-entry SplitRow state-staggered-item" style="--item-appear-index: 1;" data-action="received" data-uid="acquired_2"');
        expect(html).toContain('class="trade-entry SplitRow"  data-action="buy" data-uid="stock_1"');
    });

    it('renders disabled action buttons as non-clickable buttons', () => {
        const html = FacilityComponents.generateHTML({
            name: 'REPAIR DOCK',
            icon: 'R',
            themeClass: 'repair-dock',
            description: '発射台の整備を行える設備。',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'DEPART FROM STATION',
            sections: [
                {
                    id: 'repair',
                    title: '発射台のメンテナンス',
                    subtitle: 'ランチャーの使用回数を全回復します。',
                    entries: [
                        {
                            action: 'repair',
                            actionLabel: 'REPAIR',
                            uid: 'launcher_full',
                            price: 0,
                            discountPercent: 0,
                            disabled: true,
                            itemViewData: {
                                uid: 'launcher_full',
                                id: 'pad_standard_d2',
                                name: 'Standard Pad',
                                category: 'launcher',
                                stats: {}
                            }
                        }
                    ],
                    emptyText: 'NO LAUNCHERS',
                    emptySubtext: '発射台がありません。',
                    themeClass: 'repair-dock'
                }
            ]
        });

        expect(html).toContain('state-disabled');
        expect(html).toContain('disabled');
    });
});
