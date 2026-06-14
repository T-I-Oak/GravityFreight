import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('ui_base.css', () => {
    it('keeps hidden state elements hidden without important overrides', () => {
        const css = readFileSync('css/ui_base.css', 'utf-8');

        expect(css).toContain('.state-hidden.state-hidden,');
        expect(css).toContain('[hidden][hidden]');
        expect(css).toContain('#title-screen.state-hidden');
        expect(css).toContain('#play-scene-container.state-hidden');
        expect(css).toContain('#play-hud.state-hidden');
        expect(css).toContain('#inventory-panel.state-hidden');
        expect(css).toContain('display: none;');
        expect(css).not.toContain('display: none !important;');
    });
});
