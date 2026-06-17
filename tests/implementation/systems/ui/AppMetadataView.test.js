import { describe, it, expect } from 'vitest';
import AppMetadataView from '../../../../src/systems/ui/AppMetadataView.js';

describe('AppMetadataView', () => {
    it('renders version and portal copyright metadata', () => {
        document.body.innerHTML = `
            <div id="version"></div>
            <div class="copyright"></div>
        `;
        const view = new AppMetadataView({ document });

        view.setMetadata({
            version: '0.89.0',
            copyright: {
                holder: 'T.I.OAK',
                year: '2026',
                portal: 'GameWorks OAK',
                portalUrl: 'https://t-i-oak.github.io/GameWorksOAK/'
            }
        });

        const link = document.querySelector('.copyright a');
        expect(document.querySelector('#version').textContent).toBe('Ver 0.89.0');
        expect(document.querySelector('.copyright').textContent).toContain('© T.I.OAK 2026');
        expect(link.textContent).toBe('GameWorks OAK');
        expect(link.href).toBe('https://t-i-oak.github.io/GameWorksOAK/');
        expect(link.target).toBe('_blank');
        expect(link.rel).toBe('noopener noreferrer');
    });

    it('marks the portal text as a visible link', () => {
        document.body.innerHTML = `
            <div id="version"></div>
            <div class="copyright"></div>
        `;
        const view = new AppMetadataView({ document });

        view.setMetadata({
            version: '0.89.0',
            copyright: {
                holder: 'T.I.OAK',
                year: '2026',
                portal: 'GameWorks OAK',
                portalUrl: 'https://t-i-oak.github.io/GameWorksOAK/'
            }
        });

        expect(document.querySelector('.copyright a')).not.toBeNull();
    });
});
