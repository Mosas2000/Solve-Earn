#!/usr/bin/env node

/**
 * Interactive Mainnet Transaction Tester
 * Run individual tests for your Solve-Earn contracts
 */

const {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  stringUtf8CV,
  stringAsciiCV,
  bufferCV,
  callReadOnlyFunction,
  cvToJSON,
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

async function showMenu() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   Solve-Earn Mainnet Transaction Tester      ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\n📍 Contract: ' + CONTRACT_ADDRESS);
  console.log('🌐 Network: Mainnet\n');
  console.log('SELECT A TEST:');
  console.log('1. 👤 Register as Researcher');
  console.log('2. 🎯 Create Bounty Program');
  console.log('3. 🔍 Read Bounty Details');
  console.log('4. 🐛 Submit Vulnerability');
  console.log('5. 📊 Get Total Bounties');
  console.log('6. 👥 Get Total Researchers');
  console.log('7. 📈 Check Reputation Score');
  console.log('0. ❌ Exit\n');
}

async function registerResearcher() {
  console.log('\n🔄 Registering as researcher...');
  
  try {
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
    const response = await broadcastTransaction(transaction, network);
    
    console.log('✅ SUCCESS! Transaction broadcast');
    console.log(`📝 TxID: ${response.txid}`);
    console.log(`🔗 View: https://explorer.hiro.so/txid/${response.txid}?chain=mainnet`);
    console.log('\n⏳ Wait ~10 minutes for confirmation, then check your profile!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function createBounty() {
  console.log('\n📝 Creating a new bounty program...\n');
  
  const title = await question('Enter bounty title: ');
  const description = await question('Enter description: ');
  const totalPool = await question('Total pool (in STX, e.g., 100): ');
  
  const pool = parseFloat(totalPool) * 1000000; // Convert to microSTX
  const critical = Math.floor(pool * 0.5);
  const high = Math.floor(pool * 0.3);
  const medium = Math.floor(pool * 0.15);
  const low = Math.floor(pool * 0.05);
  
  console.log(`\n💰 Reward Structure:`);
  console.log(`   Critical: ${critical/1000000} STX`);
  console.log(`   High: ${high/1000000} STX`);
  console.log(`   Medium: ${medium/1000000} STX`);
  console.log(`   Low: ${low/1000000} STX`);
  
  const confirm = await question('\nProceed? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }
  
  try {
    console.log('\n🔄 Broadcasting transaction...');
    
    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bounty-vault',
      functionName: 'create-bounty',
      functionArgs: [
        stringUtf8CV(title),
        stringUtf8CV(description),
        uintCV(pool),
        uintCV(critical),
        uintCV(high),
        uintCV(medium),
        uintCV(low),
        uintCV(4320), // ~30 days
      ],
      senderKey: SENDER_KEY,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const response = await broadcastTransaction(transaction, network);
    
    console.log('✅ SUCCESS! Bounty created');
    console.log(`📝 TxID: ${response.txid}`);
    console.log(`🔗 View: https://explorer.hiro.so/txid/${response.txid}?chain=mainnet`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function readBounty() {
  const bountyId = await question('\nEnter bounty ID: ');
  
  try {
    console.log(`\n🔄 Fetching bounty #${bountyId}...`);
    
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bounty-vault',
      functionName: 'get-bounty',
      functionArgs: [uintCV(parseInt(bountyId))],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });

    const data = cvToJSON(result);
    console.log('\n✅ Bounty Details:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function submitVulnerability() {
  console.log('\n🐛 Submit a vulnerability report\n');
  
  const bountyId = await question('Enter bounty ID: ');
  
  console.log('\nSelect severity:');
  console.log('1. critical');
  console.log('2. high');
  console.log('3. medium');
  console.log('4. low');
  const severityChoice = await question('Choice (1-4): ');
  
  const severities = ['critical', 'high', 'medium', 'low'];
  const severity = severities[parseInt(severityChoice) - 1] || 'medium';
  
  console.log(`\nSeverity: ${severity.toUpperCase()}`);
  
  const description = await question('Brief description: ');
  
  // Generate a simple hash from the description
  const crypto = require('crypto');
  const reportHash = crypto.createHash('sha256').update(description).digest();
  
  const confirm = await question('\nSubmit this vulnerability? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }
  
  try {
    console.log('\n🔄 Broadcasting transaction...');
    
    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bounty-vault',
      functionName: 'submit-vulnerability',
      functionArgs: [
        uintCV(parseInt(bountyId)),
        stringAsciiCV(severity),
        bufferCV(reportHash),
      ],
      senderKey: SENDER_KEY,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const response = await broadcastTransaction(transaction, network);
    
    console.log('✅ SUCCESS! Vulnerability submitted');
    console.log(`📝 TxID: ${response.txid}`);
    console.log(`🔗 View: https://explorer.hiro.so/txid/${response.txid}?chain=mainnet`);
    console.log('\n💡 The bounty owner will review your submission!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getTotalBounties() {
  try {
    console.log('\n🔄 Fetching total bounties...');
    
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bounty-vault',
      functionName: 'get-total-bounties',
      functionArgs: [],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });

    const data = cvToJSON(result);
    console.log(`\n✅ Total Bounties: ${data.value}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getTotalResearchers() {
  try {
    console.log('\n🔄 Fetching total researchers...');
    
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'reputation',
      functionName: 'get-total-researchers',
      functionArgs: [],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });

    const data = cvToJSON(result);
    console.log(`\n✅ Total Researchers: ${data.value}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function checkReputation() {
  const address = await question('\nEnter Stacks address (or press Enter for yours): ');
  const checkAddress = address || CONTRACT_ADDRESS;
  
  try {
    console.log(`\n🔄 Fetching reputation for ${checkAddress}...`);
    
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'reputation',
      functionName: 'get-reputation-score',
      functionArgs: [principalCV(checkAddress)],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });

    const data = cvToJSON(result);
    console.log('\n✅ Reputation Score:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  if (!SENDER_KEY) {
    console.error('\n❌ STACKS_PRIVATE_KEY not found!');
    console.log('\n📝 Setup instructions:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your private key to .env');
    console.log('3. Run this script again\n');
    rl.close();
    return;
  }
  
  let running = true;
  
  while (running) {
    await showMenu();
    const choice = await question('Enter choice: ');
    
    switch (choice) {
      case '1':
        await registerResearcher();
        break;
      case '2':
        await createBounty();
        break;
      case '3':
        await readBounty();
        break;
      case '4':
        await submitVulnerability();
        break;
      case '5':
        await getTotalBounties();
        break;
      case '6':
        await getTotalResearchers();
        break;
      case '7':
        await checkReputation();
        break;
      case '0':
        console.log('\n👋 Goodbye!\n');
        running = false;
        break;
      default:
        console.log('\n❌ Invalid choice');
    }
    
    if (running) {
      await question('\nPress Enter to continue...');
    }
  }
  
  rl.close();
}

// Check if principalCV is available, add it if needed
const { principalCV } = require('@stacks/transactions');

main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
});
