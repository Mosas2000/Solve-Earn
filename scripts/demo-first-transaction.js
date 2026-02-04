#!/usr/bin/env node

/**
 * Simple On-Chain Transaction Demo
 * Performs a researcher registration on mainnet
 */

const {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} = require('@stacks/transactions');
const { StacksMainnet } = require('@stacks/network');
const readline = require('readline');
require('dotenv').config();

const network = new StacksMainnet();
const CONTRACT_ADDRESS = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
const SENDER_KEY = process.env.STACKS_PRIVATE_KEY;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function registerResearcher() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     Solve-Earn First Transaction Demo        ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  console.log('📍 Contract: ' + CONTRACT_ADDRESS);
  console.log('🌐 Network: Mainnet');
  console.log('🎯 Action: Register as Security Researcher\n');
  
  if (!SENDER_KEY) {
    console.error('❌ Error: STACKS_PRIVATE_KEY not set in .env file\n');
    console.log('Setup:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your private key from your wallet');
    console.log('3. Run this script again\n');
    rl.close();
    return;
  }
  
  console.log('This will:');
  console.log('  ✅ Create your researcher profile on-chain');
  console.log('  ✅ Initialize your reputation tracking');
  console.log('  ✅ Enable you to submit vulnerabilities');
  console.log('  💰 Cost: ~0.01 STX transaction fee\n');
  
  const answer = await question('Proceed with transaction? (yes/no): ');
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n👋 Transaction cancelled.\n');
    rl.close();
    return;
  }
  
  try {
    console.log('\n🔄 Building transaction...');
    
    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'reputation',
      functionName: 'register-researcher',
      functionArgs: [],
      senderKey: SENDER_KEY,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    
    console.log('📡 Broadcasting to mainnet...');
    const broadcastResponse = await broadcastTransaction(transaction, network);
    
    console.log('\n✅ SUCCESS! Transaction broadcast to mainnet!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('📝 Transaction ID:');
    console.log('   ' + broadcastResponse.txid);
    console.log('═══════════════════════════════════════════════');
    console.log('\n🔗 View on Explorer:');
    console.log(`   https://explorer.hiro.so/txid/${broadcastResponse.txid}?chain=mainnet`);
    console.log('\n⏳ Wait ~10 minutes for confirmation');
    console.log('💡 Then run: node test-interactive.js to continue testing\n');
    
  } catch (error) {
    console.error('\n❌ Transaction failed:', error.message);
    
    if (error.message.includes('already registered')) {
      console.log('\n💡 You are already registered!');
      console.log('   Skip this step and try creating a bounty instead.');
      console.log('   Run: node test-interactive.js\n');
    } else if (error.message.includes('insufficient')) {
      console.log('\n💡 Insufficient balance');
      console.log('   Transfer some STX to your wallet first.\n');
    } else {
      console.log('\n💡 Check the error above and try again.\n');
    }
  }
  
  rl.close();
}

registerResearcher().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
});
