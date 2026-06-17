import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '../../../..');

function loadIndexDocument() {
    const html = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
    return new JSDOM(html).window.document;
}

function getThemeClasses(element) {
    return [...element.classList].filter(className => className.startsWith('theme-'));
}

describe('theme boundaries', () => {
    it('does not put a screen theme on body', () => {
        const document = loadIndexDocument();

        expect(getThemeClasses(document.body)).toEqual([]);
    });

    it('keeps themed overlays outside conflicting theme ancestors', () => {
        const document = loadIndexDocument();
        const themedRoots = [
            '#title-screen',
            '#replay-overlay',
            '#archive-screen-overlay',
            '#play-scene-container',
            '#flight-result-screen',
            '#facility-screen',
            '#story-overlay',
            '#settings-overlay'
        ];

        themedRoots.forEach(selector => {
            const root = document.querySelector(selector);
            expect(root, selector).not.toBeNull();
            expect(getThemeClasses(root).length, selector).toBe(1);
            expect(getThemeClasses(root.parentElement || document.body), `${selector} parent`).toEqual([]);
        });
    });
});
