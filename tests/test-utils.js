import { vi } from 'vitest';

export function setupStandardDOM() {
    document.body.innerHTML = `
        <div id="title-screen">
            <canvas id="title-bg-canvas"></canvas>
            <canvas id="title-fg-canvas"></canvas>
            <button id="start-game-btn"></button>
            <button id="how-to-play-btn"></button>
        </div>
        <div id="mission-hud" class="hidden"></div>
        <div id="terminal-panel" class="hidden">
            <div class="collapse-btn"><span class="icon">∧</span></div>
            <div id="chassis-list"></div>
            <div id="logic-list"></div>
            <div id="launcher-list"></div>
            <div id="rocket-list"></div>
            <div id="logic-option-list"></div>
            <div id="acc-option-list"></div>
            <button id="build-btn"></button>
            <button id="launch-btn"></button>
        </div>
        <div id="build-overlay" class="hidden"></div>
        <div id="launch-control" class="hidden"></div>
        <div id="result-overlay" class="hidden">
            <div id="result-title"></div>
            <div id="result-subtitle"></div>
            <div id="result-stats-list"></div>
            <div id="result-items-list"></div>
            <div id="result-total-score"></div>
            <div id="result-total-coin"></div>
            <button id="result-close-btn"></button>
            <button id="result-view-map-btn"></button>
            <button id="back-to-result-btn" class="hidden"></button>
        </div>
        <div id="event-screen" class="hidden">
            <div id="event-location"></div>
            <div id="event-description"></div>
            <div id="event-content"></div>
            <div id="event-player-credits"></div>
            <button id="event-continue-btn"></button>
            <div id="event-icon"></div>
        </div>
        <div id="how-to-play-overlay" class="hidden">
            <button id="close-help-btn"></button>
        </div>
        <div id="star-info-panel" class="hidden" data-item-count="0">
            <div id="star-info-list"></div>
            <div id="star-info-title"></div>
        </div>
        <div id="receipt-overlay" class="hidden">
            <div id="receipt-content-area"></div>
        </div>
        <div id="story-overlay" class="hidden">
            <div class="story-modal">
                <div id="story-branch-icon"></div>
                <h2 id="story-title"></h2>
                <div id="story-discovery"></div>
                <div id="story-content"></div>
                <button id="close-story-btn"></button>
            </div>
        </div>
        <div id="score-display">0</div>
        <div id="coin-display">0</div>
        <div id="sector-display">1</div>
        <button id="mail-btn" class="hidden"><span class="unread-badge"></span></button>
        <div id="flight-tab" class="tab-btn" data-tab="flight"></div>
        <div id="factory-tab" class="tab-btn" data-tab="factory"></div>
    `;

    // Canvas mock for JSDOM
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
        stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), save: vi.fn(), restore: vi.fn(),
        translate: vi.fn(), rotate: vi.fn(), scale: vi.fn(), setTransform: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        drawImage: vi.fn()
    });

    // Mock localStorage
    const mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
    };

    if (typeof localStorage !== 'undefined') {
        try {
            Object.defineProperty(window, 'localStorage', {
                value: mockStorage,
                writable: true,
                configurable: true
            });
        } catch (e) {
            // Fallback for strict environments
            ['getItem', 'setItem', 'removeItem', 'clear'].forEach(method => {
                try {
                    Object.defineProperty(localStorage, method, { value: vi.fn(), configurable: true });
                } catch (e2) {}
            });
        }
    } else {
        global.localStorage = mockStorage;
    }
}
