#!/usr/bin/env ts-node
/**
 * Demo script to create a bounty on mainnet
 * This creates real on-chain transactions
 */

import {
    makeContractCall,
    broadcastTransaction,
    AnchorMode,
    PostConditionMode,
    uintCV,
    stringUtf8CV,
} from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

// Use shared network config (CommonJS require for compatibility)
const networkConfig = require('./network-config');
const network = networkConfig.network;
const CONTRACT_ADDRESS: string = networkConfig.CONTRACT_ADDRESS;
const BOUNTY_CONTRACT = 'bounty-vault';

// Your wallet private key (KEEP THIS SECURE!)
const SENDER_KEY = process.env.STACKS_PRIVATE_KEY || '';

async function createDemoBounty() {
    console.log('🚀 Creating Demo Bounty on Mainnet...\n');

    // Bounty details
    const bountyData = {
        title: 'Smart Contract Security Audit',
        description: 'Find vulnerabilities in our DeFi protocol',
        totalPool: 10, // 10 STX
        criticalReward: 5, // 5 STX for critical
        highReward: 3, // 3 STX for high
        mediumReward: 1.5, // 1.5 STX for medium
        lowReward: 0.5, // 0.5 STX for low
        durationDays: 30, // 30 days
    };

    const durationBlocks = bountyData.durationDays * 144; // ~144 blocks per day

    console.log('Bounty Details:');
    console.log(`  Title: ${bountyData.title}`);
    console.log(`  Description: ${bountyData.description}`);
    console.log(`  Total Pool: ${bountyData.totalPool} STX`);
    console.log(`  Duration: ${bountyData.durationDays} days\n`);

    try {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'create-bounty',
            functionArgs: [
                stringUtf8CV(bountyData.title),
                stringUtf8CV(bountyData.description),
                uintCV(bountyData.totalPool * 1000000), // Convert to microSTX
                uintCV(bountyData.criticalReward * 1000000),
                uintCV(bountyData.highReward * 1000000),
                uintCV(bountyData.mediumReward * 1000000),
                uintCV(bountyData.lowReward * 1000000),
                uintCV(durationBlocks),
            ],
            senderKey: SENDER_KEY,
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Allow,
            fee: 10000, // 0.01 STX fee
        };

        const transaction = await makeContractCall(txOptions);
        const broadcastResponse = await broadcastTransaction(transaction, network);

        if ('error' in broadcastResponse) {
            console.error('❌ Transaction failed:', broadcastResponse.error);
            if ('reason' in broadcastResponse) {
                console.error('   Reason:', broadcastResponse.reason);
            }
        } else {
            console.log('✅ Transaction broadcast successfully!');
            console.log(`   TX ID: ${broadcastResponse.txid}`);
            console.log(`   Explorer: https://explorer.hiro.so/txid/${broadcastResponse.txid}?chain=mainnet\n`);
            console.log('⏳ Wait 5-10 minutes for confirmation, then check the explorer.');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the script
if (require.main === module) {
    if (!process.env.STACKS_PRIVATE_KEY) {
        console.error('❌ Error: STACKS_PRIVATE_KEY environment variable not set');
        console.log('\nUsage:');
        console.log('  export STACKS_PRIVATE_KEY="your-private-key-here"');
        console.log('  ts-node scripts/create-demo-bounty.ts\n');
        process.exit(1);
    }

    createDemoBounty().catch(console.error);
}

export { createDemoBounty };
