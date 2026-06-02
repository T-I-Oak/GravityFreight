import GameDataRepository from '../core/GameDataRepository.js';
import {
    createDevNavigationDemo,
    renderDevNavigationFrame,
    resetDevNavigationDemo,
    tickDevNavigationDemo
} from './navigation_demo.js';

const STEPS_PER_FRAME = 4;

function createCommonDataManagerStub() {
    const store = new Map();
    return {
        getSavedData(key) {
            return store.get(key);
        },
        setSavedData(key, data) {
            store.set(key, data);
        }
    };
}

function fitCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
}

function setStatus(elements, demo) {
    const position = demo.rocket.position;
    const velocity = demo.rocket.velocity;
    elements.sector.textContent = String(demo.sector.sectorNumber);
    elements.tick.textContent = String(demo.rocket.ticks);
    elements.position.textContent = `${position.x.toFixed(1)}, ${position.y.toFixed(1)}`;
    elements.velocity.textContent = `${velocity.x.toFixed(1)}, ${velocity.y.toFixed(1)}`;
    elements.result.textContent = demo.lastResult?.collision?.type || 'NAVIGATING';
}

function bindControls(demo, controls, render) {
    controls.start.addEventListener('click', () => {
        demo.isRunning = true;
        render();
    });

    controls.pause.addEventListener('click', () => {
        demo.isRunning = false;
        render();
    });

    controls.step.addEventListener('click', () => {
        demo.isRunning = false;
        tickDevNavigationDemo(demo);
        render();
    });

    controls.reset.addEventListener('click', () => {
        resetDevNavigationDemo(demo);
        render();
    });
}

async function initialize() {
    const canvas = document.querySelector('[data-dev-navigation-canvas]');
    const context = canvas.getContext('2d');
    const repository = new GameDataRepository(createCommonDataManagerStub(), {
        expandLanguageResource: value => value
    });
    await repository.loadAllData();

    const demo = createDevNavigationDemo(repository);
    const elements = {
        sector: document.querySelector('[data-dev-navigation-sector]'),
        tick: document.querySelector('[data-dev-navigation-tick]'),
        position: document.querySelector('[data-dev-navigation-position]'),
        velocity: document.querySelector('[data-dev-navigation-velocity]'),
        result: document.querySelector('[data-dev-navigation-result]')
    };

    const render = () => {
        fitCanvas(canvas);
        renderDevNavigationFrame(context, demo);
        setStatus(elements, demo);
    };

    bindControls(demo, {
        start: document.querySelector('[data-dev-navigation-start]'),
        pause: document.querySelector('[data-dev-navigation-pause]'),
        step: document.querySelector('[data-dev-navigation-step]'),
        reset: document.querySelector('[data-dev-navigation-reset]')
    }, render);

    window.addEventListener('resize', render);

    function frame() {
        if (demo.isRunning && !demo.lastResult?.collision) {
            for (let i = 0; i < STEPS_PER_FRAME && !demo.lastResult?.collision; i += 1) {
                tickDevNavigationDemo(demo);
            }
        }
        render();
        window.requestAnimationFrame(frame);
    }

    window.__devNavigationDemo = {
        demo,
        render,
        tick: () => tickDevNavigationDemo(demo),
        reset: () => resetDevNavigationDemo(demo)
    };

    frame();
}

initialize().catch(error => {
    console.error('[navigation_demo] Failed to initialize.', error);
});
