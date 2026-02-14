/**
 * Encryption utilities for vulnerability reports
 * Uses Web Crypto API for AES-GCM encryption
 */

/**
 * Generate an encryption key from a password
 * @param password - Password or shared secret
 * @param salt - Salt for key derivation
 * @returns Crypto key for encryption/decryption
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt data using AES-GCM
 * @param data - Data to encrypt
 * @param password - Encryption password
 * @returns Encrypted data with salt and IV prepended
 */
export async function encryptData(data: string, password: string): Promise<string> {
    try {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        
        // Generate random salt and IV
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Derive encryption key
        const key = await deriveKey(password, salt);
        
        // Encrypt the data
        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            dataBuffer
        );
        
        // Combine salt + iv + encrypted data
        const combined = new Uint8Array(
            salt.length + iv.length + encryptedBuffer.byteLength
        );
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
        
        // Convert to base64 for storage
        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedData - Base64 encoded encrypted data
 * @param password - Decryption password
 * @returns Decrypted data as string
 */
export async function decryptData(encryptedData: string, password: string): Promise<string> {
    try {
        // Decode from base64
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        
        // Extract salt, IV, and encrypted data
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encrypted = combined.slice(28);
        
        // Derive decryption key
        const key = await deriveKey(password, salt);
        
        // Decrypt the data
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );
        
        // Convert back to string
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
}

/**
 * Generate a shared encryption key from two addresses
 * This creates a deterministic password from researcher and bounty owner addresses
 * @param address1 - First address (e.g., researcher)
 * @param address2 - Second address (e.g., bounty owner)
 * @returns Deterministic password string
 */
export function generateSharedKey(address1: string, address2: string): string {
    // Sort addresses to ensure same key regardless of order
    const sorted = [address1, address2].sort();
    return `${sorted[0]}-${sorted[1]}`;
}

/**
 * Hash a string using SHA-256
 * @param data - Data to hash
 * @returns Hex string of the hash
 */
export async function hashString(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
