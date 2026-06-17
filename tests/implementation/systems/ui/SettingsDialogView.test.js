import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsDialogView from '../../../../src/systems/ui/SettingsDialogView.js';

describe('SettingsDialogView', () => {
    let operationBinder;

    beforeEach(() => {
        document.body.innerHTML = `
            <button id="title-settings-btn"></button>
            <div id="settings-overlay" class="state-hidden" hidden>
                <button id="close-settings-btn"></button>
                <button id="settings-done-btn"></button>
            </div>
        `;
        operationBinder = vi.fn((element, handler) => {
            element.addEventListener('click', handler);
        });
    });

    it('opens and closes the settings overlay through bound operations', () => {
        const view = new SettingsDialogView({ document, operationBinder });
        const overlay = document.querySelector('#settings-overlay');

        view.initialize();
        document.querySelector('#title-settings-btn').click();

        expect(operationBinder).toHaveBeenCalledTimes(3);
        expect(overlay.hidden).toBe(false);
        expect(overlay.classList.contains('state-hidden')).toBe(false);

        document.querySelector('#settings-done-btn').click();

        expect(overlay.hidden).toBe(true);
        expect(overlay.classList.contains('state-hidden')).toBe(true);
    });

    it('requires an operation binder so UI feedback stays centralized', () => {
        expect(() => new SettingsDialogView({ document })).toThrow(
            '[SettingsDialogView] operationBinder is required.'
        );
    });
});
