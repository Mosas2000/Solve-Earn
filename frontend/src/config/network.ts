// ---------------------------------------------------------------------------
// Network configuration
//
// Reads VITE_STACKS_NETWORK from environment variables to decide which
// Stacks network the application should connect to. Defaults to testnet
// so that local development never accidentally hits mainnet.
//
// Supported values:
//   mainnet  - Stacks mainnet (production)
//   testnet  - Stacks testnet (default for development)
//   devnet   - Local devnet via Clarinet
// ---------------------------------------------------------------------------

import { StacksMainnet, StacksTestnet, StacksDevnet } from '@stacks/network';
import type { StacksNetwork } from '@stacks/network';

export type NetworkMode = 'mainnet' | 'testnet' | 'devnet';

function resolveNetworkMode(): NetworkMode {
    const raw = (import.meta.env.VITE_STACKS_NETWORK || 'testnet').toLowerCase().trim();

    if (raw === 'mainnet') return 'mainnet';
    if (raw === 'devnet') return 'devnet';
    return 'testnet';
}

export const NETWORK_MODE: NetworkMode = resolveNetworkMode();

export function createNetwork(): StacksNetwork {
    switch (NETWORK_MODE) {
        case 'mainnet':
            return new StacksMainnet();
        case 'devnet':
            return new StacksDevnet();
        case 'testnet':
        default:
            return new StacksTestnet();
    }
}

// Contract address per network
function resolveContractAddress(): string {
    const envAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    if (envAddress) return envAddress;

    switch (NETWORK_MODE) {
        case 'mainnet':
            return 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
        case 'devnet':
            return 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
        case 'testnet':
        default:
            return 'ST31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQZ99B2BP';
    }
}

export const CONTRACT_ADDRESS = resolveContractAddress();

// Human-readable network label for display in the UI
export function getNetworkLabel(): string {
    switch (NETWORK_MODE) {
        case 'mainnet':
            return 'Mainnet';
        case 'devnet':
            return 'Devnet';
        case 'testnet':
        default:
            return 'Testnet';
    }
}

// Network-aware address resolver for wallet profiles
export function getProfileAddress(profile: any): string {
    if (!profile?.stxAddress) return '';

    switch (NETWORK_MODE) {
        case 'mainnet':
            return profile.stxAddress.mainnet || '';
        case 'testnet':
        case 'devnet':
        default:
            return profile.stxAddress.testnet || '';
    }
}
