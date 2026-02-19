// ---------------------------------------------------------------------------
// Report encryption utilities
//
// Uses the Web Crypto API (AES-GCM) to encrypt and decrypt vulnerability
// reports before they are persisted to localStorage. A key is derived from
// the researcher address using PBKDF2 so that only the same browser session
// that stored the report can read it back.
//
// This is a defence-in-depth layer: even if another script on the same
// origin reads localStorage, the raw ciphertext is useless without the
// derived key. Full end-to-end security requires a backend service or
// on-chain encryption — this module raises the bar significantly above
// plaintext storage.
// ---------------------------------------------------------------------------

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100_000;

/**
 * Derive an AES-GCM key from a passphrase (researcher address) and salt.
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/**
 * Encrypt a plaintext string. Returns a base-64 encoded blob that
 * concatenates salt + IV + ciphertext.
 */
export async function encryptPayload(plaintext: string, passphrase: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(passphrase, salt);

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(plaintext),
    );

    // Pack salt + iv + ciphertext into a single buffer
    const packed = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
    packed.set(salt, 0);
    packed.set(iv, SALT_LENGTH);
    packed.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

    return uint8ArrayToBase64(packed);
}

/**
 * Decrypt a base-64 blob previously produced by encryptPayload.
 */
export async function decryptPayload(encoded: string, passphrase: string): Promise<string> {
    const packed = base64ToUint8Array(encoded);
    const salt = packed.slice(0, SALT_LENGTH);
    const iv = packed.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = packed.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext,
    );

    return new TextDecoder().decode(decrypted);
}

// -- Base-64 helpers (browser-safe, no Node Buffer dependency) ----------------

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
