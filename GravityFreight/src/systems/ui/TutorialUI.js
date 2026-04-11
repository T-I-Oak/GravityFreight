import { GOAL_COLORS, GOAL_NAMES, ITEM_REGISTRY, UI_COLORS, CATEGORY_COLORS, MAP_CONSTANTS, GAME_BALANCE, hexToRgba } from '../../core/Data.js';
import { Renderer } from '../RenderingSystem.js';
import { Vector2 } from '../../utils/Physics.js';

export class TutorialUI {
    constructor(game, uiSystem) {
        this.game = game;
        this.uiSystem = uiSystem;
        this.currentTutorialSlide = 0;
        this.totalTutorialSlides = 0;
        this.lastSlideIndex = null;
        this.isTransitioning = false;
        this._isInitialized = false;
        this.overlay = document.getElementById('how-to-play-overlay');

        // システムカラーをCSS変数として提供し、定義変更への追従性を確保
        this._syncSystemStyles();

        // スライドのデータ定義
        this.slidesData = [
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
                                    { title: 'NAVIGATION', text: '星々の重力を利用して自動航行し、荷物を回収しながらアーク（出口）を目指します。' },
                                    { title: 'DELIVERY / RETURN', text: '到達したアークに応じた施設での取引、あるいは母星への帰還によって次なる航走に備えます。' }
                                ]
                            }
                        },
                        {
                            type: 'tip',
                            text: 'このサイクルを繰り返しながら機体を強化し、より過酷な銀河の深部へと進んでください。'
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
                                subtext: 'シャーシとロジックを選択すると建造できます'
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
                                subtext: 'ロケットと発射台を選択すると発射できます'
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
                            text: '激突した場合、回収していた荷物はすべてその場に残され、ロケットのパーツも一部が残ることがあります。これらは再び回収することができます。'
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
                                    { title: GOAL_NAMES.REPAIR_DOCK, className: 'status-repair-dock', text: '機体の整備やパーツの解体・強化を行える高度な設備。\n発射台の耐久度を回復できるほか、ロケットを解体し強化されたパーツとして回収することで、機体の再構築と性能向上を図れます。' },
                                    { title: GOAL_NAMES.BLACK_MARKET, className: 'status-black-market', text: '通常は流通しない希少なパーツや、性能が強化された一点物のパーツが取引される取引所。\n多額のコインを支払い、強化済みや高レアリティの強力なアイテムを複数入手できます。何が得られるかは運次第ですが、一気に任務を有利に進める好機です。' }
                                ]
                            }
                        },
                        {
                            type: 'tip',
                            margin: 'margin-top-lg',
                            text: '荷物の中には、特定の施設への配送を目的としたものが存在します。その荷物を、対応したアーク（出口）に届けることで、様々なボーナスが獲得できます。'
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
                                    { title: 'DENSITY (銀河の密度)', text: `<span class="status-black-market">${GOAL_NAMES.BLACK_MARKET}</span> を利用すると、以降の全セクターで出現する星の数が +1 増加します。一度増えた星は元に戻らず、銀河全体の重力密度が永久に高まっていくため、慎重な選択が必要です。` }
                                ]
                            }
                        },
                        {
                            type: 'tip',
                            text: '施設向けの荷物は、母星に戻ってもインベントリには保管されず、次回の発射時に再び積み込まれます。状況が苦しいときは無理にアークを目指さず、一度母星に帰還して態勢を整えてから、改めて目的地を目指すのが賢明です。'
                        }
                    ]
                }
            }
        ];
    }

    /**
     * Why: 必要な時のみ初期化しリソースを節約
     */
    _ensureInitialized() {
        if (this._isInitialized) return;

        this.overlay = document.getElementById('how-to-play-overlay');
        if (!this.overlay) throw new Error('TutorialUI overlay element not found');

        this.slidesContainer = document.getElementById('tutorial-slides');
        if (!this.slidesContainer) throw new Error('Tutorial slides container not found');

        this.dotsContainer = document.getElementById('tutorial-dots');
        this.prevBtn = document.getElementById('prev-tutorial-btn');
        this.nextBtn = document.getElementById('next-tutorial-btn');
        this.closeBtn = document.getElementById('tutorial-close-btn-bottom');

        this._renderSlides();
        this._initAnimations();

        this._setupListeners();
        this._isInitialized = true;
    }

    _renderSlides() {
        if (!this.slidesContainer) return;

        this.slidesContainer.innerHTML = '';
        this.slidesData.forEach(slide => {
            const slideDiv = document.createElement('div');
            slideDiv.className = `tutorial-slide ${slide.bgClass || ''}`;

            // コンテンツの形式（文字列 or オブジェクト）に応じて構成を判定
            const isWide = (typeof slide.content === 'string') 
                ? slide.content.includes('split-layout')
                : (slide.content && slide.content.layout === 'split');

            slideDiv.innerHTML = `
                <h3>${slide.title}</h3>
                <div class="slide-content ${slide.type} ${isWide ? 'wide' : ''}">
                    ${this._renderSlideContent(slide.content)}
                </div>
            `;
            this.slidesContainer.appendChild(slideDiv);
        });

        this.totalTutorialSlides = this.slidesData.length;
    }

    _syncSystemStyles() {
        if (!this.overlay) return;

        const styles = {
            '--home-star-color': UI_COLORS.HOME_STAR,
            '--home-star-color-light': '#ffaa44', // 簡易グレア用
            '--home-star-glow': UI_COLORS.HOME_STAR_GLOW,
            '--prediction-color': UI_COLORS.PREDICTION,
            '--rocket-color': CATEGORY_COLORS.ROCKETS,
            '--scanner-color': UI_COLORS.SCANNER,
            '--home-star-radius': `${MAP_CONSTANTS.HOME_STAR_RADIUS}px`,
            '--ship-start-offset': `${GAME_BALANCE.SHIP_START_OFFSET}px`,
            '--trading-post-color': GOAL_COLORS.TRADING_POST,
            '--repair-dock-color': GOAL_COLORS.REPAIR_DOCK,
            '--black-market-color': GOAL_COLORS.BLACK_MARKET
        };

        Object.entries(styles).forEach(([prop, val]) => {
            this.overlay.style.setProperty(prop, val);
        });
    }

    /**
     * Rendererクラスを直接用いて、本編と完全に同一の表現で図解を描画する
     */
    _drawLaunchDiagram(angleOffset = 0, showRocket = true) {
        const canvas = document.getElementById('tutorial-launch-canvas');
        if (!canvas) return;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const renderer = new Renderer(canvas, this.game);
        renderer.clear();

        const centerX = 55;
        const centerY = canvas.height - 30;
        const baseAngle = -Math.PI * 0.12;
        const angle = baseAngle + angleOffset;

        const zoom = 0.6;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(zoom, zoom);
        ctx.translate(-centerX, -centerY);

        const homeStar = {
            position: { x: centerX, y: centerY },
            radius: MAP_CONSTANTS.HOME_STAR_RADIUS,
            isHome: true
        };
        renderer.drawBody(homeStar, UI_COLORS.HOME_STAR, UI_COLORS.HOME_STAR_GLOW);

        if (showRocket) {
            const dist = MAP_CONSTANTS.HOME_STAR_RADIUS + GAME_BALANCE.SHIP_START_OFFSET;
            const shipPos = {
                x: centerX + Math.cos(angle) * dist,
                y: centerY + Math.sin(angle) * dist
            };
            const mockShip = {
                position: shipPos,
                velocity: new Vector2(0, 0),
                rotation: angle,
                pickupRange: 0
            };
            renderer.drawShip(mockShip);

            const pPoints = [];
            for (let i = 0; i < 100; i++) {
                pPoints.push({
                    x: shipPos.x + Math.cos(angle) * (i * 4),
                    y: shipPos.y + Math.sin(angle) * (i * 4)
                });
            }
            renderer.drawPrediction(pPoints);
        }

        ctx.restore();

        if (showRocket) {
            ctx.fillStyle = UI_COLORS.SCANNER;
            ctx.font = 'bold 8px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('TAP TO AIM', canvas.width - 20, canvas.height - 15);
        }
    }

    /**
     * 航行中の三要素イメージを描画
     */
    _drawNavigationDiagram() {
        const canvas = document.getElementById('tutorial-navigation-canvas');
        if (!canvas) return;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const renderer = new Renderer(canvas, this.game);
        renderer.clear();

        // 座標・定数の定義
        const starX = 70;
        const starY = canvas.height / 2 + 15;
        const starRadius = 12;
        const boundaryRadius = 190;

        // 1. Home Star (NORMAL_STAR)
        renderer.drawBody({ position: { x: starX, y: starY }, radius: starRadius }, UI_COLORS.NORMAL_STAR, UI_COLORS.NORMAL_STAR_GLOW);

        ctx.save();
        ctx.translate(starX, starY);

        // 2. 軌跡の定義 (スイングバイ)
        const startX = -60, startY = -40;
        const controlX = 40, controlY = 100;
        const endDist = 160;
        const shipEndAngle = -0.1;
        const endX = Math.cos(shipEndAngle) * endDist;
        const endY = Math.sin(shipEndAngle) * endDist;

        // 航跡の描画
        ctx.strokeStyle = UI_COLORS.TRAIL;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        ctx.stroke();

        // 3. ロケット (接線方向に正確に配置)
        const tangentX = 2 * (endX - controlX);
        const tangentY = 2 * (endY - controlY);
        const shipRotation = Math.atan2(tangentY, tangentX);

        renderer.drawShip({
            position: { x: endX, y: endY },
            rotation: shipRotation,
            velocity: new Vector2(1, 0)
        });

        // 4. アークと曲線ラベルのバランス調整 (本編 drawGoals 準拠)
        const label = GOAL_NAMES.TRADING_POST;
        const textRadius = boundaryRadius + 18;
        ctx.save();
        ctx.font = 'bold 12px Orbitron, sans-serif';
        ctx.fillStyle = GOAL_COLORS.TRADING_POST;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 12;
        ctx.shadowColor = GOAL_COLORS.TRADING_POST;

        let totalWidth = 0;
        const charWidths = [];
        for (let char of label) {
            const w = ctx.measureText(char).width + 3;
            charWidths.push(w);
            totalWidth += w;
        }
        const totalTextAngle = totalWidth / textRadius;

        const arcWidth = totalTextAngle + 0.15;
        const startAngle = -arcWidth / 2;
        const endAngle = arcWidth / 2;

        ctx.save();
        ctx.strokeStyle = GOAL_COLORS.TRADING_POST;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, boundaryRadius, startAngle, endAngle);
        ctx.stroke();
        ctx.restore();

        // ラベル描画
        let currentAngle = -totalTextAngle / 2;
        for (let i = 0; i < label.length; i++) {
            const char = label[i];
            const charW = charWidths[i];
            const angle = currentAngle + (charW / 2) / textRadius;
            ctx.save();
            ctx.rotate(angle);
            ctx.translate(textRadius, 0);
            ctx.rotate(Math.PI / 2);
            ctx.fillText(char, 0, 0);
            ctx.restore();
            currentAngle += charW / textRadius;
        }
        ctx.restore();

        ctx.restore();
    }

    _setupListeners() {
        if (this.prevBtn) {
            this.prevBtn.onclick = () => {
                this.game.audioSystem.playTick();
                this.prevSlide();
            };
        }
        if (this.nextBtn) {
            this.nextBtn.onclick = () => {
                this.game.audioSystem.playTick();
                this.nextSlide();
            };
        }
        if (this.closeBtn) {
            this.closeBtn.onclick = () => {
                this.game.audioSystem.playConfirm();
                this.hide();
            };
        }
    }

    async show() {
        if (!this._isInitialized) {
            this._ensureInitialized();
        }

        if (this.overlay) {
            this.overlay.classList.remove('hidden');
            // スライダーの初期化
            await this.initSlider();
        }
    }

    hide() {
        this._stopAnimations();
        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }
    }

    async initSlider() {
        this._ensureInitialized();
        if (this.dotsContainer) {
            this.dotsContainer.innerHTML = '';
            for (let i = 0; i < this.totalTutorialSlides; i++) {
                const dot = document.createElement('div');
                dot.className = `dot ${i === 0 ? 'active' : ''}`;
                dot.onclick = async (e) => {
                    e.stopPropagation();
                    await this.updateSlide(i);
                };
                this.dotsContainer.appendChild(dot);
            }
        }
        
        // 最初のスライドを表示
        this.currentTutorialSlide = 0;
        this.lastSlideIndex = null;
        await this.updateSlide(0);
    }

    /**
     * 各スライド固有の描画処理（表示タイミングの問題を解決するために分離）
     */
    _drawDiagrams() {
        if (this.currentTutorialSlide === 2) {
            const assembleBase = document.querySelector('#tutorial-assemble-diagram');
            if (!assembleBase) throw new Error('#tutorial-assemble-diagram not found while on slide 3');
            const diagramContainer = assembleBase.querySelector('.block-body');
            if (!diagramContainer) throw new Error('.block-body not found in assemble diagram');
            this._startAssembleAnimation(diagramContainer);
        } else if (this.currentTutorialSlide === 3) {
            setTimeout(() => this._drawLaunchDiagram(), 100);
        } else if (this.currentTutorialSlide === 4) { // 5ページ目 (NAVIGATION)
            setTimeout(() => this._drawNavigationDiagram(), 100);
        }
    }

    async nextSlide() {
        if (this.isTransitioning) return;
        if (this.currentTutorialSlide < this.totalTutorialSlides - 1) {
            await this.updateSlide(this.currentTutorialSlide + 1);
        }
    }

    async prevSlide() {
        if (this.isTransitioning) return;
        if (this.currentTutorialSlide > 0) {
            await this.updateSlide(this.currentTutorialSlide - 1);
        }
    }

    async updateSlide(index) {
        if (index < 0 || index >= this.totalTutorialSlides || this.isTransitioning) return;

        this.isTransitioning = true;
        const slides = this.overlay.querySelectorAll('.tutorial-slide');

        // 1. 現在のコンテンツをフェードアウト
        if (this.lastSlideIndex !== null && slides[this.lastSlideIndex]) {
            slides[this.lastSlideIndex].classList.remove('is-active');
            // フェードアウトの完了を待つ
            await new Promise(resolve => setTimeout(resolve, 400));
        }

        this._stopAnimations();
        this.currentTutorialSlide = index;

        // 2. 背景（トラック）を左右にスライド
        if (this.slidesContainer) {
            this.slidesContainer.style.transform = `translateX(-${index * 100}%)`;
        }

        // スライド移動の完了を待つ (CSS transition: 0.6s)
        await new Promise(resolve => setTimeout(resolve, 600));

        // 3. 次のコンテンツをフェードイン
        const currentSlide = slides[this.currentTutorialSlide];
        if (currentSlide) {
            currentSlide.classList.add('is-active');
        }

        const dots = this.dotsContainer ? this.dotsContainer.querySelectorAll('.dot') : [];
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        // 図解の描画更新
        this._updateSlideDiagrams(index);

        if (this.prevBtn) {
            this.prevBtn.disabled = index === 0;
        }
        if (this.nextBtn) {
            this.nextBtn.disabled = index === this.totalTutorialSlides - 1;
        }

        this.lastSlideIndex = index;
        this.isTransitioning = false;
    }

    _updateSlideDiagrams(index) {
        if (index === 2) {
            const assembleBase = document.querySelector('#tutorial-assemble-diagram');
            if (assembleBase) {
                const diagramContainer = assembleBase.querySelector('.block-body');
                if (diagramContainer) this._startAssembleAnimation(diagramContainer);
            }
        } else if (index === 3) {
            const launchBase = document.querySelector('#tutorial-launch-diagram');
            if (launchBase) {
                const diagramContainer = launchBase.querySelector('.block-body');
                if (diagramContainer) this._startLaunchAnimation(diagramContainer);
            }
        } else if (index === 4) {
            this._startNavigationAnimation();
        }
    }

    /**
     * 航行シミュレーションアニメーションを開始
     */
    _startNavigationAnimation() {
        this._stopAnimations();
        const canvas = document.getElementById('tutorial-navigation-canvas');
        if (!canvas) return;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const ctx = canvas.getContext('2d');
        const renderer = new Renderer(canvas, this.game);

        // 物理・描画定数
        const star = {
            position: new Vector2(80, canvas.height / 2 + 10),
            radius: 12,
            mass: 14000
        };
        const boundaryRadius = 180;
        const goalAngle = 0;

        // 初期化関数
        let shipPos, shipVel, trail, isGoal, isResetting;
        const resetFlight = () => {
            shipPos = new Vector2(-20, canvas.height / 2 - 50);
            shipVel = new Vector2(1.7, 6.2);
            trail = []; // { x, y, alpha }
            isGoal = false;
            isResetting = false;
        };
        resetFlight();

        const animate = () => {
            if (this.currentTutorialSlide !== 4) return;

            // リサイズ追従：表示サイズとバッファサイズがズレていたら同期
            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            if (!isGoal) {
                // 物理演算 (重力)
                const toStar = star.position.sub(shipPos);
                const distSq = Math.max(toStar.lengthSq(), 625); // 衝突回避のためのしきい値を引き上げ
                const forceMag = 3000 / distSq;
                const force = toStar.normalize().scale(forceMag);

                shipVel = shipVel.add(force);
                shipPos = shipPos.add(shipVel);

                // 航跡追加
                trail.push({ x: shipPos.x, y: shipPos.y, alpha: 1.0 });

                // ゴール判定 (アーク到達、または画面端)
                const distFromCenter = shipPos.sub(star.position).length();
                if (distFromCenter >= boundaryRadius) {
                    isGoal = true;
                    isResetting = true;
                }
                if (shipPos.x > canvas.width + 50 || shipPos.y > canvas.height + 50) {
                    isGoal = true;
                    isResetting = true;
                }
            }

            // 航跡の減衰
            trail.forEach(pt => pt.alpha -= 0.008);
            trail = trail.filter(pt => pt.alpha > 0);

            // リセットループ
            if (isResetting && trail.length === 0) {
                resetFlight();
            }

            // --- 描画 ---
            renderer.clear();

            // 1. 恒星
            renderer.drawBody(star, UI_COLORS.NORMAL_STAR, UI_COLORS.NORMAL_STAR_GLOW);

            // 2. アークとラベル
            ctx.save();
            ctx.translate(star.position.x, star.position.y);

            const label = GOAL_NAMES.TRADING_POST;
            const textRadius = boundaryRadius + 15;
            ctx.font = 'bold 12px Orbitron, sans-serif';
            const totalTextWidth = ctx.measureText(label).width + (label.length * 3);
            const totalTextAngle = totalTextWidth / textRadius;
            const arcWidth = totalTextAngle + 0.15;

            // アーク本体
            ctx.save();
            ctx.strokeStyle = GOAL_COLORS.TRADING_POST;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 15;
            ctx.shadowColor = GOAL_COLORS.TRADING_POST;
            ctx.beginPath();
            ctx.arc(0, 0, boundaryRadius, -arcWidth / 2, arcWidth / 2);
            ctx.stroke();
            ctx.restore();

            // 施設名 (曲線配置)
            ctx.fillStyle = GOAL_COLORS.TRADING_POST;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 10;
            ctx.shadowColor = GOAL_COLORS.TRADING_POST;

            let currentAngle = -totalTextAngle / 2;
            for (let i = 0; i < label.length; i++) {
                const char = label[i];
                const charW = ctx.measureText(char).width + 3;
                const angle = currentAngle + (charW / 2) / textRadius;
                ctx.save();
                ctx.rotate(angle);
                ctx.translate(textRadius, 0);
                ctx.rotate(Math.PI / 2);
                ctx.fillText(char, 0, 0);
                ctx.restore();
                currentAngle += charW / textRadius;
            }
            ctx.restore();

            // 3. 航跡の描画
            if (trail.length > 1) {
                ctx.save();
                ctx.lineWidth = 1.5;
                for (let i = 1; i < trail.length; i++) {
                    const p1 = trail[i - 1];
                    const p2 = trail[i];
                    ctx.strokeStyle = UI_COLORS.TRAIL;
                    ctx.globalAlpha = p2.alpha;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // 4. ロケット (描画を確実に行う)
            if (!isGoal) {
                ctx.save();
                // 船体色を明るい色に強制
                ctx.fillStyle = "#ffffff";
                ctx.shadowBlur = 12;
                ctx.shadowColor = UI_COLORS.TRAIL;

                const shipAngle = Math.atan2(shipVel.y, shipVel.x);
                ctx.translate(shipPos.x, shipPos.y);
                ctx.rotate(shipAngle);

                // 本編の drawShip ロジックをインラインで簡略化して視認性を高める
                ctx.beginPath();
                ctx.moveTo(12, 0);
                ctx.lineTo(-6, 6);
                ctx.lineTo(-6, -6);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        };

        const intervalIdx = setInterval(animate, 16);
        this.activeIntervals.push(intervalIdx);
    }
    // --- Animation Logic ---

    _initAnimations() {
        this.activeIntervals = [];
        this.activeTimeouts = [];
    }

    _stopAnimations() {
        if (this.activeIntervals) {
            this.activeIntervals.forEach(clearInterval);
            this.activeIntervals = [];
        }
        if (this.activeTimeouts) {
            this.activeTimeouts.forEach(clearTimeout);
            this.activeTimeouts = [];
        }
    }

    _startAssembleAnimation(container) {
        const cards = container.querySelectorAll('.item-card');
        const button = container.querySelector('.btn-neon');
        if (!cards.length || !button) return;

        const runCycle = () => {
            cards.forEach(c => c.classList.remove('selected'));
            button.classList.remove('is-hovered');

            this.activeTimeouts.push(setTimeout(() => cards[0].classList.add('selected'), 750));
            this.activeTimeouts.push(setTimeout(() => cards[1].classList.add('selected'), 1500));
            this.activeTimeouts.push(setTimeout(() => cards[2].classList.add('selected'), 2250));
            this.activeTimeouts.push(setTimeout(() => button.classList.add('is-hovered'), 3300));

            this.activeTimeouts.push(setTimeout(() => {
                cards.forEach(c => c.classList.remove('selected'));
                button.classList.remove('is-hovered');
            }, 5200));
        };

        runCycle();
        const interval = setInterval(runCycle, 6700);
        this.activeIntervals.push(interval);
    }

    _startLaunchAnimation(container) {
        const cards = container.querySelectorAll('.item-card');
        const button = container.querySelector('.btn-neon');
        const canvas = document.getElementById('tutorial-launch-canvas');
        if (!cards.length || !button || !canvas) return;

        let swingAngle = 0;
        let currentOffset = 0;
        let isAiming = false;
        let showRocket = false;

        const runCycle = () => {
            isAiming = false;
            showRocket = false;
            currentOffset = 0;
            swingAngle = 0;
            cards.forEach(c => c.classList.remove('selected'));
            button.classList.remove('is-hovered');

            this.activeTimeouts.push(setTimeout(() => cards[0].classList.add('selected'), 750));

            this.activeTimeouts.push(setTimeout(() => {
                cards[1].classList.add('selected');
                showRocket = true;
            }, 1500));

            this.activeTimeouts.push(setTimeout(() => cards[2].classList.add('selected'), 2250));

            this.activeTimeouts.push(setTimeout(() => {
                isAiming = true;
            }, 3300));

            this.activeTimeouts.push(setTimeout(() => {
                isAiming = false;
                button.classList.add('is-hovered');
            }, 5500));

            this.activeTimeouts.push(setTimeout(() => {
                cards.forEach(c => c.classList.remove('selected'));
                button.classList.remove('is-hovered');
                showRocket = false;
            }, 8000));
        };

        const animInterval = setInterval(() => {
            if (this.currentTutorialSlide !== 3) {
                clearInterval(animInterval);
                return;
            }

            // リサイズ追従
            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            if (isAiming) {
                swingAngle += 0.05;
                currentOffset = Math.sin(swingAngle) * 0.15;
            }
            this._drawLaunchDiagram(currentOffset, showRocket);
        }, 30);

        this.activeIntervals.push(animInterval);
        runCycle();
        const cycleInterval = setInterval(runCycle, 9500);
        this.activeIntervals.push(cycleInterval);
    }

    /**
     * Content部分のレンダリング。文字列ならそのまま、オブジェクトなら構築して返す。
     */
    _renderSlideContent(content) {
        if (!content || typeof content === 'string') return content || '';

        const layout = content.layout || 'full';
        if (layout === 'split') {
            return this._renderLayoutSplit(content.left, content.right);
        } else {
            return this._renderLayoutFull(content.blocks);
        }
    }

    /**
     * 1カラムレイアウトの構築
     */
    _renderLayoutFull(blocks) {
        if (!blocks) return '';
        return blocks.map(block => this._renderBlock(block)).join('\n');
    }

    /**
     * 2カラム（スプリット）レイアウトの構築
     */
    _renderLayoutSplit(left, right) {
        const leftHtml = (left || []).map(block => this._renderBlock(block)).join('\n');
        const rightHtml = (right || []).map(block => this._renderBlock(block)).join('\n');

        return `
            <div class="split-layout">
                <div class="text-side">${leftHtml}</div>
                <div class="diagram-side">${rightHtml}</div>
            </div>
        `;
    }

    /**
     * 個別ブロック（info, tip等）のレンダリング
     */
    _renderBlock(block) {
        if (!block) return '';

        // Tipボックス
        if (block.type === 'tip') {
            const marginClass = block.margin ? ` ${block.margin}` : '';
            return `<div class="tip-box${marginClass}"><p>${this._formatText(block.text)}</p></div>`;
        }

        // 基本のInfoブロック
        if (block.type === 'info') {
            const blockIdHtml = block.id ? ` id="${block.id}"` : '';
            const headerHtml = block.title ? `<div class="block-header">${block.title}</div>` : '';
            let bodyClass = block.title ? 'block-body' : 'block-body has-no-header';
            if (block.fullWidth) bodyClass += ' no-padding';

            let itemsHtml = '';
            if (block.intro) {
                itemsHtml += `<p>${this._formatText(block.intro)}</p>`;
            }
            if (block.flavor) {
                itemsHtml += `<div class="flavor">${this._formatText(block.flavor)}</div>`;
            }
            if (block.list) {
                itemsHtml += this._renderList(block.list);
            }

            // カード群（アイテムカード等）の追加
            if (block.cards) {
                const cardsHtml = block.cards.map(card => {
                    // 生のデータオブジェクトがある場合
                    if (card.data) {
                        return this.game.generateCardHTML(card.data, { isStatic: true });
                    }
                    // registerIdがある場合は、ゲーム共通のカード生成ロジックを使用
                    if (card.registerId && typeof ITEM_REGISTRY !== 'undefined' && ITEM_REGISTRY[card.registerId]) {
                        return this.game.generateCardHTML(ITEM_REGISTRY[card.registerId], { isStatic: true });
                    }
                    // ない場合はフォールバック（シンプルなラベル）
                    const label = card.label || card.type?.toUpperCase() || '';
                    return `<div class="item-card" data-type="${card.type || ''}">${label}</div>`;
                }).join('\n');
                
                const wideClass = block.fullWidth ? ' full-width-diagram' : '';
                itemsHtml += `<div class="diagram-cards-container${wideClass}">${cardsHtml}</div>`;
            }

            // 図解用コンテナ（Canvas等）の追加
            if (block.diagramId || block.canvasId) {
                const containerId = block.diagramId ? ` id="${block.diagramId}"` : '';
                const canvasHtml = block.canvasId ? `<canvas id="${block.canvasId}"></canvas>` : '';
                
                const wideClass = block.fullWidth ? ' full-width-diagram' : '';

                // カードが既に描画されている場合は、Canvas専用のコンテナを分けるか、統合するか判定
                if (!block.cards) {
                    itemsHtml += `<div class="diagram-cards-container${wideClass}"${containerId}>${canvasHtml}</div>`;
                } else {
                    // cardsがある場合は、その後の要素としてCanvasを追加
                    itemsHtml += canvasHtml;
                }
            } else if (block.id && !block.cards) {
                // block.idはあるが、明示的なカードも図解もない場合は、空のコンテナを生成（旧図解互換用）
                itemsHtml += `<div class="diagram-cards-container"></div>`;
            }

            // アクションボタンの追加
            if (block.button) {
                const btnClass = block.button.className ? ` ${block.button.className}` : '';
                const subtextHtml = block.button.subtext ? `<span class="btn-subtext">${block.button.subtext}</span>` : '';
                itemsHtml += `
                    <button class="btn-neon${btnClass}">
                        <span class="btn-label">${block.button.text}</span>
                        ${subtextHtml}
                    </button>
                `;
            }

            return `
                <div class="info-block"${blockIdHtml}>
                    ${headerHtml}
                    <div class="${bodyClass}">
                        ${itemsHtml}
                    </div>
                </div>
            `;
        }

        return '';
    }

    /**
     * リスト要素（ol/ul）の構築
     */
    _renderList(config) {
        const type = config.type || 'ul';
        const listClass = config.className ? ` class="${config.className}"` : '';

        const itemsHtml = (config.items || []).map(item => {
            const titleClass = item.className ? ` ${item.className}` : '';
            return `
                <li>
                    <div class="list-content">
                        ${item.title ? `<div class="list-title${titleClass}">${item.title}</div>` : ''}
                        ${item.text ? `<div class="list-desc">${this._formatText(item.text)}</div>` : ''}
                    </div>
                </li>
            `;
        }).join('\n');

        return `<${type}${listClass}>${itemsHtml}</${type}>`;
    }

    /**
     * 文章の整形（改行の変換など）
     */
    _formatText(text) {
        if (!text) return '';
        if (typeof text !== 'string') return text;
        return text.replace(/\n/g, '<br>');
    }
}

