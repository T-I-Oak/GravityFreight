import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('settings.css', () => {
    it('keeps the language selector readable on native dropdown options', () => {
        const css = readFileSync('css/settings.css', 'utf-8');

        expect(css).toContain('.settings-select option');
        expect(css).toContain('color: #ffffff;');
        expect(css).toContain('background: #03090e;');
    });
});
