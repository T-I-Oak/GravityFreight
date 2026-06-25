import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '../../../..');

function loadDocument(path) {
    const html = readFileSync(resolve(projectRoot, path), 'utf8');
    return new JSDOM(html).window.document;
}

function normalizedClassList(element, { ignore = [] } = {}) {
    return Array.from(element.classList).filter(className => !ignore.includes(className)).sort();
}

function expectSameClasses(actualDocument, mockDocument, selector, options = {}) {
    const actual = actualDocument.querySelector(selector);
    const mock = mockDocument.querySelector(selector);

    expect(actual, `actual ${selector}`).not.toBeNull();
    expect(mock, `mock ${selector}`).not.toBeNull();
    expect(normalizedClassList(actual, options)).toEqual(normalizedClassList(mock, options));
}

describe('play screen markup', () => {
    it('uses the shared logo asset on the title screen and HUD', () => {
        const actualDocument = loadDocument('index.html');

        expect(actualDocument.querySelector('#title-screen .LogoImage.title-logo')?.getAttribute('src')).toBe('/assets/logo.svg');
        expect(actualDocument.querySelector('#play-hud .LogoImage.hud-logo')?.getAttribute('src')).toBe('/assets/logo.svg');
    });

    it('keeps production play-screen classes aligned with the mockup', () => {
        const actualDocument = loadDocument('index.html');
        const mockDocument = loadDocument('src/mockup/play_mockup.html');

        [
            '#play-hud',
            '#play-hud .hud-logo-header',
            '#play-hud .TitleBox',
            '#play-hud .LogoImage.hud-logo',
            '#play-hud .hud-messages',
            '#play-hud .hud-stats',
            '#inventory-panel',
            '#inventory-panel .panel-header',
            '#inventory-panel .TabGroup',
            '#inventory-panel .PanelToggle',
            '#inventory-panel .toggle-icon',
            '#panel-content',
            '#tab-flight',
            '#tab-flight .flight-scroll',
            '#tab-flight .flight-actions',
            '#tab-assembly',
            '#tab-assembly .assembly-scroll',
            '#tab-assembly .assembly-actions',
            '#section-rocket',
            '#section-launcher',
            '#section-booster',
            '#list-rocket',
            '#list-launcher',
            '#list-booster',
            '#list-chassis',
            '#list-logic',
            '#list-module',
            '#map-action-dock'
        ].forEach(selector => {
            expectSameClasses(actualDocument, mockDocument, selector);
        });

        expectSameClasses(actualDocument, mockDocument, '#play-scene-container', {
            ignore: ['state-hidden']
        });
        expectSameClasses(actualDocument, mockDocument, '#play-screen .play-viewport');
        expectSameClasses(actualDocument, mockDocument, '#play-screen .launch', {
            ignore: ['state-hidden']
        });

        expect(actualDocument.querySelector('#coin-display')?.classList.contains('num-coin')).toBe(true);
        expect(actualDocument.querySelector('#coin-display')?.classList.contains('coin')).toBe(false);

        actualDocument.querySelectorAll('#play-hud .hud-messages .Icon').forEach((icon, index) => {
            const mockIcon = mockDocument.querySelectorAll('#play-hud .hud-messages .Icon')[index];
            expect(normalizedClassList(icon, { ignore: ['state-disabled'] })).toEqual(['Icon', 'mail']);
            expect(mockIcon.classList.contains('Icon')).toBe(true);
            expect(mockIcon.classList.contains('mail')).toBe(true);
        });
    });
});
