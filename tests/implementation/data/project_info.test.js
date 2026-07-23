import { describe, expect, it } from 'vitest';
import projectInfo from '../../../public/data/project_info.json';

function expectLanguageStore(value) {
    expect(value).toHaveProperty('lang-store');
    expect(value['lang-store']).toEqual({
        ja: expect.any(String),
        en: expect.any(String)
    });
}

describe('project_info.json', () => {
    it('uses lang-store for portal-visible text fields', () => {
        expectLanguageStore(projectInfo.title);
        expectLanguageStore(projectInfo.description);
        expectLanguageStore(projectInfo.badge.content);
        expectLanguageStore(projectInfo.button.content);

        expect(projectInfo.tags.length).toBeGreaterThan(0);
        projectInfo.tags.forEach(tag => expectLanguageStore(tag));
    });

    it('keeps non-localized portal metadata as plain values', () => {
        expect(projectInfo.logo).toEqual({
            path: 'assets/logo.svg',
            type: 'standard'
        });
        expect(projectInfo.button.url).toBe('https://t-i-oak.github.io/GravityFreight/');
        expect(projectInfo.button.type).toBe('published');
        expect(projectInfo.image).toBe('assets/thumbnail.png');
    });

    it('uses the current portal badge wording and featured period', () => {
        expect(projectInfo.badge.content['lang-store'].ja).toBe('7月23日 v1.0 公開！');
        expect(projectInfo.badge.content['lang-store'].en).toBe('July 23 v1.0 Released!');
        expect(projectInfo.badge.featuredUntil).toBe('2026-08-31');
    });
});
