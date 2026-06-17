import { readFileSync } from 'node:fs';
import { expect } from 'vitest';

export function extractClassTokens(html) {
    return new Set(
        [...html.matchAll(/class="([^"]+)"/g)]
            .flatMap(match => match[1].split(/\s+/))
            .filter(Boolean)
    );
}

export function extractIds(html) {
    return [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
}

export function expectRequiredClassesInMockupAndActual({ mockupPath, actualHtml, requiredClasses }) {
    const mockupHtml = readFileSync(mockupPath, 'utf8');
    const mockupClasses = extractClassTokens(mockupHtml);
    const actualClasses = extractClassTokens(actualHtml);

    const missingFromMockup = requiredClasses
        .filter(className => !mockupClasses.has(className))
        .sort();
    const missingFromActual = requiredClasses
        .filter(className => !actualClasses.has(className))
        .sort();

    expect(missingFromMockup).toEqual([]);
    expect(missingFromActual).toEqual([]);
}

export function expectNoDuplicateIds(html) {
    const ids = extractIds(html);
    const duplicateIds = ids
        .filter((id, index) => ids.indexOf(id) !== index)
        .filter((id, index, values) => values.indexOf(id) === index)
        .sort();

    expect(duplicateIds).toEqual([]);
}
