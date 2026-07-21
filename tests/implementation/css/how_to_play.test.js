import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('how_to_play.css', () => {
    it('keeps text blocks legible over tutorial images', () => {
        const css = readFileSync('css/how_to_play.css', 'utf-8');

        expect(css).toContain('background: rgba(0, 0, 0, 0.42);');
        expect(css).toContain('text-shadow: 1px 1px 0 #000');
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
