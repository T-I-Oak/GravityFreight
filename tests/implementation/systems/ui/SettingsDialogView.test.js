import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsDialogView from '../../../../src/systems/ui/SettingsDialogView.js';

describe('SettingsDialogView', () => {
    let operationBinder;

    beforeEach(() => {
        document.body.innerHTML = `
            <button id="title-settings-btn"></button>
            <button id="build-settings-btn"></button>
            <div id="settings-overlay" class="state-hidden" hidden>
                <button id="settings-done-btn"></button>
                <span id="volume-value-display"></span>
                <input id="se-volume-slider" type="range" min="0" max="100">
                <button id="camera-reset-btn"></button>
                <button id="tutorial-reset-btn"></button>
                <select id="language-select"></select>
            </div>
        `;
        operationBinder = vi.fn((element, handler) => {
            element.addEventListener('click', handler);
        });
    });

    it('opens and closes the settings overlay through bound operations', () => {
        const onOpen = vi.fn();
        const onClose = vi.fn();
        const view = new SettingsDialogView({ document, operationBinder });
        const overlay = document.querySelector('#settings-overlay');

        view.configure({ onOpen, onClose });
        view.initialize();
        document.querySelector('#title-settings-btn').click();

        expect(operationBinder).toHaveBeenCalledWith(document.querySelector('#title-settings-btn'), expect.any(Function));
        expect(operationBinder).toHaveBeenCalledWith(document.querySelector('#settings-done-btn'), expect.any(Function));
        expect(overlay.hidden).toBe(false);
        expect(overlay.classList.contains('state-hidden')).toBe(false);
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();

        document.querySelector('#settings-done-btn').click();

        expect(overlay.hidden).toBe(true);
        expect(overlay.classList.contains('state-hidden')).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('opens the same settings overlay from the build panel trigger', () => {
        const view = new SettingsDialogView({ document, operationBinder });
        const overlay = document.querySelector('#settings-overlay');

        view.initialize();
        document.querySelector('#build-settings-btn').click();

        expect(overlay.hidden).toBe(false);
        expect(overlay.classList.contains('state-hidden')).toBe(false);
    });

    it('requires an operation binder so UI feedback stays centralized', () => {
        expect(() => new SettingsDialogView({ document })).toThrow(
            '[SettingsDialogView] operationBinder is required.'
        );
    });

    it('syncs SE volume and delegates volume changes without direct persistence', () => {
        const onSEVolumeChange = vi.fn();
        const view = new SettingsDialogView({ document, operationBinder });

        view.initialize();
        view.configure({
            seVolume: 0.72,
            onSEVolumeChange
        });

        const slider = document.querySelector('#se-volume-slider');
        expect(slider.value).toBe('72');
        expect(document.querySelector('#volume-value-display').textContent).toBe('72%');

        slider.value = '35';
        slider.dispatchEvent(new Event('input'));

        expect(onSEVolumeChange).toHaveBeenCalledWith(0.35);
        expect(document.querySelector('#volume-value-display').textContent).toBe('35%');
    });

    it('delegates camera reset through the shared operation binder', () => {
        const onCameraReset = vi.fn();
        const view = new SettingsDialogView({ document, operationBinder });

        view.initialize();
        view.configure({ onCameraReset });
        document.querySelector('#camera-reset-btn').click();

        expect(onCameraReset).toHaveBeenCalledTimes(1);
        expect(operationBinder).toHaveBeenCalledWith(document.querySelector('#camera-reset-btn'), expect.any(Function));
    });

    it('delegates tutorial reset through the shared operation binder', () => {
        const onTutorialReset = vi.fn();
        const view = new SettingsDialogView({ document, operationBinder });

        view.initialize();
        view.configure({ onTutorialReset });
        document.querySelector('#tutorial-reset-btn').click();

        expect(onTutorialReset).toHaveBeenCalledTimes(1);
        expect(operationBinder).toHaveBeenCalledWith(document.querySelector('#tutorial-reset-btn'), expect.any(Function));
    });

    it('sets up language selector through the common i18n adapter', () => {
        const setupLanguageSelector = vi.fn();
        const onLanguageChange = vi.fn();
        const view = new SettingsDialogView({ document, operationBinder });

        view.initialize();
        view.configure({
            setupLanguageSelector,
            onLanguageChange
        });

        expect(setupLanguageSelector).toHaveBeenCalledWith(
            document.querySelector('#language-select'),
            ['ja', 'en'],
            onLanguageChange
        );
    });
});
