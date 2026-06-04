import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('ui_base.css', () => {
    it('keeps hidden elements hidden even when screen-specific display rules exist', () => {
        const css = readFileSync('css/ui_base.css', 'utf-8');

        expect(css).toContain('.hidden,');
        expect(css).toContain('[hidden]');
        expect(css).toContain('display: none !important;');
    });
});
