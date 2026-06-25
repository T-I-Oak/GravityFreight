import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/deploy.yml', 'utf-8');

describe('GitHub Pages deploy workflow', () => {
    it('keeps GravityFreight at the workspace root for the deploy action', () => {
        expect(workflow).not.toContain('path: GravityFreight');
        expect(workflow).not.toContain('working-directory: GravityFreight');
        expect(workflow).toContain('folder: dist');
    });

    it('checks out and links the common GameWorksOAK library for relative imports', () => {
        expect(workflow).toContain('repository: T-I-Oak/GameWorksOAK');
        expect(workflow).toContain('path: common/GameWorksOAK');
        expect(workflow).toContain('ln -sfn "$GITHUB_WORKSPACE/common/GameWorksOAK" "$GITHUB_WORKSPACE/../GameWorksOAK"');
    });
});
