import CanvasColorPalette from '../core/CanvasColorPalette.js';
import FlightVisualRenderer from '../core/FlightVisualRenderer.js';
import SectorMapRenderer from '../core/SectorMapRenderer.js';
import Item from '../entities/Item.js';
import Rocket from '../entities/Rocket.js';
import RocketItem from '../entities/RocketItem.js';
import Sector from '../world/Sector.js';

const FALLBACK_COLORS = {
    boundary: 'rgba(255, 255, 255, 0.24)',
    prediction: '#00ffd5',
    trail: 'rgba(255, 255, 255, 0.42)',
    sonar: '#00ffd5',
    rocket: '#ffffff',
    homeStar: '#00f5ff',
    normalStar: '#ffd966',
    repulsiveStar: '#ff6b8a',
    categories: {
        cargo: '#ffaa44',
        module: '#00ffd5',
        rocket: '#ffffff'
    },
    facilities: {
        TRADING_POST: '#44ddff',
        REPAIR_DOCK: '#ffcc44',
        BLACK_MARKET: '#bb77ff'
    }
};

const ASSEMBLE_DEMO_STEP_MS = 1800;
const ASSEMBLE_DEMO_PRESS_MS = 220;
const NAVIGATION_DEMO = {
    star: { x: 400, y: -80, radius: 34 },
    exitAngle: 0,
    cameraCenter: { x: 600, y: 0 },
    cameraScale: 0.25,
    startPosition: { x: 45, y: 40 },
    startVelocity: { x: 9, y: -6 },
    gravity: 5600,
    trailFadePerFrame: 0.018,
    resetDelayFrames: 90
};

class HowToPlayDiagrams {
    constructor(options = {}) {
        this.flightVisualRenderer = options.flightVisualRenderer || new FlightVisualRenderer();
        this.sectorMapRenderer = options.sectorMapRenderer || new SectorMapRenderer();
        this.colorPalette = options.colorPalette || new CanvasColorPalette();
        this.gameDataRepository = options.gameDataRepository || null;
        this.requestFrame = options.requestFrame || globalThis.requestAnimationFrame?.bind(globalThis);
        this.cancelFrame = options.cancelFrame || globalThis.cancelAnimationFrame?.bind(globalThis);
        this.timers = new Set();
        this.frames = new Set();
    }

    startAssembleDemo(container) {
        this.stopAll();
        if (!container) {
            return;
        }

        this.#startBuildPanelDemo(container, {
            readySubtextPath: 'build.assemble.readySubtext',
            readySubtextFallback: 'ロケットを建造できます',
            states: [
                { selectedCount: 0, ready: false, buttonPressed: false },
                { selectedCount: 1, ready: false, pressedCardIndex: 0, buttonPressed: false },
                { selectedCount: 2, ready: true, pressedCardIndex: 1, buttonPressed: false },
                { selectedCount: 3, ready: true, pressedCardIndex: 2, buttonPressed: false },
                { selectedCount: 3, ready: true, buttonPressed: true }
            ]
        });
    }

    startLaunchEquipmentDemo(container) {
        if (!container) {
            return;
        }

        this.#startBuildPanelDemo(container, {
            readySubtextPath: 'build.launch.readySubtext',
            readySubtextFallback: '発射角度を確認して発射できます',
            states: [
                { selectedCount: 0, ready: false, buttonPressed: false },
                { selectedCount: 1, ready: false, pressedCardIndex: 0, buttonPressed: false },
                { selectedCount: 2, ready: true, pressedCardIndex: 1, buttonPressed: false, aimState: 'ready' },
                { selectedCount: 3, ready: true, pressedCardIndex: 2, buttonPressed: false, aimState: 'ready' },
                { selectedCount: 3, ready: true, buttonPressed: false, aimState: 'aiming' },
                { selectedCount: 3, ready: true, buttonPressed: true, aimState: 'locked' }
            ]
        });
    }

    #startBuildPanelDemo(container, config) {
        let step = 0;
        let previousAimState = '';
        const cards = [...container.querySelectorAll('.how-to-play-demo-card > .ItemCard')];
        const button = container.querySelector('.how-to-play-demo-button');
        const subLabel = button?.querySelector('.btn-sub-label');
        const waitingSubtext = subLabel?.textContent ?? '';
        const readySubtext = this.#getUiText(config.readySubtextPath, config.readySubtextFallback);
        const states = config.states ?? [
            { selectedCount: 0, ready: false, buttonPressed: false },
            { selectedCount: 1, ready: false, pressedCardIndex: 0, buttonPressed: false },
            { selectedCount: 2, ready: true, pressedCardIndex: 1, buttonPressed: false },
            { selectedCount: 3, ready: true, pressedCardIndex: 2, buttonPressed: false },
            { selectedCount: 3, ready: true, buttonPressed: true }
        ];
        const advance = () => {
            const state = states[step % states.length];
            const aimState = state.aimState || '';
            const now = globalThis.performance?.now?.() ?? Date.now();
            if (aimState === 'aiming' && previousAimState !== 'aiming') {
                container.dataset.howToPlayAimStartedAt = String(now);
                delete container.dataset.howToPlayLockedAngle;
            }
            if (aimState === 'locked' && previousAimState === 'aiming') {
                container.dataset.howToPlayLockedAngle = String(this.#getLaunchAimAngle(now, container));
            }
            if (!aimState) {
                delete container.dataset.howToPlayAimStartedAt;
                delete container.dataset.howToPlayLockedAngle;
            }
            container.dataset.howToPlaySelectedCount = String(state.selectedCount);
            container.dataset.howToPlayAimState = aimState;
            cards.forEach((card, index) => {
                card.classList.toggle('state-selected', index < state.selectedCount);
            });
            this.#pulsePressedCard(cards, state.pressedCardIndex);
            this.#applyAssembleButtonState(button, subLabel, {
                ...state,
                waitingSubtext,
                readySubtext
            });
            previousAimState = aimState;
            step += 1;
        };
        advance();
        const timer = setInterval(advance, ASSEMBLE_DEMO_STEP_MS);
        this.timers.add(timer);
    }

    #pulsePressedCard(cards, pressedCardIndex) {
        cards.forEach(card => card.classList.remove('state-pressed'));
        const card = cards[pressedCardIndex];
        if (!card) {
            return;
        }

        card.classList.add('state-pressed');
        const timer = setTimeout(() => card.classList.remove('state-pressed'), ASSEMBLE_DEMO_PRESS_MS);
        this.timers.add(timer);
    }

    #applyAssembleButtonState(button, subLabel, state) {
        if (!button) {
            return;
        }

        const isDisabled = !state.ready || state.buttonPressed;
        button.disabled = isDisabled;
        button.classList.toggle('state-disabled', isDisabled);
        button.classList.toggle('state-notable', !state.ready);
        button.classList.toggle('state-pressed', !!state.buttonPressed);
        if (subLabel) {
            subLabel.textContent = state.ready ? state.readySubtext : state.waitingSubtext;
        }
    }

    startLaunchDemo(canvas, options = {}) {
        this.#startCanvasLoop(canvas, (progress, timestamp) => {
            const angle = this.#getLaunchAimAngle(timestamp, options.selectionContainer);
            const sector = this.#createDemoSector({ includeExit: false });
            const home = sector.bodies.find(body => body.isHome);
            const radius = (home?.radius ?? 40) + 28;
            const selectedCount = Number(options.selectionContainer?.dataset?.howToPlaySelectedCount ?? 0);
            if (selectedCount < 2) {
                this.#renderWorld(canvas, {
                    sector,
                    rocket: null,
                    predictionPath: [],
                    sonarEnabled: false
                });
                return;
            }

            const rocket = this.#createDemoRocket({
                position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
                velocity: { x: Math.cos(angle), y: Math.sin(angle) },
                angle,
                collectionRange: 70
            });
            const predictionPath = this.#createPredictionPath(rocket.position, angle);

            this.#renderWorld(canvas, {
                sector,
                rocket,
                predictionPath,
                sonarEnabled: true
            });
        });
    }

    #getLaunchAimAngle(timestamp, selectionContainer) {
        const baseAngle = -0.8;
        const aimState = selectionContainer?.dataset?.howToPlayAimState || '';
        if (aimState === 'aiming') {
            const startedAt = Number(selectionContainer?.dataset?.howToPlayAimStartedAt ?? timestamp);
            const elapsed = Math.max(0, timestamp - startedAt);
            return baseAngle + Math.sin((elapsed % 4200) / 4200 * Math.PI * 2) * 0.35;
        }
        if (aimState === 'locked') {
            return Number(selectionContainer?.dataset?.howToPlayLockedAngle ?? baseAngle);
        }
        return baseAngle;
    }

    startNavigationDemo(canvas) {
        const state = this.#createNavigationDemoState();
        this.#startCanvasLoop(canvas, () => {
            this.#stepNavigationDemo(state);
            const rocket = this.#createNavigationDemoRocket(state);

            this.#renderWorld(canvas, {
                sector: this.#createNavigationDemoSector(),
                rocket,
                predictionPath: [],
                sonarEnabled: false,
                hideRocketBody: state.isGoal,
                cameraCenter: NAVIGATION_DEMO.cameraCenter,
                cameraScale: NAVIGATION_DEMO.cameraScale
            });
        });
    }

    stopAll() {
        this.timers.forEach(timer => clearInterval(timer));
        this.frames.forEach(frame => this.cancelFrame?.(frame));
        this.timers.clear();
        this.frames.clear();
    }

    handleResize() { }

    #renderWorld(canvas, state) {
        const context = canvas.getContext('2d');
        const { width, height } = this.#syncCanvasSize(canvas);
        const transform = this.#createTransform(width, height, state.cameraCenter, state.cameraScale);
        const colors = this.#createColors();

        context.clearRect(0, 0, width, height);
        context.fillStyle = 'rgba(2, 5, 18, 0.72)';
        context.fillRect(0, 0, width, height);
        this.sectorMapRenderer.render(context, state.sector, transform, colors, {
            timestamp: globalThis.performance?.now?.() ?? Date.now(),
            activeRocket: state.rocket
        });
        this.flightVisualRenderer.render(context, transform, {
            timestamp: globalThis.performance?.now?.() ?? Date.now()
        }, {
            navigationRocket: state.rocket,
            predictionPath: state.predictionPath,
            sonarEnabled: state.sonarEnabled,
            sonarStopTimestamp: null,
            hideRocketBody: !!state.hideRocketBody
        }, colors);
    }

    #createDemoSector({ includeExit }) {
        const repository = this.#requiredRepository();
        const config = repository.getMasterConfig();
        return Sector.fromSnapshot({
            sectorNumber: 1,
            isAnomaly: false,
            luckyDiscountRate: 0,
            bodies: [
                {
                    position: config.homeStarPosition,
                    radius: config.homeStarRadius,
                    isHome: true,
                    isRepulsion: false,
                    items: []
                },
                {
                    position: { x: -135, y: 35 },
                    radius: config.starDefaultRadius,
                    isHome: false,
                    isRepulsion: false,
                    items: [this.#createItem('cargo_normal').createSnapshot()]
                }
            ],
            exits: includeExit ? [
                { angle: 336, type: 'TRADING_POST' }
            ] : []
        }, repository);
    }

    #createNavigationDemoSector() {
        const repository = this.#requiredRepository();
        return Sector.fromSnapshot({
            sectorNumber: 1,
            isAnomaly: false,
            luckyDiscountRate: 0,
            bodies: [
                {
                    position: NAVIGATION_DEMO.star,
                    radius: NAVIGATION_DEMO.star.radius,
                    isHome: false,
                    isRepulsion: false,
                    items: [this.#createItem('cargo_normal').createSnapshot()]
                }
            ],
            exits: [
                { angle: NAVIGATION_DEMO.exitAngle, type: 'TRADING_POST' }
            ]
        }, repository);
    }

    #createDemoRocket({ position, velocity, angle = 0, actualTrail = [], heldCargo = [] }) {
        const rocket = new Rocket(
            new RocketItem(
                this.#createItem('hull_light'),
                this.#createItem('sensor_short'),
                [this.#createItem('mod_analyzer')]
            ),
            this.#createItem('pad_standard_d2'),
            this.#createItem('opt_fuel'),
            angle,
            position
        );
        rocket.velocity = velocity;
        rocket.actualTrail = actualTrail;
        rocket.heldCargo = heldCargo;
        return rocket;
    }

    #createNavigationDemoState() {
        return {
            position: { ...NAVIGATION_DEMO.startPosition },
            velocity: { ...NAVIGATION_DEMO.startVelocity },
            trail: [],
            heldCargo: [this.#createItem('cargo_normal')],
            isGoal: false,
            resetFrames: 0
        };
    }

    #stepNavigationDemo(state) {
        if (!state.isGoal) {
            const toStar = {
                x: NAVIGATION_DEMO.star.x - state.position.x,
                y: NAVIGATION_DEMO.star.y - state.position.y
            };
            const distance = Math.max(Math.hypot(toStar.x, toStar.y), 25);
            const force = NAVIGATION_DEMO.gravity / (distance * distance);
            state.velocity = {
                x: state.velocity.x + (toStar.x / distance) * force,
                y: state.velocity.y + (toStar.y / distance) * force
            };
            state.position = {
                x: state.position.x + state.velocity.x,
                y: state.position.y + state.velocity.y
            };
            state.trail.push({ ...state.position, alpha: 1 });
            if (this.#hasReachedNavigationArc(state.position)) {
                state.isGoal = true;
            }
        }

        state.trail.forEach(point => {
            point.alpha -= NAVIGATION_DEMO.trailFadePerFrame;
        });
        state.trail = state.trail.filter(point => point.alpha > 0);
        if (state.isGoal && state.trail.length === 0) {
            state.resetFrames += 1;
            if (state.resetFrames >= NAVIGATION_DEMO.resetDelayFrames) {
                Object.assign(state, this.#createNavigationDemoState());
            }
        }
    }

    #hasReachedNavigationArc(position) {
        const boundaryRadius = this.#requiredRepository().getMasterConfig().boundaryRadius;
        const distance = Math.hypot(position.x, position.y);
        if (distance < boundaryRadius) {
            return false;
        }

        const angle = ((Math.atan2(position.y, position.x) * 180 / Math.PI) % 360 + 360) % 360;
        const diff = Math.abs(angle - NAVIGATION_DEMO.exitAngle);
        return Math.min(diff, 360 - diff) <= 16;
    }

    #createNavigationDemoRocket(state) {
        const rocket = this.#createDemoRocket({
            position: state.position,
            velocity: state.velocity,
            actualTrail: state.trail.map(point => ({ x: point.x, y: point.y, alpha: point.alpha })),
            heldCargo: state.isGoal ? [] : state.heldCargo
        });
        return rocket;
    }

    #createPredictionPath(position, angle) {
        return Array.from({ length: 44 }, (_, index) => {
            const distance = index * 10;
            return {
                x: position.x + Math.cos(angle) * distance,
                y: position.y + Math.sin(angle) * distance + Math.sin(index * 0.16) * 8
            };
        });
    }

    #createItem(id) {
        return new Item(id, this.#requiredRepository());
    }

    #getUiText(path, fallback) {
        return this.gameDataRepository?.getUiText?.(path) ?? fallback;
    }

    #requiredRepository() {
        if (!this.gameDataRepository) {
            throw new Error('[HowToPlayDiagrams] gameDataRepository is required.');
        }
        return this.gameDataRepository;
    }

    #createTransform(width, height, cameraCenter = { x: 0, y: 0 }, scaleOverride = null) {
        const scale = scaleOverride ?? Math.min(width / 620, height / 420);
        return {
            scale,
            rotation: 0,
            toScreen: point => ({
                x: width / 2 + (point.x - cameraCenter.x) * scale,
                y: height / 2 + (point.y - cameraCenter.y) * scale
            }),
            radius: value => value * scale
        };
    }

    #createColors() {
        try {
            return this.colorPalette.createWorldColors();
        } catch {
            return FALLBACK_COLORS;
        }
    }

    #startCanvasLoop(canvas, renderer) {
        this.stopAll();
        if (!canvas || !this.requestFrame) {
            return;
        }

        const startedAt = globalThis.performance?.now?.() ?? Date.now();
        const draw = timestamp => {
            if (!canvas.isConnected) {
                return;
            }
            const progress = (((timestamp ?? Date.now()) - startedAt) % 4200) / 4200;
            renderer(progress, timestamp ?? Date.now());
            const frame = this.requestFrame(draw);
            this.frames.add(frame);
        };
        const frame = this.requestFrame(draw);
        this.frames.add(frame);
    }

    #syncCanvasSize(canvas) {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || canvas.width || 480));
        const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || canvas.height || 220));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        return { width, height };
    }
}

export default HowToPlayDiagrams;
