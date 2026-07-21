import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('icon font usage', () => {
    it('loads a deterministic icon font for settings controls instead of emoji glyphs', () => {
        const html = readFileSync('index.html', 'utf-8');
        const css = readFileSync('css/ui_primitives.css', 'utf-8');

        expect(html).toContain('Material+Symbols+Rounded');
        expect(html).toContain('<span class="icon-symbol" aria-hidden="true">settings</span>');
        expect(css).toContain('.icon-symbol');
        expect(css).toContain('font-family: "Material Symbols Rounded";');
        expect(html).not.toContain('⚙');
    });
});
