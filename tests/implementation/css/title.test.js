import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('title.css', () => {
    it('animates the title UI wrapper as a single idle title group', () => {
        const css = readFileSync('css/title.css', 'utf-8');

        expect(css).toContain('.title-content-wrapper');
        expect(css).toContain('animation: title-idle-float 6s ease-in-out infinite;');
        expect(css).toContain('@keyframes title-idle-float');
        expect(css).toContain('50% { transform: translateY(calc(-12px * var(--ui-scale))); }');
    });

    it('sizes the title menu from the shared ui scale without transform scaling', () => {
        const css = readFileSync('css/title.css', 'utf-8');

        expect(css).toContain('--title-ui-scale: var(--ui-scale);');
        expect(css).toContain('gap: calc(32px * var(--ui-scale));');
        expect(css).toContain('width: min(calc(980px * var(--ui-scale)), 82vw);');
        expect(css).toContain('width: calc(640px * var(--ui-scale));');
        expect(css).toContain('#title-settings-btn');
        expect(css).toContain('width: calc(32px * var(--title-ui-scale));');
        expect(css).toContain('font-size: calc(32px * var(--title-ui-scale));');
        expect(css).toContain('#title-screen .screen-footer');
        expect(css).toContain('font-size: calc(13px * var(--title-ui-scale));');
        expect(css).toContain('white-space: nowrap;');
        expect(css).not.toContain('transform: scale(var(--title-ui-scale));');
    });

    it('uses dynamic viewport height so mobile Safari browser chrome does not hide the title controls', () => {
        const css = readFileSync('css/title.css', 'utf-8');

        expect(css).toContain('height: 100vh;');
        expect(css).toContain('height: 100dvh;');
        expect(css).toContain('min-height: 100vh;');
        expect(css).toContain('min-height: 100dvh;');
    });

    it('keeps the title settings button above title canvases', () => {
        const css = readFileSync('css/title.css', 'utf-8');

        expect(css).toContain('#title-settings-btn');
        expect(css).toContain('z-index: var(--z-system);');
        expect(css).toContain('color: rgba(255, 255, 255, 0.55);');
    });

    it('keeps the title footer readable while preserving the screen footer layout', () => {
        const css = readFileSync('css/title.css', 'utf-8');

        expect(css).toContain('#title-screen .screen-footer');
        expect(css).toContain('bottom: calc(30px * var(--title-ui-scale));');
        expect(css).toContain('left: calc(40px * var(--title-ui-scale));');
        expect(css).toContain('gap: calc(var(--space-double) * var(--title-ui-scale));');
        expect(css).toContain('color: rgba(255, 255, 255, 0.55);');
        expect(css).toContain('font-size: calc(13px * var(--title-ui-scale));');
        expect(css).toContain('letter-spacing: calc(1.5px * var(--title-ui-scale));');
        expect(css).toContain("font-family: 'Inter', sans-serif;");
        expect(css).toContain('font-weight: 700;');
        expect(css).toContain('opacity: 1;');
        expect(css).toContain('white-space: nowrap;');
        expect(css).toContain('#title-screen .screen-footer #version,');
        expect(css).toContain('#title-screen .screen-footer .copyright,');
        expect(css).toContain('#title-screen .screen-footer .copyright *,');
        expect(css).toContain('#title-screen .screen-footer a');
        expect(css).toContain('font: inherit;');
        expect(css).toContain('font-weight: inherit;');
    });
});
