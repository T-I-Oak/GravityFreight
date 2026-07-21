import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['tests/**/*.test.js'],
        exclude: ['node_modules/**', 'dist/**', 'GravityFreight_v1/**'],
        setupFiles: ['./tests/setup/vitest.setup.js']
    }
});
