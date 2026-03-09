import { describe, it, expect } from 'vitest';
import { OPERATOR_LABELS } from '@/lib/rule-engine-types';
import type { ConditionSection, RuleAction, Operator } from '@/lib/rule-engine-types';

describe('Rule Engine Types', () => {
    it('exports all 12 operators in OPERATOR_LABELS', () => {
        const operators = Object.keys(OPERATOR_LABELS);
        expect(operators).toHaveLength(12);
        expect(operators).toContain('equals');
        expect(operators).toContain('greater_than');
        expect(operators).toContain('change_pct_up');
        expect(operators).toContain('is_zero');
    });

    it('each operator has a label and description', () => {
        for (const [key, value] of Object.entries(OPERATOR_LABELS)) {
            expect(value).toHaveProperty('label');
            expect(value).toHaveProperty('description');
            expect(typeof value.label).toBe('string');
            expect(typeof value.description).toBe('string');
            expect(value.label.length).toBeGreaterThan(0);
        }
    });

    it('validates ConditionSection shape', () => {
        const section: ConditionSection = {
            sectionOperator: 'AND',
            rules: [
                { field: 'cost', fieldSource: 'all', operator: 'greater_than', value: 100, valueType: 'manual' },
            ],
        };
        expect(section.sectionOperator).toBe('AND');
        expect(section.rules).toHaveLength(1);
        expect(section.rules[0].field).toBe('cost');
    });

    it('validates RuleAction shape', () => {
        const action: RuleAction = {
            type: 'incident',
            config: { severity: 'P1', message: 'Test alert' },
        };
        expect(action.type).toBe('incident');
        expect(action.config.severity).toBe('P1');
    });

    it('supports OR operator in sections', () => {
        const section: ConditionSection = {
            sectionOperator: 'OR',
            rules: [
                { field: 'clicks', fieldSource: 'all', operator: 'is_zero', value: 0, valueType: 'manual' },
                { field: 'impressions', fieldSource: 'all', operator: 'is_zero', value: 0, valueType: 'manual' },
            ],
        };
        expect(section.sectionOperator).toBe('OR');
        expect(section.rules).toHaveLength(2);
    });
});
