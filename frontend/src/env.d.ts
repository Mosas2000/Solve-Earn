/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * Which Stacks network to connect to.
     * Accepted values: "mainnet" | "testnet" | "devnet"
     * @default "testnet"
     */
    readonly VITE_STACKS_NETWORK?: string;

    /**
     * Override the contract deployer address.
     * When omitted a sensible default is used for the selected network.
     */
    readonly VITE_CONTRACT_ADDRESS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
