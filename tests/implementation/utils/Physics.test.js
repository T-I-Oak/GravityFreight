import { describe, it, expect } from 'vitest';
import { Vector2, getDistanceSqToSegment } from '../../../GravityFreight/src/utils/Physics.js';

describe('Implementation: Physics Utilities', () => {
    describe('Vector2', () => {
        it('should perform basic vector operations', () => {
            const v1 = new Vector2(1, 2);
            const v2 = new Vector2(3, 4);
            
            expect(v1.add(v2)).toEqual(new Vector2(4, 6));
            expect(v2.sub(v1)).toEqual(new Vector2(2, 2));
            expect(v1.scale(2)).toEqual(new Vector2(2, 4));
            expect(v1.dot(v2)).toBe(11); // 1*3 + 2*4 = 3 + 8 = 11
            expect(v1.lengthSq()).toBe(5);
            expect(v1.length()).toBeCloseTo(Math.sqrt(5));
        });

        it('should normalize vectors correctly', () => {
            const v = new Vector2(3, 4);
            const n = v.normalize();
            expect(n.length()).toBeCloseTo(1);
            expect(n.x).toBeCloseTo(0.6);
            expect(n.y).toBeCloseTo(0.8);
        });

        it('should return zero vector when normalizing zero length vector', () => {
            const v = new Vector2(0, 0);
            const n = v.normalize();
            expect(n.x).toBe(0);
            expect(n.y).toBe(0);
        });
    });

    describe('CCD: getDistanceSqToSegment', () => {
        it('should calculate shortest distance squared from a point to a segment', () => {
            const p = new Vector2(5, 5);
            const a = new Vector2(0, 0);
            const b = new Vector2(10, 0);
            
            // Closest point on segment (0,0)-(10,0) is (5,0)
            // Distance squared = (5-5)^2 + (5-0)^2 = 25
            expect(getDistanceSqToSegment(p, a, b)).toBe(25);
        });

        it('should return distance to endpoint when projection is outside the segment', () => {
            const p = new Vector2(-2, 5);
            const a = new Vector2(0, 0);
            const b = new Vector2(10, 0);
            
            // Closest point is a(0,0)
            // Distance squared = (-2-0)^2 + (5-0)^2 = 4 + 25 = 29
            expect(getDistanceSqToSegment(p, a, b)).toBe(29);
        });
    });
});
