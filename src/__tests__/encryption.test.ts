import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption';

/**
 * Tests for the AES-256-GCM encryption/decryption module.
 * 
 * These tests require ENCRYPTION_KEY to be set in the environment.
 * We set a test key for this purpose.
 */

describe('encryption', () => {
    beforeEach(() => {
        process.env.ENCRYPTION_KEY = 'test-encryption-key-for-vitest-32chars!';
    });

    describe('encrypt/decrypt roundtrip', () => {
        it('encrypts and decrypts a simple string', () => {
            const plaintext = 'hello world';
            const encrypted = encrypt(plaintext);
            expect(encrypted).not.toBe(plaintext);
            expect(encrypted).toMatch(/^enc:/);
            expect(decrypt(encrypted)).toBe(plaintext);
        });

        it('handles JSON strings (OAuth tokens)', () => {
            const token = JSON.stringify({
                accessToken: 'ya29.a0AfH6SMBx...',
                refreshToken: '1//0eXXXXXX',
                expiresAt: 1735689600,
            });
            const encrypted = encrypt(token);
            const decrypted = decrypt(encrypted);
            expect(JSON.parse(decrypted)).toEqual(JSON.parse(token));
        });

        it('handles empty string', () => {
            const encrypted = encrypt('');
            expect(decrypt(encrypted)).toBe('');
        });

        it('handles unicode characters', () => {
            const text = 'Héllo Wörld 你好 🚀';
            const encrypted = encrypt(text);
            expect(decrypt(encrypted)).toBe(text);
        });

        it('handles very long strings', () => {
            const text = 'x'.repeat(10000);
            const encrypted = encrypt(text);
            expect(decrypt(encrypted)).toBe(text);
        });

        it('produces unique ciphertexts for same plaintext', () => {
            const plaintext = 'same-input';
            const enc1 = encrypt(plaintext);
            const enc2 = encrypt(plaintext);
            expect(enc1).not.toBe(enc2); // Different IVs → different output
            expect(decrypt(enc1)).toBe(plaintext);
            expect(decrypt(enc2)).toBe(plaintext);
        });
    });

    describe('isEncrypted', () => {
        it('returns true for encrypted strings', () => {
            const encrypted = encrypt('test');
            expect(isEncrypted(encrypted)).toBe(true);
        });

        it('returns false for plain strings', () => {
            expect(isEncrypted('not-encrypted')).toBe(false);
            expect(isEncrypted('')).toBe(false);
            expect(isEncrypted('enc')).toBe(false);
        });
    });

    describe('backward compatibility', () => {
        it('decrypt returns unencrypted strings as-is', () => {
            const plaintext = 'legacy-unencrypted-token';
            expect(decrypt(plaintext)).toBe(plaintext);
        });
    });

    describe('error handling', () => {
        it('throws on invalid encrypted format', () => {
            expect(() => decrypt('enc:invalid')).toThrow();
        });

        it('throws when ENCRYPTION_KEY is missing for decryption', () => {
            const encrypted = encrypt('test');
            delete process.env.ENCRYPTION_KEY;
            expect(() => decrypt(encrypted)).toThrow('Encryption key not configured');
        });
    });
});
