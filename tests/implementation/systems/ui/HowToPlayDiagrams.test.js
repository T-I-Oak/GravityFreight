import { describe, it, expect, vi } from 'vitest';
import HowToPlayDiagrams from '../../../../src/systems/ui/HowToPlayDiagrams.js';
import Rocket from '../../../../src/systems/entities/Rocket.js';
import Sector from '../../../../src/systems/world/Sector.js';

describe('HowToPlayDiagrams', () => {
    function createRepository() {
        const items = {
            hull_light: { id: 'hull_light', name: 'Light Hull', category: 'chassis', rarity: 'common', mass: 2, slots: 1 },
            sensor_short: { id: 'sensor_short', name: 'Short Sensor', category: 'logic', rarity: 'common', pickupRange: 40, precisionMultiplier: 1.1 },
            mod_analyzer: { id: 'mod_analyzer', name: 'Analyzer', category: 'module', rarity: 'common', precisionMultiplier: 1.1 },
            pad_standard_d2: { id: 'pad_standard_d2', name: 'Standard Pad', category: 'launcher', rarity: 'common', power: 12, maxCharges: 2 },
            opt_fuel: { id: 'opt_fuel', name: 'Fuel', category: 'booster', rarity: 'common', powerMultiplier: 1.1 },
            cargo_normal: { id: 'cargo_normal', name: 'Cargo', category: 'cargo', rarity: 'uncommon', deliveryGoalId: 'TRADING_POST' }
        };
        return {
            getItemDefinition: id => items[id],
            getMasterConfig: () => ({
                homeStarPosition: { x: 0, y: 0 },
                homeStarRadius: 40,
                homeStarMass: 100,
                starDefaultRadius: 26,
                boundaryRadius: 900,
                arcFacilityWidths: { TRADING_POST: 60, REPAIR_DOCK: 40, BLACK_MARKET: 20 }
            }),
            getGameBalance: () => ({
                DEFAULT_SHIP_MASS: 10,
                TRAIL_MAX_LENGTH: 80
            })
        };
    }

    function createCanvas() {
        const canvas = document.createElement('canvas');
        document.body.append(canvas);
        canvas.getContext = vi.fn(() => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            closePath: vi.fn(),
            setLineDash: vi.fn()
        }));
        return canvas;
    }

    it('clears active animation frames when stopped', () => {
        const requestFrame = vi.fn(() => 7);
        const cancelFrame = vi.fn();
        const diagrams = new HowToPlayDiagrams({ requestFrame, cancelFrame });
        const canvas = createCanvas();

        diagrams.startLaunchDemo(canvas, {});
        diagrams.stopAll();

        expect(requestFrame).toHaveBeenCalled();
        expect(cancelFrame).toHaveBeenCalledWith(7);
    });

    it('renders launch and navigation demos through the shared world renderers', () => {
        const sectorMapRenderer = { render: vi.fn() };
        const flightVisualRenderer = { render: vi.fn() };
        let frameCount = 0;
        const requestFrame = vi.fn(callback => {
            if (frameCount === 0) {
                frameCount += 1;
                callback(1000);
            }
            return 9;
        });
        const diagrams = new HowToPlayDiagrams({
            requestFrame,
            cancelFrame: vi.fn(),
            sectorMapRenderer,
            flightVisualRenderer,
            gameDataRepository: createRepository(),
            colorPalette: { createWorldColors: vi.fn(() => ({ categories: {}, facilities: {} })) }
        });
        const canvas = createCanvas();
        const selectionContainer = document.createElement('div');
        selectionContainer.dataset.howToPlaySelectedCount = '2';

        diagrams.startLaunchDemo(canvas, { selectionContainer });
        diagrams.stopAll();
        diagrams.startNavigationDemo(canvas);

        expect(sectorMapRenderer.render).toHaveBeenCalled();
        expect(flightVisualRenderer.render).toHaveBeenCalled();
        expect(sectorMapRenderer.render.mock.calls[0][1]).toBeInstanceOf(Sector);
        expect(flightVisualRenderer.render.mock.calls[0][3].navigationRocket).toBeInstanceOf(Rocket);
    });

    it('renders the navigation demo with an exit arc and fading trail points', () => {
        const sectorMapRenderer = { render: vi.fn() };
        const flightVisualRenderer = { render: vi.fn() };
        let frameCount = 0;
        const requestFrame = vi.fn(callback => {
            if (frameCount < 20) {
                frameCount += 1;
                callback(1000 + frameCount * 16);
            }
            return frameCount;
        });
        const diagrams = new HowToPlayDiagrams({
            requestFrame,
            cancelFrame: vi.fn(),
            sectorMapRenderer,
            flightVisualRenderer,
            gameDataRepository: createRepository(),
            colorPalette: { createWorldColors: vi.fn(() => ({ categories: {}, facilities: {} })) }
        });
        const canvas = createCanvas();

        diagrams.startNavigationDemo(canvas);

        const renderedSector = sectorMapRenderer.render.mock.calls.at(-1)[1];
        expect(renderedSector.exits).toHaveLength(1);
        expect(renderedSector.exits[0].getFacilityType()).toBe('TRADING_POST');
        expect(renderedSector.exits[0].radius).toBe(createRepository().getMasterConfig().boundaryRadius);
        expect(flightVisualRenderer.render.mock.calls.some(call => (
            call[3].navigationRocket.actualTrail.some(point => Number.isFinite(point.alpha) && point.alpha < 1)
        ))).toBe(true);

        diagrams.stopAll();
    });

    it('reaches the exit arc with the tuned navigation demo parameters', () => {
        const sectorMapRenderer = { render: vi.fn() };
        const flightVisualRenderer = { render: vi.fn() };
        let frameCount = 0;
        const requestFrame = vi.fn(callback => {
            if (frameCount < 600) {
                frameCount += 1;
                callback(1000 + frameCount * 16);
            }
            return frameCount;
        });
        const diagrams = new HowToPlayDiagrams({
            requestFrame,
            cancelFrame: vi.fn(),
            sectorMapRenderer,
            flightVisualRenderer,
            gameDataRepository: createRepository(),
            colorPalette: { createWorldColors: vi.fn(() => ({ categories: {}, facilities: {} })) }
        });
        const canvas = createCanvas();

        diagrams.startNavigationDemo(canvas);

        expect(flightVisualRenderer.render.mock.calls.some(call => call[3].hideRocketBody)).toBe(true);

        diagrams.stopAll();
    });

    it('hides the launch rocket and prediction path until the launcher is selected', () => {
        const sectorMapRenderer = { render: vi.fn() };
        const flightVisualRenderer = { render: vi.fn() };
        const selectionContainer = document.createElement('div');
        selectionContainer.dataset.howToPlaySelectedCount = '1';
        let frameCount = 0;
        const requestFrame = vi.fn(callback => {
            if (frameCount === 0) {
                frameCount += 1;
                callback(1000);
            }
            return 10;
        });
        const diagrams = new HowToPlayDiagrams({
            requestFrame,
            cancelFrame: vi.fn(),
            sectorMapRenderer,
            flightVisualRenderer,
            gameDataRepository: createRepository(),
            colorPalette: { createWorldColors: vi.fn(() => ({ categories: {}, facilities: {} })) }
        });
        const canvas = createCanvas();

        diagrams.startLaunchDemo(canvas, { selectionContainer });
        const hiddenState = flightVisualRenderer.render.mock.calls[0][3];
        expect(hiddenState.navigationRocket).toBeNull();
        expect(hiddenState.predictionPath).toEqual([]);
        expect(hiddenState.sonarEnabled).toBe(false);

        diagrams.stopAll();
        selectionContainer.dataset.howToPlaySelectedCount = '2';
        frameCount = 0;
        diagrams.startLaunchDemo(canvas, { selectionContainer });
        const visibleState = flightVisualRenderer.render.mock.calls.at(-1)[3];
        expect(visibleState.navigationRocket).toBeInstanceOf(Rocket);
        expect(visibleState.predictionPath.length).toBeGreaterThan(0);
        expect(visibleState.sonarEnabled).toBe(true);

        diagrams.stopAll();
    });

    it('matches the canvas backing size to the displayed rectangle without forcing a minimum aspect', () => {
        let frameCount = 0;
        const requestFrame = vi.fn(callback => {
            if (frameCount === 0) {
                frameCount += 1;
                callback(1000);
            }
            return 12;
        });
        const diagrams = new HowToPlayDiagrams({
            requestFrame,
            cancelFrame: vi.fn(),
            sectorMapRenderer: { render: vi.fn() },
            flightVisualRenderer: { render: vi.fn() },
            gameDataRepository: createRepository(),
            colorPalette: { createWorldColors: vi.fn(() => ({ categories: {}, facilities: {} })) }
        });
        const canvas = createCanvas();
        canvas.getBoundingClientRect = vi.fn(() => ({
            width: 320,
            height: 88
        }));

        diagrams.startLaunchDemo(canvas, {
            selectionContainer: {
                dataset: {
                    howToPlaySelectedCount: '2'
                }
            }
        });

        expect(canvas.width).toBe(320);
        expect(canvas.height).toBe(88);
        diagrams.stopAll();
    });

    it('keeps the launch preview static until the aim step and after the launch button press', () => {
        const flightVisualRenderer = { render: vi.fn() };
        const selectionContainer = document.createElement('div');
        const timestamps = [1000, 1600];
        const requestFrame = vi.fn(callback => {
            if (timestamps.length > 0) {
                callback(timestamps.shift());
            }
            return 11;
        });
        const diagrams = new HowToPlayDiagrams({
            requestFrame,
            cancelFrame: vi.fn(),
            sectorMapRenderer: { render: vi.fn() },
            flightVisualRenderer,
            gameDataRepository: createRepository(),
            colorPalette: { createWorldColors: vi.fn(() => ({ categories: {}, facilities: {} })) }
        });
        const canvas = createCanvas();

        selectionContainer.dataset.howToPlaySelectedCount = '2';
        selectionContainer.dataset.howToPlayAimState = 'ready';
        diagrams.startLaunchDemo(canvas, { selectionContainer });
        const readyAngles = flightVisualRenderer.render.mock.calls.map(call => call[3].navigationRocket.angle);
        expect(new Set(readyAngles).size).toBe(1);

        diagrams.stopAll();
        flightVisualRenderer.render.mockClear();
        timestamps.push(1000, 1600);
        selectionContainer.dataset.howToPlayAimState = 'aiming';
        selectionContainer.dataset.howToPlayAimStartedAt = '1000';
        diagrams.startLaunchDemo(canvas, { selectionContainer });
        const aimingAngles = flightVisualRenderer.render.mock.calls.map(call => call[3].navigationRocket.angle);
        expect(new Set(aimingAngles).size).toBeGreaterThan(1);

        diagrams.stopAll();
        flightVisualRenderer.render.mockClear();
        timestamps.push(1000, 1600);
        selectionContainer.dataset.howToPlayAimState = 'locked';
        diagrams.startLaunchDemo(canvas, { selectionContainer });
        const lockedAngles = flightVisualRenderer.render.mock.calls.map(call => call[3].navigationRocket.angle);
        expect(new Set(lockedAngles).size).toBe(1);

        diagrams.stopAll();
    });

    it('applies assemble selection state to real item cards', () => {
        vi.useFakeTimers();
        const diagrams = new HowToPlayDiagrams({
            requestFrame: vi.fn(),
            cancelFrame: vi.fn(),
            gameDataRepository: {
                getUiText: vi.fn(() => 'Ready to assemble.')
            }
        });
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="how-to-play-demo-card"><article class="ItemCard"></article></div>
            <div class="how-to-play-demo-card"><article class="ItemCard"></article></div>
            <div class="how-to-play-demo-card"><article class="ItemCard"></article></div>
            <button class="how-to-play-demo-button state-disabled state-notable" disabled>
                <span class="btn-sub-label">Select chassis and logic.</span>
            </button>
        `;

        diagrams.startAssembleDemo(container);

        const cards = [...container.querySelectorAll('.ItemCard')];
        const button = container.querySelector('.how-to-play-demo-button');
        expect(cards.every(card => !card.classList.contains('state-selected'))).toBe(true);
        expect(button.classList.contains('state-disabled')).toBe(true);
        expect(button.classList.contains('state-notable')).toBe(true);
        expect(container.querySelector('.how-to-play-demo-card').classList.contains('state-selected')).toBe(false);

        vi.advanceTimersByTime(1800);
        expect(cards[0].classList.contains('state-selected')).toBe(true);
        expect(cards[0].classList.contains('state-pressed')).toBe(true);
        expect(cards[1].classList.contains('state-selected')).toBe(false);
        expect(button.querySelector('.btn-sub-label').textContent).toBe('Select chassis and logic.');
        vi.advanceTimersByTime(220);
        expect(cards[0].classList.contains('state-pressed')).toBe(false);

        vi.advanceTimersByTime(1580);
        expect(cards[1].classList.contains('state-selected')).toBe(true);
        expect(cards[1].classList.contains('state-pressed')).toBe(true);
        expect(button.disabled).toBe(false);
        expect(button.classList.contains('state-disabled')).toBe(false);
        expect(button.classList.contains('state-notable')).toBe(false);
        expect(button.querySelector('.btn-sub-label').textContent).toBe('Ready to assemble.');

        vi.advanceTimersByTime(3600);
        expect(cards[2].classList.contains('state-selected')).toBe(true);
        expect(button.classList.contains('state-pressed')).toBe(true);
        expect(button.disabled).toBe(true);

        diagrams.stopAll();
        vi.useRealTimers();
    });

    it('animates launch equipment selection and enables the launch button after rocket and launcher are selected', () => {
        vi.useFakeTimers();
        const diagrams = new HowToPlayDiagrams({
            requestFrame: vi.fn(),
            cancelFrame: vi.fn(),
            gameDataRepository: {
                getUiText: vi.fn(() => 'Confirm the launch angle to fire.')
            }
        });
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="how-to-play-demo-card"><article class="ItemCard"></article></div>
            <div class="how-to-play-demo-card"><article class="ItemCard"></article></div>
            <div class="how-to-play-demo-card"><article class="ItemCard"></article></div>
            <button class="how-to-play-demo-button state-disabled state-notable launch" disabled>
                <span class="btn-sub-label">Select a rocket and launcher to begin launch prep.</span>
            </button>
        `;

        diagrams.startLaunchEquipmentDemo(container);

        const cards = [...container.querySelectorAll('.ItemCard')];
        const button = container.querySelector('.how-to-play-demo-button');
        expect(cards.every(card => !card.classList.contains('state-selected'))).toBe(true);
        expect(button.disabled).toBe(true);

        vi.advanceTimersByTime(1800);
        expect(cards[0].classList.contains('state-selected')).toBe(true);
        expect(button.disabled).toBe(true);
        expect(button.querySelector('.btn-sub-label').textContent).toBe('Select a rocket and launcher to begin launch prep.');

        vi.advanceTimersByTime(1800);
        expect(cards[1].classList.contains('state-selected')).toBe(true);
        expect(button.disabled).toBe(false);
        expect(button.classList.contains('state-disabled')).toBe(false);
        expect(button.classList.contains('state-notable')).toBe(false);
        expect(button.querySelector('.btn-sub-label').textContent).toBe('Confirm the launch angle to fire.');

        vi.advanceTimersByTime(1800);
        expect(cards[2].classList.contains('state-selected')).toBe(true);

        vi.advanceTimersByTime(1800);
        expect(container.dataset.howToPlayAimState).toBe('aiming');

        vi.advanceTimersByTime(1800);
        expect(button.classList.contains('state-pressed')).toBe(true);
        expect(button.disabled).toBe(true);
        expect(container.dataset.howToPlayAimState).toBe('locked');

        diagrams.stopAll();
        vi.useRealTimers();
    });

    it('does not treat module cards inside a rocket item as launch selection targets', () => {
        vi.useFakeTimers();
        const diagrams = new HowToPlayDiagrams({
            requestFrame: vi.fn(),
            cancelFrame: vi.fn(),
            gameDataRepository: {
                getUiText: vi.fn(() => 'Confirm the launch angle to fire.')
            }
        });
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="how-to-play-demo-card">
                <article class="ItemCard" data-card="rocket">
                    <div class="rocket-details">
                        <article class="ItemCard" data-card="module"></article>
                    </div>
                </article>
            </div>
            <div class="how-to-play-demo-card"><article class="ItemCard" data-card="launcher"></article></div>
            <div class="how-to-play-demo-card"><article class="ItemCard" data-card="booster"></article></div>
            <button class="how-to-play-demo-button state-disabled state-notable launch" disabled>
                <span class="btn-sub-label">Select a rocket and launcher to begin launch prep.</span>
            </button>
        `;

        diagrams.startLaunchEquipmentDemo(container);

        const rocket = container.querySelector('[data-card="rocket"]');
        const module = container.querySelector('[data-card="module"]');
        const launcher = container.querySelector('[data-card="launcher"]');
        const booster = container.querySelector('[data-card="booster"]');
        vi.advanceTimersByTime(1800);
        expect(rocket.classList.contains('state-selected')).toBe(true);
        expect(module.classList.contains('state-selected')).toBe(false);
        expect(module.classList.contains('state-pressed')).toBe(false);
        expect(launcher.classList.contains('state-selected')).toBe(false);

        vi.advanceTimersByTime(1800);
        expect(launcher.classList.contains('state-selected')).toBe(true);
        expect(module.classList.contains('state-selected')).toBe(false);

        vi.advanceTimersByTime(1800);
        expect(booster.classList.contains('state-selected')).toBe(true);
        expect(module.classList.contains('state-selected')).toBe(false);

        diagrams.stopAll();
        vi.useRealTimers();
    });
});
