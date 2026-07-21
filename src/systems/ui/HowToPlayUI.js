import Item from '../entities/Item.js';
import RocketItem from '../entities/RocketItem.js';

const SLIDE_FADE_OUT_MS = 400;
const SLIDE_SETTLE_MS = 160;
const SLIDE_ANIMATION_CLEAR_MS = 800;

class HowToPlayUI {
    constructor(options = {}) {
        this.rootElement = options.rootElement;
        this.gameDataRepository = options.gameDataRepository;
        this.uiComponents = options.uiComponents;
        this.diagrams = options.diagrams;
        this.operationBinder = options.operationBinder || ((element, handler) => {
            element.addEventListener('click', event => handler(event.currentTarget, event));
        });
        this.currentIndex = 0;
        this.slides = [];
        this.initialized = false;
        this.isTransitioning = false;
        this.transitionTimeouts = [];
    }

    initialize() {
        if (!this.rootElement) {
            throw new Error('[HowToPlayUI] rootElement is required.');
        }
        if (!this.gameDataRepository) {
            throw new Error('[HowToPlayUI] gameDataRepository is required.');
        }
        if (!this.diagrams) {
            throw new Error('[HowToPlayUI] diagrams is required.');
        }

        this.slideTrack = this.#required('.how-to-play-slides');
        this.dots = this.#required('.how-to-play-dots');
        this.prevButton = this.#required('[data-how-to-play-action="prev"]');
        this.nextButton = this.#required('[data-how-to-play-action="next"]');
        this.closeButton = this.#required('[data-how-to-play-action="close"]');

        this.operationBinder(this.prevButton, () => this.previousPage());
        this.operationBinder(this.nextButton, () => this.nextPage());
        this.operationBinder(this.closeButton, () => this.hide());
        this.initialized = true;
    }

    show() {
        this.#ensureInitialized();
        this.slides = this.gameDataRepository.getHowToPlayContent();
        this.currentIndex = 0;
        this.#showRoot();
        this.#renderSlides();
        this.#activateSlide(0, { immediate: true });
    }

    hide() {
        this.#clearTransitionTimers();
        this.diagrams.stopAll();
        this.currentIndex = 0;
        this.rootElement.hidden = true;
        this.rootElement.classList.add('state-hidden');
        this.rootElement.classList.remove('state-active');
    }

    goToPage(index) {
        this.#ensureInitialized();
        if (index < 0 || index >= this.slides.length || index === this.currentIndex || this.isTransitioning) {
            return;
        }
        this.#activateSlide(index);
    }

    nextPage() {
        this.goToPage(this.currentIndex + 1);
    }

    previousPage() {
        this.goToPage(this.currentIndex - 1);
    }

    refreshLanguage() {
        this.#ensureInitialized();
        if (this.rootElement.hidden) {
            return;
        }

        const index = this.currentIndex;
        this.slides = this.gameDataRepository.getHowToPlayContent();
        this.#renderSlides();
        this.#activateSlide(Math.min(index, this.slides.length - 1), { immediate: true });
    }

    #renderSlides() {
        this.slideTrack.innerHTML = this.slides.map((slide, index) => this.#createSlideHTML(slide, index)).join('');
        this.#renderDots();
    }

    #activateSlide(index, options = {}) {
        this.#clearTransitionTimers();
        this.diagrams.stopAll();
        const slides = [...this.slideTrack.querySelectorAll('.how-to-play-slide')];
        const previousSlide = slides[this.currentIndex];
        const showSlide = () => {
            this.currentIndex = index;
            this.slideTrack.style.transform = `translateX(-${index * 100}%)`;
            slides.forEach((slide, slideIndex) => {
                slide.classList.toggle('state-active', slideIndex === index);
            });
            this.#updateNavigationState(index);
            this.#startDemo(this.slides[index]);
        };

        if (options.immediate || !previousSlide || !previousSlide.classList.contains('state-active')) {
            showSlide();
            return;
        }

        this.isTransitioning = true;
        this.rootElement.classList.add('state-animating');
        previousSlide.classList.remove('state-active');
        this.#queueTransition(() => {
            this.currentIndex = index;
            this.slideTrack.style.transform = `translateX(-${index * 100}%)`;
            this.#queueTransition(() => {
                showSlide();
                this.isTransitioning = false;
                this.#queueTransition(() => this.rootElement.classList.remove('state-animating'), SLIDE_ANIMATION_CLEAR_MS);
            }, SLIDE_SETTLE_MS);
        }, SLIDE_FADE_OUT_MS);
    }

    #updateNavigationState(index) {
        this.dots.querySelectorAll('[data-how-to-play-page]').forEach(dot => {
            dot.classList.toggle('state-active', Number(dot.dataset.howToPlayPage) === index);
        });
        this.prevButton.disabled = index === 0;
        this.nextButton.disabled = index === this.slides.length - 1;
        this.prevButton.classList.toggle('state-disabled', this.prevButton.disabled);
        this.nextButton.classList.toggle('state-disabled', this.nextButton.disabled);
    }

    #queueTransition(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.transitionTimeouts = this.transitionTimeouts.filter(id => id !== timeoutId);
            callback();
        }, delay);
        this.transitionTimeouts.push(timeoutId);
    }

    #clearTransitionTimers() {
        this.transitionTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.transitionTimeouts = [];
        this.isTransitioning = false;
        this.rootElement?.classList.remove('state-animating');
    }

    #createSlideHTML(slide, index) {
        const content = slide.content || { layout: slide.layout, blocks: slide.blocks || [] };
        const isWide = content.layout === 'split';
        const bgClass = slide.bgClass || `bg-slide${index + 1}`;
        return `
            <article class="how-to-play-slide ${bgClass}">
                <h3>${this.#escape(slide.title)}</h3>
                <div class="how-to-play-slide-content ${this.#escape(slide.type || 'full-text')} ${isWide ? 'wide' : ''}">
                    ${this.#renderSlideContent(content)}
                </div>
            </article>
        `;
    }

    #renderSlideContent(content) {
        if (content.layout === 'split') {
            if (!content.left && !content.right && content.blocks) {
                return content.blocks.map(block => this.#renderBlock(block)).join('');
            }
            return `
                <div class="how-to-play-split-layout">
                    <div class="how-to-play-text-side">
                        ${(content.left || []).map(block => this.#renderBlock(block)).join('')}
                    </div>
                    <div class="how-to-play-diagram-side">
                        ${(content.right || []).map(block => this.#renderBlock(block)).join('')}
                    </div>
                </div>
            `;
        }
        return (content.blocks || []).map(block => this.#renderBlock(block)).join('');
    }

    #renderBlock(block) {
        if (block.type === 'tip') {
            return `<div class="how-to-play-tip-box ${this.#escape(block.margin || '')}"><p>${this.#formatText(block.text)}</p></div>`;
        }
        if (block.type === 'info') {
            const id = block.id ? `id="${this.#escape(block.id)}"` : '';
            const header = block.title ? `<div class="how-to-play-block-header">${this.#escape(block.title)}</div>` : '';
            const noHeader = block.title ? '' : 'has-no-header';
            const bodyClass = block.cards ? 'is-build-panel-demo' : '';
            return `
                <div class="how-to-play-info-block" ${id}>
                    ${header}
                    <div class="how-to-play-block-body ${noHeader} ${bodyClass} ${block.noPadding ? 'no-padding' : ''}">
                        ${block.intro ? `<p>${this.#formatText(block.intro)}</p>` : ''}
                        ${block.flavor ? `<p class="how-to-play-flavor">${this.#formatText(block.flavor)}</p>` : ''}
                        ${block.list ? this.#renderList(block.list) : ''}
                        ${block.cards ? this.#renderEquipmentDemo(block) : ''}
                        ${!block.cards && block.canvasId ? this.#renderCanvas(block.canvasId) : ''}
                        ${!block.cards && block.button ? this.#renderDemoButton(block.button) : ''}
                    </div>
                </div>
            `;
        }
        if (block.type === 'list') {
            return this.#renderBlock({ type: 'info', list: { type: 'ol', items: block.items } });
        }
        if (block.type === 'demo') {
            return this.#renderDemoBlock(block.demo);
        }
        return `<div class="how-to-play-info-block"><div class="how-to-play-block-body has-no-header"><p>${this.#formatText(block.text)}</p></div></div>`;
    }

    #renderList(list) {
        const tag = list.type === 'ol' ? 'ol' : 'ul';
        const className = list.className ? ` ${this.#escape(list.className)}` : '';
        return `
            <${tag} class="${className}">
                ${list.items.map(item => `
                    <li class="${this.#escape(item.className || '')}">
                        <div class="how-to-play-list-content">
                            ${item.title ? `<span class="how-to-play-list-title ${this.#escape(item.className || '')}">${this.#formatText(item.title)}</span>` : ''}
                            <span class="how-to-play-list-desc">${this.#formatText(item.text)}</span>
                        </div>
                    </li>
                `).join('')}
            </${tag}>
        `;
    }

    #renderEquipmentDemo(block) {
        const groups = this.#createCardGroups(block.cards);
        const demoType = this.#getBuildPanelDemoType(block);
        if (demoType === 'launch-build') {
            return `
                <div class="how-to-play-launch-sequence" data-how-to-play-demo="${this.#escape(demoType)}">
                    <div class="how-to-play-launch-equipment">
                        ${groups.map(group => this.#renderCardGroup(group)).join('')}
                    </div>
                    ${block.canvasId ? this.#renderCanvas(block.canvasId) : ''}
                    ${block.button ? this.#renderDemoButton(block.button) : ''}
                </div>
            `;
        }

        return `
            <div class="how-to-play-build-panel Panel color-theme-sub theme-neon" data-how-to-play-demo="${this.#escape(demoType)}">
                <div class="panel-body">
                    <div class="assembly-scroll">
                        ${groups.map(group => this.#renderCardGroup(group)).join('')}
                    </div>
                </div>
                ${block.button ? `
                    <footer class="assembly-actions">
                        ${this.#renderDemoButton(block.button)}
                    </footer>
                ` : ''}
            </div>
        `;
    }

    #renderCardGroup(group) {
        return `
            <section class="section ${this.#escape(group.category)}">
                <header class="section-header">
                    <h4 class="section-title">${this.#escape(group.label)}</h4>
                </header>
                <div class="item-list">
                    ${group.cards.map(card => `<div class="how-to-play-demo-card">${this.#renderCard(card)}</div>`).join('')}
                </div>
            </section>
        `;
    }

    #createCardGroups(cards = []) {
        const groups = [];
        cards.forEach(card => {
            const viewData = this.#createCardViewData(card);
            const category = viewData.category || 'item';
            let group = groups.find(candidate => candidate.category === category);
            if (!group) {
                group = {
                    category,
                    label: this.#getCategoryLabel(category),
                    cards: []
                };
                groups.push(group);
            }
            group.cards.push({ ...card, viewData });
        });
        return groups;
    }

    #renderCard(card) {
        const viewData = card.viewData || this.#createCardViewData(card);
        return this.uiComponents.generateCardHTML(viewData, { isClickable: true });
    }

    #createCardViewData(card) {
        if (card.registerId) {
            const item = new Item(card.registerId, this.gameDataRepository);
            return item.getViewData();
        }
        if (card.rocketParts) {
            const rocketItem = new RocketItem(
                new Item(card.rocketParts.chassis, this.gameDataRepository),
                new Item(card.rocketParts.logic, this.gameDataRepository),
                (card.rocketParts.modules || []).map(id => new Item(id, this.gameDataRepository))
            );
            return rocketItem.getViewData();
        }

        throw new Error('[HowToPlayUI] card.registerId or card.rocketParts is required.');
    }

    #getCategoryLabel(category) {
        const labels = {
            rocket: 'Rocket',
            launcher: 'Launcher',
            booster: 'Booster',
            chassis: 'Chassis',
            logic: 'Logic',
            module: 'Modules'
        };
        return labels[category] || category;
    }

    #getBuildPanelDemoType(block) {
        return String(block.button?.className || '').includes('launch')
            ? 'launch-build'
            : 'assemble-build';
    }

    #renderCanvas(canvasId) {
        const demo = canvasId.includes('navigation') ? 'navigation' : 'launch';
        return `<canvas id="${this.#escape(canvasId)}" class="DiagramCanvas how-to-play-canvas" data-how-to-play-canvas="${demo}"></canvas>`;
    }

    #renderDemoButton(button) {
        const className = button.className || 'state-primary state-disabled state-notable assembly';
        return `
            <button class="Button button-large how-to-play-demo-button ${this.#escape(className)}" type="button" disabled>
                <span class="btn-main-label">${this.#escape(button.text)}</span>
                ${button.subtext ? `<span class="btn-sub-label">${this.#escape(button.subtext)}</span>` : ''}
            </button>
        `;
    }

    #renderDemoBlock(demo) {
        if (demo === 'assemble') {
            return this.#renderBlock({
                type: 'info',
                id: 'how-to-play-assemble-diagram',
                title: 'ロケットの構築',
                cards: [
                    { registerId: 'hull_light' },
                    { registerId: 'sensor_short' },
                    { registerId: 'mod_analyzer' }
                ],
                button: {
                    text: 'ASSEMBLE ROCKET',
                    subtext: 'シャーシとロジックを選択すると建造できます',
                    className: 'state-primary state-disabled state-notable assembly'
                }
            });
        }
        const canvasId = demo === 'navigation' ? 'how-to-play-navigation-canvas' : 'how-to-play-launch-canvas';
        return `
            <div class="how-to-play-info-block" data-how-to-play-demo="${this.#escape(demo)}">
                <div class="how-to-play-block-header">${demo === 'launch' ? 'ロケットの発射' : 'ロケットの航行'}</div>
                <div class="how-to-play-block-body">${this.#renderCanvas(canvasId)}</div>
            </div>
        `;
    }

    #renderDots() {
        this.dots.innerHTML = this.slides.map((slide, index) => `
            <button class="how-to-play-dot" type="button" aria-label="Page ${index + 1}" data-how-to-play-page="${index}"></button>
        `).join('');
        this.dots.querySelectorAll('[data-how-to-play-page]').forEach(dot => {
            this.operationBinder(dot, element => this.goToPage(Number(element.dataset.howToPlayPage)));
        });
    }

    #startDemo(slide) {
        const demo = slide?.demo;
        if (demo === 'assemble') {
            this.diagrams.startAssembleDemo(this.slideTrack.querySelector('[data-how-to-play-demo="assemble-build"]'));
            return;
        }

        const canvas = this.slideTrack.querySelector(`[data-how-to-play-canvas="${demo}"]`);
        if (demo === 'launch') {
            const container = this.slideTrack.querySelector('[data-how-to-play-demo="launch-build"]');
            this.diagrams.startLaunchDemo(canvas, { selectionContainer: container });
            this.diagrams.startLaunchEquipmentDemo?.(container);
            return;
        }
        if (demo === 'navigation') {
            this.diagrams.startNavigationDemo(canvas, {});
        }
    }

    #showRoot() {
        this.rootElement.hidden = false;
        this.rootElement.classList.remove('state-hidden');
        this.rootElement.classList.add('state-active');
    }

    #formatText(value) {
        return String(value ?? '').replace(/\n/g, '<br>');
    }

    #required(selector) {
        const element = this.rootElement.querySelector(selector);
        if (!element) {
            throw new Error(`[HowToPlayUI] Required element not found: ${selector}`);
        }
        return element;
    }

    #ensureInitialized() {
        if (!this.initialized) {
            throw new Error('[HowToPlayUI] initialize() must be called first.');
        }
    }

    #escape(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
}

export default HowToPlayUI;
