import { describe, it, expect } from 'vitest';
import { Vector2, calculateGravity, G } from '../src/Physics.js';

describe('Physics Logic', () => {
    it('Vector2 addition works', () => {
        const v1 = new Vector2(1, 2);
        const v2 = new Vector2(3, 4);
        const v3 = v1.add(v2);
        expect(v3.x).toBe(4);
        expect(v3.y).toBe(6);
    });

    it('Gravity follows inverse-square law', () => {
        const pos1 = new Vector2(0, 0);
        const pos2 = new Vector2(100, 0);
        const mass1 = 1;
        const mass2 = 100;
        
        const force1 = calculateGravity(pos1, mass1, pos2, mass2);
        
        // r = 100, F = G * 1 * 100 / 100^2 = 4000 * 100 / 10000 = 40
        expect(force1.length()).toBeCloseTo(40);
        expect(force1.x).toBeGreaterThan(0);
        expect(force1.y).toBe(0);

        // 距離を2倍にすると力は1/4になるはず
        const pos3 = new Vector2(200, 0);
        const force2 = calculateGravity(pos1, mass1, pos3, mass2);
        // r = 200, F = G * 1 * 100 / 200^2 = 4000 * 100 / 40000 = 10
        expect(force2.length()).toBeCloseTo(10);
    });
});
