import { describe, it, expect } from 'vitest';
import { Vector2, calculateAcceleration, G } from '../src/utils/Physics.js';

describe('Physics Logic', () => {
    it('Vector2 addition works', () => {
        const v1 = new Vector2(1, 2);
        const v2 = new Vector2(3, 4);
        const v3 = v1.add(v2);
        expect(v3.x).toBe(4);
        expect(v3.y).toBe(6);
    });

    it('Acceleration follows inverse-square law', () => {
        const pos = new Vector2(0, 0);
        const star = { position: new Vector2(100, 0), mass: 100 };
        const bodies = [star];
        const targetMass = 10; // reference mass
        
        const acc = calculateAcceleration(pos, bodies, targetMass);
        
        // r = 100, M = 100, G = 4000
        // a = G * M / r^2 = 4000 * 100 / 10000 = 40
        expect(acc.length()).toBeCloseTo(40);
        expect(acc.x).toBeGreaterThan(0);
        expect(acc.y).toBe(0);

        // 距離を2倍にすると加速度は1/4になるはず
        star.position = new Vector2(200, 0);
        const acc2 = calculateAcceleration(pos, bodies, targetMass);
        // r = 200, a = G * M / r^2 = 4000 * 100 / 40000 = 10
        expect(acc2.length()).toBeCloseTo(10);
    });
});
