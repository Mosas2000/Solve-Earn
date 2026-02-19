/**
 * Stacks API utilities for checking transaction status
 */

import { NETWORK_MODE } from '@/config/network';

function resolveApiUrl(): string {
    switch (NETWORK_MODE) {
        case 'mainnet':
            return 'https://api.mainnet.hiro.so';
        case 'testnet':
            return 'https://api.testnet.hiro.so';
        case 'devnet':
            return 'http://localhost:3999';
        default:
            return 'https://api.testnet.hiro.so';
    }
}

const STACKS_API_URL = resolveApiUrl();

export interface StacksTransactionResponse {
    tx_id: string;
    tx_status: 'pending' | 'success' | 'abort_by_response' | 'abort_by_post_condition';
    tx_result?: {
        hex: string;
        repr: string;
    };
    canonical: boolean;
    block_height?: number;
    block_hash?: string;
    burn_block_time?: number;
    error?: string;
}

/**
 * Check the status of a transaction on the Stacks blockchain
 * @param txId - Transaction ID to check
 * @returns Transaction status information
 */
export async function checkTransactionStatus(txId: string): Promise<StacksTransactionResponse | null> {
    try {
        const response = await fetch(`${STACKS_API_URL}/extended/v1/tx/${txId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                // Transaction not found yet (might still be broadcasting)
                return null;
            }
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        return data as StacksTransactionResponse;
    } catch (error) {
        console.error('Failed to check transaction status:', error);
        return null;
    }
}

/**
 * Wait for a transaction to be confirmed (with timeout)
 * @param txId - Transaction ID to wait for
 * @param maxAttempts - Maximum number of polling attempts (default: 60)
 * @param pollInterval - Interval between polls in ms (default: 10000 = 10 seconds)
 * @returns Transaction response or null if timeout
 */
export async function waitForTransaction(
    txId: string,
    maxAttempts: number = 60,
    pollInterval: number = 10000
): Promise<StacksTransactionResponse | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const status = await checkTransactionStatus(txId);
        
        if (status) {
            // Transaction found in API
            if (status.tx_status === 'success') {
                return status;
            } else if (status.tx_status === 'abort_by_response' || status.tx_status === 'abort_by_post_condition') {
                // Transaction failed
                return status;
            }
            // If status is 'pending', continue polling
        }
        
        // Wait before next attempt
        if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }
    
    // Timeout reached
    console.warn(`Transaction ${txId} timeout after ${maxAttempts} attempts`);
    return null;
}

/**
 * Check if a transaction is confirmed on-chain
 * @param txId - Transaction ID
 * @returns True if transaction is confirmed with success status
 */
export async function isTransactionConfirmed(txId: string): Promise<boolean> {
    const status = await checkTransactionStatus(txId);
    return status?.tx_status === 'success' && status?.canonical === true;
}

/**
 * Get the block height of a confirmed transaction
 * @param txId - Transaction ID
 * @returns Block height or null if not confirmed
 */
export async function getTransactionBlockHeight(txId: string): Promise<number | null> {
    const status = await checkTransactionStatus(txId);
    return status?.block_height ?? null;
}
