import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../../../src/core/GameDataRepository.js';
import ExitArc from '../../../../src/systems/world/ExitArc.js';

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

describe('ExitArc', () => {
    it('resolves width and radius from facility type and master config', () => {
        const arc = new ExitArc({
            angle: 90,
            type: 'TRADING_POST'
        }, repository);

        expect(arc.angle).toBe(90);
        expect(arc.width).toBe(60);
        expect(arc.type).toBe('TRADING_POST');
        expect(arc.radius).toBe(900);
    });

    it('returns the facility type through the formal accessor', () => {
        const arc = new ExitArc({
            angle: 180,
            type: 'REPAIR_DOCK'
        }, repository);

        expect(arc.getFacilityType()).toBe('REPAIR_DOCK');
    });

    it('checks entrance by boundary radius and angle range', () => {
        const arc = new ExitArc({
            angle: 90,
            type: 'TRADING_POST'
        }, repository);

        expect(arc.checkEntrance({ x: 0, y: 901 })).toBe(true);
        expect(arc.checkEntrance({ x: 0, y: 899 })).toBe(false);
        expect(arc.checkEntrance({ x: 901, y: 0 })).toBe(false);
    });

    it('applies launch configuration width multiplier when checking entrance', () => {
        const arc = new ExitArc({
            angle: 0,
            type: 'BLACK_MARKET'
        }, repository);

        expect(arc.checkEntrance({ x: 900, y: 159 }, 1)).toBe(false);
        expect(arc.checkEntrance({ x: 900, y: 159 }, 2)).toBe(true);
    });

    it('handles angle ranges that cross 0 degrees', () => {
        const arc = new ExitArc({
            angle: 350,
            type: 'TRADING_POST'
        }, repository);

        expect(arc.checkEntrance({ x: 901, y: 0 })).toBe(true);
        expect(arc.checkEntrance({ x: 900, y: -20 })).toBe(true);
        expect(arc.checkEntrance({ x: 0, y: 901 })).toBe(false);
    });

    it('normalizes center angle while preserving its sector position', () => {
        const arc = new ExitArc({
            angle: 370,
            type: 'BLACK_MARKET'
        }, repository);

        expect(arc.angle).toBe(10);
        expect(arc.width).toBe(20);
        expect(arc.checkEntrance({ x: 901, y: 0 })).toBe(true);
    });

    it('creates and restores snapshots without storing derived width or radius', () => {
        const arc = new ExitArc({
            angle: 270,
            type: 'BLACK_MARKET'
        }, repository);

        const snapshot = arc.createSnapshot();
        const restored = ExitArc.fromSnapshot(snapshot, repository);

        expect(snapshot).toEqual({
            angle: 270,
            type: 'BLACK_MARKET'
        });
        expect(restored.angle).toBe(270);
        expect(restored.type).toBe('BLACK_MARKET');
        expect(restored.width).toBe(20);
        expect(restored.radius).toBe(900);
    });

    it('rejects unknown facility types', () => {
        expect(() => new ExitArc({
            angle: 0,
            type: 'UNKNOWN'
        }, repository)).toThrow('[ExitArc] Unknown facility type: UNKNOWN');
    });
});
