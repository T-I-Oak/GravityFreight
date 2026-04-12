/**
 * TutorialSlidesData.js
 * チュートリアルスライドのデータ定義を一元管理する。
 */
import { GOAL_NAMES } from '../../core/Data.js';

export const TUTORIAL_SLIDES = [
    {
        title: 'MISSION: 重力に抗い、残響を届けろ',
        type: 'full-text',
        bgClass: 'bg-slide1',
        content: {
            layout: 'full',
            blocks: [
                {
                    type: 'info',
                    flavor: `あなたは「Gravity Freight Co.」の作業ユニットとして、星々に取り残された荷物（Freight）を回収し、出口（アーク）へ届ける任務に就きました。
宇宙を漂う荷物には、かつてそこで交わされた微かな『軌道の残響（ORBITAL ECHOES）』が記録されています。

限られた資源でロケットを組み上げ、過酷な銀河を突破してください。
<p class="warning">ロケットや発射台が底をつけば、あなたの契約（任務）は強制終了となります。</p>`
                }
            ]
        }
    },
    {
        title: 'CORE LOOP (基本の流れ)',
        type: 'full-text',
        bgClass: 'bg-slide2',
        content: {
            layout: 'full',
            blocks: [
                {
                    type: 'info',
                    intro: '建造したロケットで荷物を運び、出口（アーク）を目指すことがあなたの任務です。',
                    list: {
                        type: 'ol',
                        items: [
                            { title: 'ASSEMBLE', text: '収集したパーツを組み合わせてロケットを建造します。' },
                            { title: 'LAUNCH', text: '建造したロケットとブースターを選択し、宇宙へ発射します。' },
                            { title: 'NAVIGATION', text: '星々の重力を利用して自動航行し、荷物を回収しながら出口（アーク）を目指します。' },
                            { title: 'DELIVERY / RETURN', text: '到達した出口（アーク）に応じた施設での取引、あるいは母星への帰還によって次なる航走に備えます。' }
                        ]
                    }
                },
                {
                    type: 'tip',
                    text: 'このサイクルを繰り返しながらロケットを強化し、より過酷な銀河の深部へと進んでください。'
                }
            ]
        }
    },
    {
        title: '01. ASSEMBLE (建造)',
        type: 'full-text',
        bgClass: 'bg-slide3',
        content: {
            layout: 'split',
            left: [
                {
                    type: 'info',
                    intro: 'はじめにロケットを建造します。',
                    list: {
                        type: 'ol',
                        className: 'number-list',
                        items: [
                            { text: '<strong>ASSEMBLY</strong> タブを選択します。' },
                            { text: '<strong>シャーシ</strong>、<strong>ロジック</strong>を選択します。また、シャーシなどが持つスロットの数だけ<strong>モジュール</strong>を搭載することができます。' },
                            { text: '<strong>ASSEMBLE ROCKET</strong> ボタンを押してロケットを建造します。' }
                        ]
                    }
                },
                {
                    type: 'tip',
                    text: 'パーツの組み合わせにより重量、予測精度、回収範囲が変化します。特定のパーツが特定の役割を担いますが、全体の構成によって最終的な能力が決まります。'
                }
            ],
            right: [
                {
                    type: 'info',
                    id: 'tutorial-assemble-diagram',
                    title: 'ロケットの構築',
                    cards: [
                        { registerId: 'hull_light' },
                        { registerId: 'sensor_short' },
                        { registerId: 'mod_analyzer' }
                    ],
                    button: { 
                        text: 'ASSEMBLE ROCKET',
                        subtext: 'シャーシとロジックを選択すると建造できます',
                        className: 'btn-grad-green btn-neon-sm'
                    }
                }
            ]
        }
    },
    {
        title: '02. LAUNCH (発射)',
        type: 'full-text',
        bgClass: 'bg-slide4',
        content: {
            layout: 'split',
            left: [
                {
                    type: 'info',
                    intro: '発射台を使って建造したロケットを発射します。',
                    list: {
                        type: 'ol',
                        className: 'number-list',
                        items: [
                            { text: '<strong>FLIGHT</strong> タブから、建造済みの <strong>ロケット</strong> と <strong>発射台</strong> を選択します。このとき航行をサポートする <strong>ブースター</strong> を1つ選択することができます。' },
                            { text: 'ロケットと発射台を選択すると母星にロケットが表示されます。タップして <strong>発射方向</strong> を決定します。' },
                            { text: '<strong>LAUNCH ENGINE</strong> ボタンをタップしてロケットを発射します（使用したブースターは消費されます）。' }
                        ]
                    }
                },
                {
                    type: 'tip',
                    text: '発射台は使用回数制限に達すると消失します。発射台がすべてなくなるか、発射するロケットが準備できない場合は任務終了（ゲームオーバー）となります。'
                }
            ],
            right: [
                {
                    type: 'info',
                    id: 'tutorial-launch-diagram',
                    title: 'ロケットの発射',
                    cards: [
                        { 
                            data: {
                                id: 'assembled_rocket_sample',
                                name: '重量シャーシ-広域回収ロジック',
                                category: 'ROCKETS',
                                mass: 4,
                                slots: 1,
                                totalPrecision: 200,
                                precisionMultiplier: 1.0,
                                pickupMultiplier: 1.5,
                                pickupRange: 40,
                                gravityMultiplier: 1.0,
                                modules: [],
                                rarity: 'COMMON'
                            }
                        },
                        { registerId: 'pad_standard_d2' },
                        { registerId: 'opt_fuel' }
                    ],
                    canvasId: 'tutorial-launch-canvas',
                    button: { 
                        text: 'LAUNCH ENGINE',
                        subtext: 'ロケットと発射台を選択すると発射できます',
                        className: 'btn-grad-orange btn-neon-lg bounce'
                    }
                }
            ]
        }
    },
    {
        title: '03. NAVIGATION (宇宙の航行)',
        type: 'full-text',
        bgClass: 'bg-slide5',
        content: {
            layout: 'split',
            left: [
                {
                    type: 'info',
                    intro: '発射したロケットは宇宙空間を自動航行します。',
                    list: {
                        type: 'ul',
                        items: [
                            { title: 'GRAVITY (重力の利用)', text: '発射後は星々の重力に従って自動で航行します。' },
                            { title: 'COLLECT (荷物の回収)', text: '荷物に近づくと自動的に回収されます。回収範囲はパーツ構成で決まります。' },
                            { title: 'ARC (次セクターへ)', text: '出口（アーク）に到達することで次のセクターに移動します。' }
                        ]
                    }
                },
                {
                    type: 'tip',
                    text: '出口（アーク）に到達できず、境界線の外に出るか星へ激突すると、ロケットは失われます。激突した場合、回収していた荷物はすべてその場に残され、ロケットのパーツも一部が残ることがあります。これらは再び回収することができます。'
                }
            ],
            right: [
                {
                    type: 'info',
                    title: 'ロケットの航行',
                    fullWidth: true,
                    canvasId: 'tutorial-navigation-canvas'
                }
            ]
        }
    },
    {
        title: '04. DELIVERY (配送と施設)',
        type: 'full-text',
        bgClass: 'bg-slide6',
        content: {
            layout: 'full',
            blocks: [
                {
                    type: 'info',
                    intro: '出口（アーク）を通過すると、その種類に応じた施設へと移動します。',
                    list: {
                        type: 'ul',
                        items: [
                            { title: GOAL_NAMES.TRADING_POST, className: 'status-trading-post', text: '貨物取引やパーツの売買ができる中継基地。\n不要なパーツを資金に変え、次なる航走の準備を整えるのに最適です。' },
                            { title: GOAL_NAMES.REPAIR_DOCK, className: 'status-repair-dock', text: '発射台の整備やロケットの分解・強化を行える高度な設備。\n発射台の耐久度を回復できるほか、ロケットを分解・整備して強化されたパーツとして回収することで、再構築したロケットの性能向上を図れます。' },
                            { title: GOAL_NAMES.BLACK_MARKET, className: 'status-black-market', text: '通常は流通しない希少なパーツや、性能が強化された一点物のパーツが取引される取引所。\n多額のコインを支払い、強化済みや高レアリティの強力なアイテムを複数入手できます。何が得られるかは運次第ですが、一気に任務を有利に進める好機です。' }
                        ]
                    }
                },
                {
                    type: 'tip',
                    margin: 'margin-top-lg',
                    text: '荷物の中には、特定の施設への配送を目的としたものが存在します。その荷物を、対応した出口（アーク）に届けることで、様々なボーナスが獲得できます。'
                }
            ]
        }
    },
    {
        title: '05. STRATEGY (母星の利用とリスク)',
        type: 'full-text',
        bgClass: 'bg-slide7',
        content: {
            layout: 'full',
            blocks: [
                {
                    type: 'info',
                    list: {
                        type: 'ul',
                        items: [
                            { title: 'HOME STAR (母星への帰還)', text: '航行中に母星（HOME STAR）へ着陸することで、回収したアイテムを安全にインベントリへ移し、確保することができます。' },
                            { title: 'REBOOT (再始動ボーナス)', text: '母星へ帰還するたびに、そのセクターに限り<strong>発射パワーが +10% ずつ加算</strong>されます。重力が強すぎてエリアからの脱出が困難なときは、母星へ戻ってパワーを溜めることで状況を打開できます。' },
                            { title: 'DENSITY (銀河の密度)', text: `セクターを進めていくと徐々に重力が高まっていきます。また<span class="status-black-market">${GOAL_NAMES.BLACK_MARKET}</span> を利用すると、以降の全セクターで出現する星の数が +1 増加します。一度増えた星は元に戻らず、銀河全体の重力密度が永久に高まっていくため、慎重な選択が必要です。` }
                        ]
                    }
                },
                {
                    type: 'tip',
                    text: '施設向けの荷物は、母星に戻ってもインベントリには保管されず、次回の発射時に再び積み込まれます。状況が苦しいときは無理に出口（アーク）を目指さず、一度母星に帰還して態勢を整えてから、改めて目的地を目指すのが賢明です。'
                }
            ]
        }
    }
];
