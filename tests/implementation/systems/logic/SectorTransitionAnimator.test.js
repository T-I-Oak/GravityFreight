import { describe, it, expect, vi } from 'vitest';
import SectorTransitionAnimator from '../../../../src/systems/logic/SectorTransitionAnimator.js';

describe('SectorTransitionAnimator', () => {
    it('warps out, creates the sector, then warps in', async () => {
        const worldRenderer = {
            startWarpEffect: vi.fn(),
            stopWarpEffect: vi.fn()
        };
        const wait = vi.fn(() => Promise.resolve());
        const animator = new SectorTransitionAnimator({
            worldRenderer,
            wait,
            durations: {
                warpOut: 1400,
                hold: 700,
                warpIn: 1400
            }
        });
        const sector = { sectorNumber: 1 };
        const createSector = vi.fn(() => sector);

        const result = await animator.play(createSector);

        expect(result).toBe(sector);
        expect(worldRenderer.startWarpEffect).toHaveBeenCalledWith(1400);
        expect(wait).toHaveBeenNthCalledWith(1, 1400);
        expect(createSector).toHaveBeenCalledTimes(1);
        expect(wait).toHaveBeenNthCalledWith(2, 700);
        expect(worldRenderer.stopWarpEffect).toHaveBeenCalledWith(1400);
        expect(wait).toHaveBeenNthCalledWith(3, 1400);
        expect(worldRenderer.startWarpEffect.mock.invocationCallOrder[0])
            .toBeLessThan(createSector.mock.invocationCallOrder[0]);
        expect(createSector.mock.invocationCallOrder[0])
            .toBeLessThan(worldRenderer.stopWarpEffect.mock.invocationCallOrder[0]);
    });

    it('requires an explicit sector creation callback', async () => {
        const animator = new SectorTransitionAnimator();

        await expect(animator.play())
            .rejects
            .toThrow('[SectorTransitionAnimator] createSector callback is required.');
    });
});
