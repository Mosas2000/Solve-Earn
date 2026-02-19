/**
 * Utility functions for hash conversion and validation
 */

/**
 * Convert a Uint8Array hash to a hex string
 * @param hashBuffer - Hash as Uint8Array
 * @returns Hex string representation
 */
export function bufferToHex(hashBuffer: Uint8Array): string {
    return Array.from(hashBuffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Convert a hex string to Uint8Array
 * @param hexString - Hex string representation of hash
 * @returns Uint8Array hash buffer
 * @throws Error if the hex string has an odd length
 */
export function hexToBuffer(hexString: string): Uint8Array {
    if (hexString.length % 2 !== 0) {
        throw new Error('Hex string must have an even number of characters');
    }
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Validate that a string is a valid hex hash
 * @param hash - String to validate
 * @param expectedLength - Expected length in bytes (default 32 for SHA-256)
 * @returns true if valid hex hash
 */
export function isValidHash(hash: string, expectedLength: number = 32): boolean {
    const expectedHexLength = expectedLength * 2;
    if (hash.length !== expectedHexLength) {
        return false;
    }
    return /^[0-9a-f]+$/i.test(hash);
}

/**
 * Truncate a hash for display
 * @param hash - Full hash string
 * @param startChars - Number of chars to show at start
 * @param endChars - Number of chars to show at end
 * @returns Truncated hash with ellipsis
 */
export function truncateHash(hash: string, startChars: number = 8, endChars: number = 8): string {
    if (hash.length <= startChars + endChars) {
        return hash;
    }
    return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}
