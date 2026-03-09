import { describe, it, expect } from 'vitest';

// Test the markdown formatter used in AiDataChat
function formatMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>")
        .replace(/•/g, "&#8226;");
}

describe('formatMarkdown', () => {
    it('converts bold markdown to strong tags', () => {
        expect(formatMarkdown('**hello**')).toBe('<strong>hello</strong>');
    });

    it('handles multiple bold segments', () => {
        expect(formatMarkdown('**a** en **b**')).toBe('<strong>a</strong> en <strong>b</strong>');
    });

    it('converts newlines to br tags', () => {
        expect(formatMarkdown('line1\nline2')).toBe('line1<br>line2');
    });

    it('converts bullet points', () => {
        expect(formatMarkdown('• item')).toBe('&#8226; item');
    });

    it('handles combined formatting', () => {
        const input = '**Title**\n• **Item:** value';
        const expected = '<strong>Title</strong><br>&#8226; <strong>Item:</strong> value';
        expect(formatMarkdown(input)).toBe(expected);
    });

    it('returns plain text unchanged', () => {
        expect(formatMarkdown('hello world')).toBe('hello world');
    });
});
