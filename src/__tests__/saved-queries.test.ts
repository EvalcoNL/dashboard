import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for Data Explorer saved queries localStorage logic.
 * Verifies save, load, delete, and history management functions.
 */

const STORAGE_KEY = 'evalco-saved-queries-test';
const HISTORY_KEY = 'evalco-query-history-test';

interface SavedQuery {
    name: string;
    dimensions: string[];
    metrics: string[];
    filters: any[];
    chartType: string;
    currency: string;
    savedAt: string;
}

// Simulated localStorage functions from DataExplorerClient
function saveQuery(
    store: Map<string, string>,
    name: string,
    config: Omit<SavedQuery, 'name' | 'savedAt'>
): SavedQuery[] {
    const existing: SavedQuery[] = JSON.parse(store.get(STORAGE_KEY) || '[]');
    const newQuery: SavedQuery = {
        ...config,
        name,
        savedAt: new Date().toISOString(),
    };
    const updated = [newQuery, ...existing.filter(q => q.name !== name)];
    store.set(STORAGE_KEY, JSON.stringify(updated));
    return updated;
}

function loadQueries(store: Map<string, string>): SavedQuery[] {
    return JSON.parse(store.get(STORAGE_KEY) || '[]');
}

function deleteQuery(store: Map<string, string>, name: string): SavedQuery[] {
    const existing: SavedQuery[] = JSON.parse(store.get(STORAGE_KEY) || '[]');
    const updated = existing.filter(q => q.name !== name);
    store.set(STORAGE_KEY, JSON.stringify(updated));
    return updated;
}

function addToHistory(store: Map<string, string>, config: Omit<SavedQuery, 'name' | 'savedAt'>): SavedQuery[] {
    const existing: SavedQuery[] = JSON.parse(store.get(HISTORY_KEY) || '[]');
    const entry: SavedQuery = {
        ...config,
        name: `Query ${new Date().toLocaleTimeString()}`,
        savedAt: new Date().toISOString(),
    };
    const updated = [entry, ...existing].slice(0, 10);
    store.set(HISTORY_KEY, JSON.stringify(updated));
    return updated;
}

describe('Data Explorer Saved Queries', () => {
    let store: Map<string, string>;

    beforeEach(() => {
        store = new Map();
    });

    const sampleConfig = {
        dimensions: ['campaign_name'],
        metrics: ['cost', 'clicks'],
        filters: [],
        chartType: 'bar',
        currency: 'EUR',
    };

    it('should save a query', () => {
        const result = saveQuery(store, 'Test Query', sampleConfig);
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Test Query');
        expect(result[0].dimensions).toEqual(['campaign_name']);
    });

    it('should replace duplicate query names', () => {
        saveQuery(store, 'My Query', sampleConfig);
        saveQuery(store, 'My Query', { ...sampleConfig, metrics: ['impressions'] });
        const queries = loadQueries(store);
        expect(queries.length).toBe(1);
        expect(queries[0].metrics).toEqual(['impressions']);
    });

    it('should load saved queries', () => {
        saveQuery(store, 'Q1', sampleConfig);
        saveQuery(store, 'Q2', sampleConfig);
        const queries = loadQueries(store);
        expect(queries.length).toBe(2);
    });

    it('should delete a query by name', () => {
        saveQuery(store, 'Keep', sampleConfig);
        saveQuery(store, 'Delete Me', sampleConfig);
        const result = deleteQuery(store, 'Delete Me');
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Keep');
    });

    it('should limit history to 10 entries', () => {
        for (let i = 0; i < 15; i++) {
            addToHistory(store, sampleConfig);
        }
        const history: SavedQuery[] = JSON.parse(store.get(HISTORY_KEY) || '[]');
        expect(history.length).toBe(10);
    });

    it('should return empty array when no queries saved', () => {
        expect(loadQueries(store)).toEqual([]);
    });
});
