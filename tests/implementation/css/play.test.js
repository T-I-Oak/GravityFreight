import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('play.css', () => {
    it('frames delivery cargo guidance messages inside the star info panel', () => {
        const css = readFileSync('css/play_overlay.css', 'utf-8');

        expect(css).toContain('.StarInfoPanel .star-info-message');
        expect(css).toContain('background: rgba(8, 12, 18, 0.86);');
        expect(css).toContain('border: 1px solid rgba(255, 255, 255, 0.12);');
        expect(css).toContain('border-radius: var(--radius-standard);');
    });

    it('keeps overlay panels within the dynamic viewport on mobile Safari', () => {
        const playOverlayCss = readFileSync('css/play_overlay.css', 'utf-8');
        const replayCss = readFileSync('css/replay.css', 'utf-8');

        expect(playOverlayCss).toContain('max-height: min(420px, calc(100dvh - 32px));');
        expect(replayCss).toContain('max-height: calc(100dvh - var(--space-double) * 2);');
    });

    it('keeps map touch gestures inside the game canvas', () => {
        const css = readFileSync('css/play.css', 'utf-8');

        expect(css).toContain('#play-screen .play-viewport');
        expect(css).toContain('touch-action: none;');
    });

    it('keeps build panel settings and minimize controls visually paired', () => {
        const css = readFileSync('css/play.css', 'utf-8');

        expect(css).toContain('#inventory-panel .panel-header');
        expect(css).toContain('gap: 14px;');
        expect(css).toContain('#inventory-panel .panel-header-actions');
        expect(css).toContain('gap: 2px;');
        expect(css).toContain('flex: 0 0 auto;');
        expect(css).toContain('#inventory-panel .settings-inline-btn');
        expect(css).toContain('width: 24px;');
        expect(css).toContain('height: 24px;');
        expect(css).toContain('padding: 0;');
        expect(css).toContain('border-radius: var(--radius-standard);');
        expect(css).toContain('background: rgba(255, 255, 255, 0.05);');
        expect(css).toContain('box-sizing: border-box;');
    });

    it('keeps replay controls below the play HUD instead of overlapping it', () => {
        const css = readFileSync('css/replay.css', 'utf-8');

        expect(css).toContain('.ReplayOverlay');
        expect(css).toContain('top: var(--space-double);');
        expect(css).toContain('right: var(--space-double);');
        expect(css).toContain('width: 340px;');
    });

    it('aligns the replay loadout panel structure with the build panel rhythm', () => {
        const css = readFileSync('css/replay.css', 'utf-8');

        expect(css).toContain('.ReplayLoadoutPanel .panel-header');
        expect(css).toContain('padding: var(--space-unit) var(--space-double);');
        expect(css).toContain('.ReplayLoadoutPanel .panel-body');
        expect(css).toContain('padding: var(--space-double);');
        expect(css).toContain('.ReplayLoadoutPanel .replay-actions');
        expect(css).toContain('border-top: 1px solid var(--panel-border-color);');
        expect(css).toContain('.ReplayLoadoutPanel .replay-exit');
        expect(css).toContain('--current-color: var(--color-theme-sub);');
    });

    it('scrolls the game end overlay instead of the receipt paper on short viewports', () => {
        const css = readFileSync('css/ui_style_printing.css', 'utf-8');

        expect(css).toContain('#game-result-scene-container.theme-printing');
        expect(css).toContain('pointer-events: auto;');
        expect(css).toContain('justify-content: flex-start;');
        expect(css).toContain('overflow-y: auto;');
        expect(css).toContain('.theme-printing .Panel.receipt');
        expect(css).toContain('display: block;');
        expect(css).toContain('flex: 0 0 auto;');
        expect(css).toContain('max-height: none;');
        expect(css).toContain('.theme-printing .Panel.receipt .panel-footer');
        expect(css).toContain('flex: none;');
        expect(css).toContain('overflow: visible;');
        expect(css).toContain('.theme-printing .panel-footer');
        expect(css).not.toContain('max-height: 90vh;');
        expect(css).toContain('scrollbar-width: thin;');
        expect(css).toContain('#game-result-scene-container.theme-printing::-webkit-scrollbar-thumb');
        expect(css).toContain('background: rgba(255, 255, 255, 0.14);');
    });

    it('colors every facility mail icon in the HUD', () => {
        const css = readFileSync('css/ui_style_neon.css', 'utf-8');

        expect(css).toContain('#play-hud .hud-messages .Icon.trading-post');
        expect(css).toContain('color: var(--color-facility-trading-post);');
        expect(css).toContain('#play-hud .hud-messages .Icon.repair-dock');
        expect(css).toContain('color: var(--color-facility-repair-dock);');
        expect(css).toContain('#play-hud .hud-messages .Icon.black-market');
        expect(css).toContain('color: var(--color-facility-black-market);');
    });
});
