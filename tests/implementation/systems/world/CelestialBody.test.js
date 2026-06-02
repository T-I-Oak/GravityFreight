import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import Item from '../../../../src/systems/entities/Item.js';
import CelestialBody from '../../../../src/systems/world/CelestialBody.js';

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

describe('CelestialBody', () => {
    it('uses master home star values when radius is omitted for home body', () => {
        const body = new CelestialBody({
            position: { x: 0, y: 0 },
            isHome: true
        }, repository);

        expect(body.position).toEqual({ x: 0, y: 0 });
        expect(body.radius).toBe(25);
        expect(body.mass).toBe(4000);
        expect(body.isRepulsion).toBe(false);
        expect(body.isHome).toBe(true);
        expect(body.items).toEqual([]);
    });

    it('uses explicit radius for home and normal bodies', () => {
        const home = new CelestialBody({
            position: { x: 0, y: 0 },
            isHome: true,
            radius: 40
        }, repository);
        const normal = new CelestialBody({
            position: { x: 10, y: 20 },
            radius: 35
        }, repository);

        expect(home.radius).toBe(40);
        expect(home.mass).toBe(1600);
        expect(normal.radius).toBe(35);
        expect(normal.mass).toBe(1225);
    });

    it('uses configured random radius range for normal bodies when radius is omitted', () => {
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

        const body = new CelestialBody({
            position: { x: 100, y: -50 }
        }, repository);

        expect(body.radius).toBe(45);
        expect(body.mass).toBe(2025);
        randomSpy.mockRestore();
    });

    it('returns gravity field vector from body mass, direction, and polarity only', () => {
        const attractive = new CelestialBody({
            position: { x: 3, y: 4 },
            radius: 10
        }, repository);
        const repulsive = new CelestialBody({
            position: { x: 3, y: 4 },
            radius: 10,
            isRepulsion: true
        }, repository);

        expect(attractive.getGravityFieldVector({ x: 0, y: 0 })).toEqual({
            x: 2.4,
            y: 3.2
        });
        expect(repulsive.getGravityFieldVector({ x: 0, y: 0 })).toEqual({
            x: -2.4,
            y: -3.2
        });
    });

    it('checks line-segment collision against body and target radii', () => {
        const body = new CelestialBody({
            position: { x: 0, y: 0 },
            radius: 10
        }, repository);

        expect(body.checkCollision({ x: 20, y: 0 }, { x: -20, y: 0 }, 2)).toBe(true);
        expect(body.checkCollision({ x: 20, y: 20 }, { x: -20, y: 20 }, 2)).toBe(false);
    });

    it('moves held items on pickup and accepts lost items', () => {
        const items = [
            new Item('coin_100', repository),
            new Item('cargo_safe', repository)
        ];
        const body = new CelestialBody({
            position: { x: 0, y: 0 },
            radius: 10,
            items
        }, repository);

        expect(body.checkPickup({ x: 20, y: 0 }, 10)).toEqual(items);
        expect(body.items).toEqual([]);
        expect(body.checkPickup({ x: 20, y: 0 }, 10)).toEqual([]);

        const lostItems = [new Item('hull_light', repository)];
        body.addItems(lostItems);
        expect(body.items).toEqual(lostItems);
    });

    it('creates and restores snapshots without storing derived mass', () => {
        const item = new Item('coin_100', repository);
        const body = new CelestialBody({
            position: { x: 100, y: 200 },
            radius: 30,
            isRepulsion: true,
            items: [item]
        }, repository);

        const snapshot = body.createSnapshot();
        const restored = CelestialBody.fromSnapshot(snapshot, repository);

        expect(snapshot).toEqual({
            position: { x: 100, y: 200 },
            isRepulsion: true,
            isHome: false,
            radius: 30,
            items: [item.createSnapshot()]
        });
        expect(restored.position).toEqual(body.position);
        expect(restored.radius).toBe(30);
        expect(restored.mass).toBe(900);
        expect(restored.items[0].uid).toBe(item.uid);
    });

    it('omits default home radius from snapshot and restores it from master config', () => {
        const body = new CelestialBody({
            position: { x: 0, y: 0 },
            isHome: true
        }, repository);

        const snapshot = body.createSnapshot();
        const restored = CelestialBody.fromSnapshot(snapshot, repository);

        expect(snapshot).toEqual({
            position: { x: 0, y: 0 },
            isRepulsion: false,
            isHome: true,
            items: []
        });
        expect(restored.radius).toBe(25);
        expect(restored.mass).toBe(4000);
    });
});
