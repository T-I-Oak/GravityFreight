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

    it('scales tutorial tooltip text and layout with the shared ui scale', () => {
        const css = readFileSync('css/tutorial.css', 'utf-8');

        expect(css).toContain('width: min(calc(320px * var(--ui-scale)), calc(100vw - (32px * var(--ui-scale))));');
        expect(css).toContain('padding: calc(16px * var(--ui-scale));');
        expect(css).toContain('border-radius: calc(8px * var(--ui-scale));');
        expect(css).toContain('font-size: calc(14px * var(--ui-scale));');
        expect(css).toContain('font-size: calc(12px * var(--ui-scale));');
        expect(css).toContain('width: calc(16px * var(--ui-scale));');
    });

    it('uses the standard button size for the tutorial confirmation action', () => {
        const html = readFileSync('index.html', 'utf-8');
        const match = html.match(/<button id="tutorial-next-btn" class="([^"]+)">OK<\/button>/);

        expect(match).not.toBeNull();
        expect(match[1].split(/\s+/)).toEqual(['Button', 'state-primary']);
    });
});
