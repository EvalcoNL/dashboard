import { describe, it, expect } from 'vitest';

/**
 * Tests for rule template validation and structure.
 * Verifies that templates have all required fields and valid data.
 */
import { RULE_TEMPLATES } from '@/lib/rule-templates';

describe('Rule Templates', () => {
    it('should have at least one template', () => {
        expect(RULE_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have unique template IDs', () => {
        const ids = RULE_TEMPLATES.map(t => t.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have required fields on every template', () => {
        RULE_TEMPLATES.forEach(template => {
            expect(template.id).toBeTruthy();
            expect(template.name).toBeTruthy();
            expect(template.description).toBeTruthy();
            expect(template.icon).toBeTruthy();
            expect(template.category).toBeTruthy();
            expect(template.conditions).toBeDefined();
            expect(template.actions).toBeDefined();
            expect(template.schedule).toBeTruthy();
            expect(typeof template.cooldownMinutes).toBe('number');
        });
    });

    it('should have valid categories on all templates', () => {
        const validCategories = ['kosten', 'conversie', 'uptime', 'tracking', 'data', 'custom'];
        RULE_TEMPLATES.forEach(template => {
            expect(validCategories).toContain(template.category);
        });
    });

    it('should have positive cooldown values', () => {
        RULE_TEMPLATES.forEach(template => {
            expect(template.cooldownMinutes).toBeGreaterThan(0);
        });
    });

    it('should have at least one condition per template', () => {
        RULE_TEMPLATES.forEach(template => {
            expect(template.conditions.length).toBeGreaterThan(0);
        });
    });

    it('should have at least one action per template', () => {
        RULE_TEMPLATES.forEach(template => {
            expect(template.actions.length).toBeGreaterThan(0);
        });
    });

    it('should have valid schedule values', () => {
        const cronRegex = /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/;
        const namedSchedules = ['DAILY', 'HOURLY', 'WEEKLY', 'MONTHLY', 'EVERY_5_MINUTES', 'EVERY_15_MINUTES', 'EVERY_30_MINUTES'];
        RULE_TEMPLATES.forEach(template => {
            const isValidCron = cronRegex.test(template.schedule);
            const isNamedSchedule = namedSchedules.includes(template.schedule);
            expect(isValidCron || isNamedSchedule).toBe(true);
        });
    });
});
