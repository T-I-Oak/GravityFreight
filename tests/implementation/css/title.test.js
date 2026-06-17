import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('title.css', () => {
    it('animates the title UI wrapper as a single idle title group', () => {
        const css = readFileSync('css/title.css', 'utf-8');

        expect(css).toContain('.title-content-wrapper');
        expect(css).toContain('animation: title-idle-float 6s ease-in-out infinite;');
        expect(css).toContain('@keyframes title-idle-float');
        expect(css).toContain('50% { transform: translateY(-12px); }');
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
        expect(css).toContain('bottom: 30px;');
        expect(css).toContain('left: 40px;');
        expect(css).toContain('color: rgba(255, 255, 255, 0.55);');
        expect(css).toContain('font-size: 13px;');
        expect(css).toContain('letter-spacing: 1.5px;');
        expect(css).toContain("font-family: 'Inter', sans-serif;");
        expect(css).toContain('font-weight: 700;');
        expect(css).toContain('opacity: 1;');
        expect(css).toContain('#title-screen .screen-footer #version,');
        expect(css).toContain('#title-screen .screen-footer .copyright,');
        expect(css).toContain('#title-screen .screen-footer .copyright *,');
        expect(css).toContain('#title-screen .screen-footer a');
        expect(css).toContain('font: inherit;');
        expect(css).toContain('font-weight: inherit;');
    });
});
