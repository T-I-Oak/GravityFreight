import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

function readStoryModalCss() {
    return readFileSync('css/story_modal.css', 'utf-8');
}

describe('story_modal.css', () => {
    it('keeps story modals wide enough for narrative text', () => {
        const css = readStoryModalCss();

        expect(css).toContain('.Panel.story-card');
        expect(css).toContain('max-width: 520px;');
    });
});
