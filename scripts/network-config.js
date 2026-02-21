// ---------------------------------------------------------------------------
// Shared network resolver for CLI scripts
//
// Reads STACKS_NETWORK from node environment variables (note: scripts use
// the non-prefixed name since they do not go through Vite).
//
// Supported values: mainnet | testnet | devnet
// Default: mainnet  (scripts historically targeted mainnet)
// ---------------------------------------------------------------------------

const { STACKS_MAINNET, STACKS_TESTNET, STACKS_DEVNET } = require('@stacks/network');

const NETWORK_DEFAULTS = {
    mainnet: {
        address: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
        label: 'Mainnet',
    },
    testnet: {
        address: 'ST31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQZ99B2BP',
        label: 'Testnet',
    },
    devnet: {
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        label: 'Devnet',
    },
};

function resolveNetworkMode() {
    const raw = (process.env.STACKS_NETWORK || 'mainnet').toLowerCase().trim();
    if (raw === 'testnet') return 'testnet';
    if (raw === 'devnet') return 'devnet';
    return 'mainnet';
}

function createNetwork(mode) {
    switch (mode) {
        case 'testnet':
            return STACKS_TESTNET;
        case 'devnet':
            return STACKS_DEVNET;
        case 'mainnet':
        default:
            return STACKS_MAINNET;
    }
}

const NETWORK_MODE = resolveNetworkMode();
const network = createNetwork(NETWORK_MODE);
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || NETWORK_DEFAULTS[NETWORK_MODE].address;
const NETWORK_LABEL = NETWORK_DEFAULTS[NETWORK_MODE].label;

module.exports = {
    NETWORK_MODE,
    network,
    CONTRACT_ADDRESS,
    NETWORK_LABEL,
    NETWORK_DEFAULTS,
};
