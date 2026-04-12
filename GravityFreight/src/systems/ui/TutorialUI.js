import { ITEM_REGISTRY, UI_COLORS, GOAL_COLORS, CATEGORY_COLORS, GOAL_NAMES, MAP_CONSTANTS, GAME_BALANCE } from '../../core/Data.js';
import { TUTORIAL_SLIDES } from './TutorialSlidesData.js';
import { TutorialDiagrams } from './TutorialDiagrams.js';

/**
 * TutorialUI
 * チュートリアル「How to Play」の全体制御を担当する。
 * UIの生成、ページ遷移、図解アニメーションのオーケストレーションを行う。
 * 
 * [Rule] 1ファイル500ステップ制限に基づき、データと描画ロジックを分離済み。
 */
export class TutorialUI {
    constructor(game, uiSystem) {
        this.game = game;
        this.uiSystem = uiSystem;
        this.currentTutorialSlide = 0;
        this.totalTutorialSlides = 0;
        this.lastSlideIndex = null;
        this.isTransitioning = false;
        this._isInitialized = false;

        this.slidesData = TUTORIAL_SLIDES;
        this.diagrams = new TutorialDiagrams(game);

        this._syncSystemStyles();
    }

    async show() {
        if (!this._isInitialized) {
            this._ensureInitialized();
        }

        if (this.overlay) {
            this.overlay.classList.remove('hidden');
            this._syncSystemStyles();
            await this.initSlider();
        }
    }

    hide() {
        this.diagrams.stopAll();
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
        
        this.currentTutorialSlide = 0;
        this.lastSlideIndex = null;
        await this.updateSlide(0);
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
        if (this.overlay) this.overlay.classList.add('is-animating');
        const slides = this.overlay.querySelectorAll('.tutorial-slide');

        if (this.lastSlideIndex !== null && slides[this.lastSlideIndex]) {
            slides[this.lastSlideIndex].classList.remove('is-active');
            await new Promise(r => setTimeout(r, 400));
        }

        this.diagrams.stopAll();
        this.currentTutorialSlide = index;

        if (this.slidesContainer) {
            this.slidesContainer.style.transform = `translateX(-${index * 100}%)`;
        }

        await new Promise(r => setTimeout(r, 600));

        const currentSlide = slides[this.currentTutorialSlide];
        if (currentSlide) {
            currentSlide.classList.add('is-active');
        }

        const dots = this.dotsContainer ? this.dotsContainer.querySelectorAll('.dot') : [];
        dots.forEach((dot, i) => dot.classList.toggle('active', i === index));

        this._updateSlideDiagrams(index);

        if (this.prevBtn) this.prevBtn.disabled = index === 0;
        if (this.nextBtn) this.nextBtn.disabled = index === this.totalTutorialSlides - 1;

        this.lastSlideIndex = index;
        this.isTransitioning = false;
        
        // 全てのアニメーションが完了する頃にスクロールバーの抑制を解除
        if (this._animTimeout) clearTimeout(this._animTimeout);
        this._animTimeout = setTimeout(() => {
            if (this.overlay) this.overlay.classList.remove('is-animating');
        }, 1200);
    }

    _updateSlideDiagrams(index) {
        if (index === 2) {
            const container = document.querySelector('#tutorial-assemble-diagram .block-body');
            if (container) this.diagrams.startAssembleAnimation(container);
        } else if (index === 3) {
            const container = document.querySelector('#tutorial-launch-diagram .block-body');
            if (container) {
                this.diagrams.startLaunchAnimation(container, 'tutorial-launch-canvas', () => this.currentTutorialSlide);
            }
        } else if (index === 4) {
            this.diagrams.startNavigationAnimation('tutorial-navigation-canvas', () => this.currentTutorialSlide);
        }
    }

    _ensureInitialized() {
        if (this._isInitialized) return;

        this.overlay = document.getElementById('how-to-play-overlay');
        this.slidesContainer = document.getElementById('tutorial-slides');
        this.dotsContainer = document.getElementById('tutorial-dots');
        this.prevBtn = document.getElementById('prev-tutorial-btn');
        this.nextBtn = document.getElementById('next-tutorial-btn');

        this._syncSystemStyles();
        this._renderSlides();
        this._setupListeners();
        this._isInitialized = true;
    }

    _renderSlides() {
        if (!this.slidesContainer) return;

        this.slidesContainer.innerHTML = '';
        this.slidesData.forEach(slide => {
            const slideDiv = document.createElement('div');
            slideDiv.className = `tutorial-slide ${slide.bgClass || ''}`;
            const isWide = slide.content && slide.content.layout === 'split';

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

    _renderSlideContent(content) {
        if (!content || typeof content === 'string') return content || '';
        return (content.layout === 'split')
            ? this._renderLayoutSplit(content.left, content.right)
            : this._renderLayoutFull(content.blocks);
    }

    _renderLayoutFull(blocks) {
        return (blocks || []).map(b => this._renderBlock(b)).join('\n');
    }

    _renderLayoutSplit(left, right) {
        const leftHtml = (left || []).map(b => this._renderBlock(b)).join('\n');
        const rightHtml = (right || []).map(b => this._renderBlock(b)).join('\n');
        return `
            <div class="split-layout">
                <div class="text-side">${leftHtml}</div>
                <div class="diagram-side">${rightHtml}</div>
            </div>
        `;
    }

    _renderBlock(block) {
        if (!block) return '';

        if (block.type === 'tip') {
            const margin = block.margin ? ` ${block.margin}` : '';
            return `<div class="tip-box${margin}"><p>${this._formatText(block.text)}</p></div>`;
        }

        if (block.type === 'info') {
            const blockId = block.id ? ` id="${block.id}"` : '';
            const header = block.title ? `<div class="block-header">${block.title}</div>` : '';
            let bodyClass = block.title ? 'block-body' : 'block-body has-no-header';
            if (block.fullWidth) bodyClass += ' no-padding';

            let itemsHtml = block.intro ? `<p>${this._formatText(block.intro)}</p>` : '';
            if (block.flavor) itemsHtml += `<div class="flavor">${this._formatText(block.flavor)}</div>`;
            if (block.list) itemsHtml += this._renderList(block.list);

            if (block.cards) {
                const cardsHtml = block.cards.map(card => {
                    const data = card.data || (card.registerId && ITEM_REGISTRY[card.registerId]);
                    if (data) return this.game.generateCardHTML(data, { isStatic: true });
                    return `<div class="item-card" data-type="${card.type || ''}">${card.label || ''}</div>`;
                }).join('\n');
                itemsHtml += `<div class="diagram-cards-container${block.fullWidth ? ' full-width-diagram' : ''}">${cardsHtml}</div>`;
            }

            if (block.canvasId) {
                const wide = block.fullWidth ? ' full-width-diagram' : '';
                itemsHtml += block.cards ? `<canvas id="${block.canvasId}"></canvas>` : `<div class="diagram-cards-container${wide}"><canvas id="${block.canvasId}"></canvas></div>`;
            }

            if (block.button) {
                itemsHtml += `
                    <button class="btn-neon ${block.button.className || ''}">
                        <span class="btn-label">${block.button.text}</span>
                        ${block.button.subtext ? `<span class="btn-subtext">${block.button.subtext}</span>` : ''}
                    </button>
                `;
            }

            return `<div class="info-block"${blockId}>${header}<div class="${bodyClass}">${itemsHtml}</div></div>`;
        }
        return '';
    }

    _renderList(config) {
        const type = config.type || 'ul';
        const items = (config.items || []).map(item => `
            <li>
                <div class="list-content">
                    ${item.title ? `<div class="list-title text-outline ${item.className || ''}">${item.title}</div>` : ''}
                    ${item.text ? `<div class="list-desc">${this._formatText(item.text)}</div>` : ''}
                </div>
            </li>
        `).join('\n');
        return `<${type}${config.className ? ` class="${config.className}"` : ''}>${items}</${type}>`;
    }

    _formatText(text) {
        return (typeof text === 'string') ? text.replace(/\n/g, '<br>') : text;
    }

    _syncSystemStyles() {
        const styles = {
            '--home-star-color': UI_COLORS.HOME_STAR,
            '--home-star-glow': UI_COLORS.HOME_STAR_GLOW,
            '--trading-post-color': GOAL_COLORS.TRADING_POST,
            '--repair-dock-color': GOAL_COLORS.REPAIR_DOCK,
            '--black-market-color': GOAL_COLORS.BLACK_MARKET
        };

        // Data.js のカテゴリーカラーも同期 (チュートリアル内の用語強調用)
        Object.entries(CATEGORY_COLORS).forEach(([key, val]) => {
            styles[`--color-${key.toLowerCase()}`] = val;
        });

        if (this.overlay) Object.entries(styles).forEach(([p, v]) => this.overlay.style.setProperty(p, v));
    }

    _setupListeners() {
        const closeBtn = document.getElementById('tutorial-close-btn-bottom');
        if (closeBtn) closeBtn.onclick = () => this.hide();
        if (this.prevBtn) this.prevBtn.onclick = () => this.prevSlide();
        if (this.nextBtn) this.nextBtn.onclick = () => this.nextSlide();
    }
}
