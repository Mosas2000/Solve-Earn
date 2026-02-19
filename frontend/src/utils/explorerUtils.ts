/**
 * Utilities for Stacks Explorer integration
 */

import { NETWORK_MODE } from '@/config/network';

function resolveExplorerBaseUrl(): string {
    switch (NETWORK_MODE) {
        case 'mainnet':
            return 'https://explorer.hiro.so';
        case 'testnet':
            return 'https://explorer.hiro.so';
        case 'devnet':
            return 'http://localhost:8000';
        default:
            return 'https://explorer.hiro.so';
    }
}

const EXPLORER_BASE_URL = resolveExplorerBaseUrl();

/**
 * Returns the query string suffix for the current network.
 * Testnet URLs require ?chain=testnet appended after the path.
 */
function networkQuerySuffix(): string {
    return NETWORK_MODE === 'testnet' ? '?chain=testnet' : '';
}

/**
 * Get the Stacks Explorer URL for a transaction
 * @param txId - Transaction ID
 * @returns Full URL to the transaction on Stacks Explorer
 */
export function getExplorerTxUrl(txId: string): string {
    return `${EXPLORER_BASE_URL}/txid/${txId}${networkQuerySuffix()}`;
}

/**
 * Get the Stacks Explorer URL for an address
 * @param address - Stacks address
 * @returns Full URL to the address on Stacks Explorer
 */
export function getExplorerAddressUrl(address: string): string {
    return `${EXPLORER_BASE_URL}/address/${address}${networkQuerySuffix()}`;
}

/**
 * Get the Stacks Explorer URL for a contract
 * @param contractAddress - Contract address
 * @param contractName - Contract name
 * @returns Full URL to the contract on Stacks Explorer
 */
export function getExplorerContractUrl(contractAddress: string, contractName: string): string {
    return `${EXPLORER_BASE_URL}/txid/${contractAddress}.${contractName}${networkQuerySuffix()}`;
}

/**
 * Get the Stacks Explorer URL for a block
 * @param blockHeight - Block height
 * @returns Full URL to the block on Stacks Explorer
 */
export function getExplorerBlockUrl(blockHeight: number): string {
    return `${EXPLORER_BASE_URL}/block/${blockHeight}${networkQuerySuffix()}`;
}

/**
 * Open transaction in Stacks Explorer in a new tab
 * @param txId - Transaction ID
 */
export function openTxInExplorer(txId: string): void {
    window.open(getExplorerTxUrl(txId), '_blank', 'noopener,noreferrer');
}
