/**
 * Utilities for Stacks Explorer integration
 */

const MAINNET_EXPLORER = 'https://explorer.hiro.so';
const TESTNET_EXPLORER = 'https://explorer.hiro.so/?chain=testnet';

// Using mainnet since the app is configured for mainnet
const EXPLORER_BASE_URL = MAINNET_EXPLORER;

/**
 * Get the Stacks Explorer URL for a transaction
 * @param txId - Transaction ID
 * @returns Full URL to the transaction on Stacks Explorer
 */
export function getExplorerTxUrl(txId: string): string {
    return `${EXPLORER_BASE_URL}/txid/${txId}`;
}

/**
 * Get the Stacks Explorer URL for an address
 * @param address - Stacks address
 * @returns Full URL to the address on Stacks Explorer
 */
export function getExplorerAddressUrl(address: string): string {
    return `${EXPLORER_BASE_URL}/address/${address}`;
}

/**
 * Get the Stacks Explorer URL for a contract
 * @param contractAddress - Contract address
 * @param contractName - Contract name
 * @returns Full URL to the contract on Stacks Explorer
 */
export function getExplorerContractUrl(contractAddress: string, contractName: string): string {
    return `${EXPLORER_BASE_URL}/txid/${contractAddress}.${contractName}`;
}

/**
 * Get the Stacks Explorer URL for a block
 * @param blockHeight - Block height
 * @returns Full URL to the block on Stacks Explorer
 */
export function getExplorerBlockUrl(blockHeight: number): string {
    return `${EXPLORER_BASE_URL}/block/${blockHeight}`;
}

/**
 * Open transaction in Stacks Explorer in a new tab
 * @param txId - Transaction ID
 */
export function openTxInExplorer(txId: string): void {
    window.open(getExplorerTxUrl(txId), '_blank', 'noopener,noreferrer');
}
