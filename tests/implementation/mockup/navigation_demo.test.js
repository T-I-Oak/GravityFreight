import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../../src/core/GameDataRepository.js';
import {
    createDevNavigationDemo,
    renderDevNavigationFrame,
    tickDevNavigationDemo
} from '../../../src/mockup/navigation_demo.js';

let repository;

beforeAll(async () => {
    repository = new GameDataRepository({
        getSavedData: vi.fn(),
        setSavedData: vi.fn()
    }, {
        expandLanguageResource: value => value
    });
    await repository.loadAllData();
});

function createCanvasStub() {
    const calls = [];
    const context = new Proxy({
        canvas: {
            width: 960,
            height: 720
        }
    }, {
        get(target, prop) {
            if (prop in target) {
                return target[prop];
            }

            return (...args) => {
                calls.push({ method: prop, args });
            };
        },
        set(target, prop, value) {
            target[prop] = value;
            calls.push({ method: `set:${prop}`, args: [value] });
            return true;
        }
    });

    return { context, calls };
}

describe('navigation demo', () => {
    it('creates fixed sector, rocket, prediction, and service dependencies', () => {
        const demo = createDevNavigationDemo(repository);

        expect(demo.sector.sectorNumber).toBe(1);
        expect(demo.sector.bodies.length).toBeGreaterThan(1);
        expect(demo.sector.exits).toHaveLength(3);
        expect(Math.hypot(demo.rocket.position.x, demo.rocket.position.y)).toBeCloseTo(37);
        expect(demo.rocket.velocity.x).toBeGreaterThan(0);
        expect(demo.prediction.isGhost).toBe(true);
        expect(demo.prediction.actualTrail.length).toBeGreaterThan(0);
        expect(demo.physicsEngine).toBeDefined();
    });

    it('steps the live rocket and keeps the original prediction separate', () => {
        const demo = createDevNavigationDemo(repository);
        const initialPredictionLength = demo.prediction.actualTrail.length;
        const initialRocketX = demo.rocket.position.x;

        const result = tickDevNavigationDemo(demo);

        expect(result.ticks).toBe(1);
        expect(demo.rocket.position.x).not.toBe(initialRocketX);
        expect(demo.rocket.actualTrail).toHaveLength(1);
        expect(demo.prediction.actualTrail).toHaveLength(initialPredictionLength);
    });

    it('can create and reset the demo with a supplied launch angle', () => {
        const demo = createDevNavigationDemo(repository, {
            launchAngle: Math.PI / 2
        });

        expect(demo.launchAngle).toBe(Math.PI / 2);
        expect(demo.rocket.velocity.y).toBeGreaterThan(0);
        expect(Math.abs(demo.rocket.velocity.x)).toBeLessThan(0.001);
    });

    it('stops ticking after a collision has been recorded', () => {
        const demo = createDevNavigationDemo(repository);
        demo.lastResult = {
            collision: {
                type: 'boundary'
            }
        };

        const result = tickDevNavigationDemo(demo);

        expect(result.collision.type).toBe('boundary');
        expect(demo.rocket.actualTrail).toEqual([]);
    });

    it('renders a nonblank canvas frame through the drawing adapter', () => {
        const demo = createDevNavigationDemo(repository);
        const { context, calls } = createCanvasStub();

        renderDevNavigationFrame(context, demo);

        expect(calls.some(call => call.method === 'fillRect')).toBe(true);
        expect(calls.some(call => call.method === 'arc')).toBe(true);
        expect(calls.some(call => call.method === 'stroke')).toBe(true);
        expect(calls.some(call => call.method === 'fillText')).toBe(true);
    });
});
