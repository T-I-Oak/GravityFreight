
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageUtils } from '../../../GravityFreight/src/utils/StorageUtils.js';

describe('StorageUtils', () => {
    beforeEach(() => {
        // localStorage のモック
        const localStorageMock = (() => {
            let store = {};
            return {
                getItem: vi.fn(key => store[key] || null),
                setItem: vi.fn((key, value) => { store[key] = String(value); }),
                removeItem: vi.fn(key => { delete store[key]; }),
                clear: vi.fn(() => { store = {}; })
            };
        })();
        vi.stubGlobal('localStorage', localStorageMock);
    });

    it('should set and get JSON values', () => {
        const data = { score: 100, items: ['a', 'b'] };
        StorageUtils.set('test_key', data);
        expect(localStorage.setItem).toHaveBeenCalledWith('test_key', JSON.stringify(data));
        
        const retrieved = StorageUtils.get('test_key');
        expect(retrieved).toEqual(data);
    });

    it('should return defaultValue if key does not exist', () => {
        const retrieved = StorageUtils.get('non_existent', { def: 1 });
        expect(retrieved).toEqual({ def: 1 });
    });

    it('should return defaultValue and warn on parse error', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        localStorage.setItem('invalid_json', 'not-a-json');
        
        const retrieved = StorageUtils.get('invalid_json', 'fallback');
        expect(retrieved).toBe('fallback');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should set and get raw strings', () => {
        StorageUtils.setRaw('raw_key', 'hello world');
        expect(localStorage.setItem).toHaveBeenCalledWith('raw_key', 'hello world');
        
        const retrieved = StorageUtils.getRaw('raw_key');
        expect(retrieved).toBe('hello world');
    });

    it('should remove items', () => {
        StorageUtils.set('delete_me', 123);
        StorageUtils.remove('delete_me');
        expect(localStorage.removeItem).toHaveBeenCalledWith('delete_me');
        expect(StorageUtils.get('delete_me')).toBeNull();
    });
});
