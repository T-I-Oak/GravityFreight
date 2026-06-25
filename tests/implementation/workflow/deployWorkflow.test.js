import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/deploy.yml', 'utf-8');

describe('GitHub Pages deploy workflow', () => {
    it('checks out GravityFreight and the common GameWorksOAK library as sibling directories', () => {
        expect(workflow).toContain('path: GravityFreight');
        expect(workflow).toContain('repository: T-I-Oak/GameWorksOAK');
        expect(workflow).toContain('path: GameWorksOAK');
    });

    it('builds inside GravityFreight and deploys its dist folder', () => {
        expect(workflow).toContain('working-directory: GravityFreight');
        expect(workflow).toContain('folder: GravityFreight/dist');
    });
});
