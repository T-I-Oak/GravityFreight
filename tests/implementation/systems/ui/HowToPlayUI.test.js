import { describe, it, expect, vi, beforeEach } from 'vitest';
import HowToPlayUI from '../../../../src/systems/ui/HowToPlayUI.js';

function createRepository() {
    const slides = [
        {
            id: 'mission',
            title: 'MISSION',
            background: '/assets/tutorial/slide1.png',
            layout: 'full',
            blocks: [{ type: 'paragraph', text: 'Mission text' }]
        },
        {
            id: 'assemble',
            title: 'ASSEMBLE',
            background: '/assets/tutorial/slide3.png',
            layout: 'split',
            demo: 'assemble',
            blocks: [{ type: 'demo', demo: 'assemble' }]
        },
        {
            id: 'launch',
            title: 'LAUNCH',
            demo: 'launch',
            type: 'full-text',
            content: {
                layout: 'full',
                blocks: [{
                    type: 'info',
                    cards: [{
                        rocketParts: {
                            chassis: 'hull_light',
                            logic: 'sensor_short',
                            modules: ['mod_analyzer']
                        }
                    }],
                    canvasId: 'how-to-play-launch-canvas',
                    button: {
                        text: 'LAUNCH ENGINE',
                        subtext: 'Select a rocket and launcher to begin launch prep.',
                        className: 'state-primary state-disabled state-notable launch'
                    }
                }]
            }
        },
        {
            id: 'delivery',
            title: 'DELIVERY',
            type: 'full-text',
            content: {
                layout: 'full',
                blocks: [{
                    type: 'info',
                    list: {
                        type: 'ul',
                        items: [{
                            title: 'Trading Post',
                            className: 'status-trading-post',
                            text: 'Trade facility'
                        }]
                    }
                }]
            }
        }
    ];
    return {
        getHowToPlayContent: vi.fn(() => slides),
        getItemDefinition: vi.fn(id => ({
            id,
            name: id,
            category: 'chassis',
            description: 'demo',
            stats: {},
            slots: 1
        }))
    };
}

function createUIComponents() {
    return {
        generateCardHTML: vi.fn(item => `<article class="ItemCard" data-id="${item.id}">${item.name}</article>`)
    };
}

function finishSlideTransition() {
    vi.advanceTimersByTime(560);
}

describe('HowToPlayUI', () => {
    let repository;
    let diagrams;
    let uiComponents;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="how-to-play-overlay" class="how-to-play-screen state-hidden" hidden>
                <div class="how-to-play-slides"></div>
                <button data-how-to-play-action="prev"></button>
                <div class="how-to-play-dots"></div>
                <button data-how-to-play-action="next"></button>
                <button data-how-to-play-action="close"></button>
            </div>
        `;
        repository = createRepository();
        diagrams = {
            startAssembleDemo: vi.fn(),
            startLaunchDemo: vi.fn(),
            startLaunchEquipmentDemo: vi.fn(),
            startNavigationDemo: vi.fn(),
            stopAll: vi.fn()
        };
        uiComponents = createUIComponents();
    });

    it('shows the first page and closes without touching storage', () => {
        const view = new HowToPlayUI({
            rootElement: document.querySelector('#how-to-play-overlay'),
            gameDataRepository: repository,
            uiComponents,
            diagrams
        });

        view.initialize();
        view.show();

        expect(document.querySelector('#how-to-play-overlay').hidden).toBe(false);
        expect(document.querySelector('.how-to-play-slide.state-active').textContent).toContain('MISSION');
        expect(document.querySelector('.how-to-play-slide.state-active').textContent).toContain('Mission text');
        expect(document.querySelector('[data-how-to-play-action="prev"]').disabled).toBe(true);
        expect(document.querySelector('[data-how-to-play-action="next"]').disabled).toBe(false);

        view.hide();

        expect(document.querySelector('#how-to-play-overlay').hidden).toBe(true);
        expect(diagrams.stopAll).toHaveBeenCalled();
    });

    it('moves pages with dots and starts the page demo', () => {
        vi.useFakeTimers();
        const view = new HowToPlayUI({
            rootElement: document.querySelector('#how-to-play-overlay'),
            gameDataRepository: repository,
            uiComponents,
            diagrams
        });

        view.initialize();
        view.show();
        document.querySelector('[data-how-to-play-page="1"]').click();
        expect(document.querySelector('.how-to-play-slide.state-active')).toBeNull();
        finishSlideTransition();

        expect(document.querySelector('.how-to-play-slide.state-active').textContent).toContain('ASSEMBLE');
        expect(diagrams.startAssembleDemo).toHaveBeenCalled();
        expect(uiComponents.generateCardHTML).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('keeps the overlay animating while a page fades out and in', () => {
        vi.useFakeTimers();
        const view = new HowToPlayUI({
            rootElement: document.querySelector('#how-to-play-overlay'),
            gameDataRepository: repository,
            uiComponents,
            diagrams
        });

        view.initialize();
        view.show();
        view.goToPage(1);

        expect(document.querySelector('#how-to-play-overlay').classList.contains('state-animating')).toBe(true);
        expect(document.querySelector('.how-to-play-slide.state-active')).toBeNull();
        expect(diagrams.startAssembleDemo).not.toHaveBeenCalled();

        vi.advanceTimersByTime(400);
        expect(document.querySelector('.how-to-play-slide.state-active')).toBeNull();
        vi.advanceTimersByTime(160);

        expect(document.querySelector('.how-to-play-slide.state-active').textContent).toContain('ASSEMBLE');
        expect(diagrams.startAssembleDemo).toHaveBeenCalled();
        vi.advanceTimersByTime(800);
        expect(document.querySelector('#how-to-play-overlay').classList.contains('state-animating')).toBe(false);
        vi.useRealTimers();
    });

    it('refreshes language while keeping the current page', () => {
        vi.useFakeTimers();
        const view = new HowToPlayUI({
            rootElement: document.querySelector('#how-to-play-overlay'),
            gameDataRepository: repository,
            uiComponents,
            diagrams
        });

        view.initialize();
        view.show();
        view.goToPage(1);
        finishSlideTransition();
        view.refreshLanguage();

        expect(document.querySelector('.how-to-play-slide.state-active').textContent).toContain('ASSEMBLE');
        expect(repository.getHowToPlayContent).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });

    it('renders assembled rocket cards from real item definitions', () => {
        vi.useFakeTimers();
        const view = new HowToPlayUI({
            rootElement: document.querySelector('#how-to-play-overlay'),
            gameDataRepository: repository,
            uiComponents,
            diagrams
        });

        view.initialize();
        view.show();
        view.goToPage(2);
        finishSlideTransition();

        const rocketCall = uiComponents.generateCardHTML.mock.calls
            .find(([item]) => item.id === 'rocket');

        expect(rocketCall[0]).toEqual(expect.objectContaining({
            id: 'rocket',
            category: 'rocket',
            modules: expect.any(Array)
        }));
        expect(rocketCall[1]?.isCompact).toBeUndefined();
        vi.useRealTimers();
    });

    it('renders item cards through the same non-compact card generator path as the build panel', () => {
        vi.useFakeTimers();
        const view = new HowToPlayUI({
            rootElement: document.querySelector('#how-to-play-overlay'),
            gameDataRepository: repository,
            uiComponents,
            diagrams
        });

        view.initialize();
        view.show();
        view.goToPage(1);
        finishSlideTransition();

        const itemCalls = uiComponents.generateCardHTML.mock.calls
            .filter(([item]) => ['hull_light', 'sensor_short', 'mod_analyzer'].includes(item.id));

        expect(itemCalls).toHaveLength(3);
        itemCalls.forEach(([, options]) => {
            expect(options).toEqual(expect.objectContaining({ isClickable: true }));
            expect(options.isCompact).toBeUndefined();
        });
        vi.useRealTimers();
    });

    it('renders the assemble demo button with the same class contract as the build panel button', () => {
        vi.useFakeTimers();
        const view = new HowToPlayUI({
            rootElement: document.querySelector('#how-to-play-overlay'),
            gameDataRepository: repository,
            uiComponents,
            diagrams
        });

        view.initialize();
        view.show();
        view.goToPage(1);
        finishSlideTransition();

        const button = document.querySelector('.how-to-play-demo-button');
        expect(button.classList.contains('Button')).toBe(true);
        expect(button.classList.contains('button-large')).toBe(true);
        expect(button.classList.contains('state-primary')).toBe(true);
        expect(button.classList.contains('state-disabled')).toBe(true);
        expect(button.classList.contains('state-notable')).toBe(true);
        expect(button.classList.contains('assembly')).toBe(true);
        expect(button.querySelector('.btn-main-label')).not.toBeNull();
        expect(button.querySelector('.btn-sub-label')).not.toBeNull();
        vi.useRealTimers();
    });

    it('starts both the launch canvas and launch equipment demos on the launch page', () => {
        vi.useFakeTimers();
        const view = new HowToPlayUI({
            rootElement: document.querySelector('#how-to-play-overlay'),
            gameDataRepository: repository,
            uiComponents,
            diagrams
        });

        view.initialize();
        view.show();
        view.goToPage(2);
        finishSlideTransition();

        expect(diagrams.startLaunchDemo).toHaveBeenCalled();
        expect(diagrams.startLaunchEquipmentDemo).toHaveBeenCalledWith(
            document.querySelector('[data-how-to-play-demo="launch-build"]')
        );
        expect(document.querySelector('[data-how-to-play-demo="launch-build"] .assembly-actions')).toBeNull();
        expect(document.querySelector('[data-how-to-play-demo="launch-build"] .Panel')).toBeNull();
        expect([...document.querySelector('[data-how-to-play-demo="launch-build"]').children].map(element => {
            if (element.classList.contains('how-to-play-launch-equipment')) {
                return 'equipment';
            }
            if (element.matches('canvas')) {
                return 'canvas';
            }
            if (element.matches('button')) {
                return 'button';
            }
            return element.tagName.toLowerCase();
        })).toEqual(['equipment', 'canvas', 'button']);
        vi.useRealTimers();
    });

    it('applies status classes to how to play list titles', () => {
        vi.useFakeTimers();
        const view = new HowToPlayUI({
            rootElement: document.querySelector('#how-to-play-overlay'),
            gameDataRepository: repository,
            uiComponents,
            diagrams
        });

        view.initialize();
        view.show();
        view.goToPage(3);
        finishSlideTransition();

        const title = document.querySelector('.how-to-play-list-title');
        expect(title.textContent).toBe('Trading Post');
        expect(title.classList.contains('status-trading-post')).toBe(true);
        vi.useRealTimers();
    });
});
