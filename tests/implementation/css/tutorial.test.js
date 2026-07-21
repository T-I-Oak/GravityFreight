import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('tutorial.css', () => {
    it('uses container-sized fixed overlays instead of viewport unit sizing for mobile viewport stability', () => {
        const css = readFileSync('css/tutorial.css', 'utf-8');

        expect(css).toContain('#tutorial-mask-canvas');
        expect(css).toContain('inset: 0;');
        expect(css).toContain('width: 100%;');
        expect(css).toContain('height: 100%;');
        expect(css).not.toContain('width: 100vw;');
        expect(css).not.toContain('height: 100vh;');
    });

    it('keeps hidden tutorial tooltip measurable without display none', () => {
        const css = readFileSync('css/tutorial.css', 'utf-8');

        expect(css).toContain('#tutorial-tooltip.hidden');
        expect(css).toContain('visibility: hidden;');
        expect(css).toContain('opacity: 0;');
        expect(css).not.toContain('#tutorial-tooltip.hidden {\n    display: none;');
    });
});
