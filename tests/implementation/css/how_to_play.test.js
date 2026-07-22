import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('how_to_play.css', () => {
    it('keeps text blocks legible over tutorial images', () => {
        const css = readFileSync('css/how_to_play.css', 'utf-8');

        expect(css).toContain('background: rgba(0, 0, 0, 0.42);');
        expect(css).toContain('text-shadow: 1px 1px 0 #000');
    });

    it('scales long how to play text by real layout values on narrow mobile screens', () => {
        const baseCss = readFileSync('css/how_to_play.css', 'utf-8');
        const responsiveCss = readFileSync('css/how_to_play_responsive.css', 'utf-8');

        expect(baseCss).toContain('--how-play-text-scale: var(--ui-scale);');
        expect(baseCss).toContain('font-size: calc(1.6rem * var(--how-play-text-scale));');
        expect(baseCss).toContain('font-size: calc(var(--text-size-main) * var(--how-play-text-scale));');
        expect(baseCss).toContain('font-size: calc(1.05rem * var(--how-play-text-scale));');
        expect(baseCss).toContain('padding: calc(20px * var(--how-play-text-scale)) calc(24px * var(--how-play-text-scale));');
        expect(responsiveCss).not.toContain('--how-play-text-scale: var(--mobile-ui-scale-standard);');
        expect(responsiveCss).not.toContain('--how-play-text-scale: var(--mobile-ui-scale-compact);');
        expect(responsiveCss).not.toContain('--how-play-flavor-scale');
        expect(responsiveCss).not.toContain('transform: scale');
    });

    it('scales how to play navigation buttons by real layout values', () => {
        const css = readFileSync('css/how_to_play_controls.css', 'utf-8');

        expect(css).toContain('gap: calc(15px * var(--how-play-text-scale));');
        expect(css).toContain('min-height: calc(60px * var(--how-play-text-scale));');
        expect(css).toContain('.how-to-play-nav::before {');
        expect(css).not.toContain('.how-to-play-dots {\r\n        display: none;');
        expect(css).not.toContain('.how-to-play-dots {\n        display: none;');
        expect(css).toContain('.how-to-play-nav .Button');
        expect(css).toContain('padding: calc(6px * var(--how-play-text-scale)) calc(16px * var(--how-play-text-scale));');
        expect(css).toContain('font-size: calc(var(--text-size-main) * var(--how-play-text-scale));');
        expect(css).toContain('.how-to-play-nav .Button.button-large .btn-main-label');
        expect(css).toContain('font-size: calc(16px * var(--how-play-text-scale));');
    });

    it('uses the shared ui scale for how to play demo section labels', () => {
        const css = readFileSync('css/how_to_play_diagrams.css', 'utf-8');

        expect(css).toContain('.how-to-play-build-panel .section-title,');
        expect(css).toContain('font-size: calc(12px * var(--how-play-text-scale));');
        expect(css).toContain('margin: calc(12px * var(--ui-scale)) 0 calc(6px * var(--ui-scale));');
        expect(css).toContain('padding: calc(var(--space-unit) * var(--ui-scale)) calc(var(--space-double) * var(--ui-scale)) calc(var(--space-double) * var(--ui-scale));');
        expect(css).toContain('height: calc(76px * var(--ui-scale));');
        expect(css).not.toContain('height: 76px;');
        expect(css).not.toContain('--item-card-scale: var(--how-play-text-scale);');
    });

    it('colors every status label used by how to play content with current design tokens', () => {
        const css = readFileSync('css/how_to_play_controls.css', 'utf-8');
        const content = readFileSync('src/assets/data/content_how_to_play.json', 'utf-8');
        const statusClasses = [...content.matchAll(/status-[a-z-]+/g)]
            .map(match => match[0])
            .filter((value, index, values) => values.indexOf(value) === index);

        statusClasses.forEach(className => {
            expect(css).toContain(`.${className}`);
            expect(css).not.toContain('var(--trading-post-color)');
            expect(css).not.toContain('var(--color-rocket)');
        });
        expect(css).toContain('var(--color-facility-trading-post)');
        expect(css).toContain('var(--color-category-rockets)');
    });
});
