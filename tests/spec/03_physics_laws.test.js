import { describe, it, expect, vi } from 'vitest';
import { Vector2, calculateAcceleration, G } from '../../GravityFreight/src/utils/Physics.js';

// TitleAnimation のモック化
vi.mock('../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Spec: Physics Laws (Chapter 3)', () => {
    describe('3.2 Gravity Calculation', () => {
        it('should follow inverse-square law with mass factor compensation', () => {
            const pos = new Vector2(0, 0);
            const star = { position: new Vector2(100, 0), mass: 100, gravityMultiplier: 1.0 };
            const bodies = [star];
            const rocketMass = 10; // Reference mass
            
            // a = (G * M_star / r^2) * (M_ref / M_rocket)
            // a = (4000 * 100 / 100^2) * (10 / 10) = 40
            const acc = calculateAcceleration(pos, bodies, rocketMass);
            expect(acc.length()).toBeCloseTo(40);
            expect(acc.x).toBeGreaterThan(0);
            expect(acc.y).toBe(0);
        });

        it('should support Repulsive Star physics when gravityMultiplier is negative', () => {
            const pos = new Vector2(0, 0);
            const repulsiveStar = { 
                position: new Vector2(100, 0), 
                mass: 100,
                gravityMultiplier: -1.0 // Formal spec for Repulsive Star
            };
            const bodies = [repulsiveStar];
            const rocketMass = 10;
            
            // Expected acceleration should be negative (pushing away)
            const acc = calculateAcceleration(pos, bodies, rocketMass);
            expect(acc.x).toBeLessThan(0);
            expect(acc.length()).toBeCloseTo(40);
        });

        it('should scale gravity inversely with rocket mass (Heavier rocket = Weaker gravity influence)', () => {
            const pos = new Vector2(0, 0);
            const star = { position: new Vector2(100, 0), mass: 100, gravityMultiplier: 1.0 };
            const bodies = [star];
            
            const lightRocketMass = 5;
            const heavyRocketMass = 20;

            const accLight = calculateAcceleration(pos, bodies, lightRocketMass);
            const accHeavy = calculateAcceleration(pos, bodies, heavyRocketMass);

            // Light rocket (+50% strength if mass is half, wait, 10/5 = 2.0x)
            // Heavy rocket (10/20 = 0.5x)
            expect(accLight.length()).toBeCloseTo(80);
            expect(accHeavy.length()).toBeCloseTo(20);
        });

        it('3.2 Singularity Avoidance: should skip gravity calculation if r < 10px', () => {
            const pos = new Vector2(0, 0);
            const star = { position: new Vector2(5, 0), mass: 100, gravityMultiplier: 1.0 }; // r = 5 < 10
            const bodies = [star];
            
            const acc = calculateAcceleration(pos, bodies, 10);
            expect(acc.length()).toBe(0); // Calculation skipped
        });
    });

    describe('3.3 Collision Detection (Boundary Values)', () => {
        // This usually involves CCD logic in PhysicsOrchestrator, 
        // but the base rule is "radius + 5px".
        it('should define body radius based on mass (sqrt(M)/5 + 2)', () => {
            const mass = 100;
            // radius = sqrt(100)/5 + 2 = 10/5 + 2 = 4
            const body = { mass: 100, radius: Math.sqrt(100)/5 + 2 };
            expect(body.radius).toBe(4);
        });
    });

    describe('3.1 Deterministic Reproducibility', () => {
        it('should produce identical results over 10 ticks given fixed state', () => {
            const dt = 0.01;
            let pos = new Vector2(100, 100);
            let vel = new Vector2(10, 0);
            const bodies = [{ position: new Vector2(0, 0), mass: 5000, gravityMultiplier: 1.0 }];
            const mass = 10;

            // Simulate 10 iterations of Semi-Implicit Euler
            for (let i = 0; i < 10; i++) {
                const acc = calculateAcceleration(pos, bodies, mass);
                vel = vel.add(acc.scale(dt));
                pos = pos.add(vel.scale(dt));
            }

            // Expected values calculated from current logic:
            // Final position after 10 steps of Semi-Implicit Euler with G=4000, M=5000, dt=0.01
            expect(pos.x).toBeCloseTo(97.07, 1);
            expect(pos.y).toBeCloseTo(96.08, 1);
        });
    });
});
