// ═══════════════════════════════════════════════════════════════════
// Encryption Helper — AES-256-GCM for encrypting sensitive data at rest
// ═══════════════════════════════════════════════════════════════════

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;

/**
 * Get the encryption key from the environment.
 * Falls back gracefully for development — logs a warning but doesn't crash.
 */
function getEncryptionKey(): Buffer | null {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        if (process.env.NODE_ENV === 'production') {
            console.error('[SECURITY] ENCRYPTION_KEY is not set! Tokens will be stored unencrypted.');
        }
        return null;
    }
    // Derive a 32-byte key from the env variable using scrypt
    // TODO: Use a per-installation salt (requires re-encrypting all existing tokens)
    return scryptSync(key, 'evalco-salt', 32);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string in the format: salt:iv:tag:ciphertext
 * 
 * If ENCRYPTION_KEY is not set, returns the plaintext as-is (for dev/migration).
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    if (!key) return plaintext;

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Format: iv:tag:ciphertext (all hex-encoded)
    return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with the encrypt() function.
 * If the input doesn't start with 'enc:', assumes plaintext (backward compatible).
 */
export function decrypt(encryptedText: string): string {
    if (!encryptedText.startsWith('enc:')) {
        // Not encrypted — return as-is (backward compatible with existing unencrypted tokens)
        return encryptedText;
    }

    const key = getEncryptionKey();
    if (!key) {
        console.error('[SECURITY] Cannot decrypt: ENCRYPTION_KEY is not set');
        throw new Error('Encryption key not configured');
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
        throw new Error('Invalid encrypted format');
    }

    const [, ivHex, tagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Check if a value is encrypted (starts with 'enc:').
 */
export function isEncrypted(value: string): boolean {
    return value.startsWith('enc:');
}
