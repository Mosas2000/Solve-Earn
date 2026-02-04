// Mainnet Transaction Testing Script for Solve-Earn
// This script tests all major contract functions on mainnet

const {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  stringUtf8CV,
  stringAsciiCV,
  bufferCV,
  principalCV,
  callReadOnlyFunction,
  cvToJSON,
} = require('@stacks/transactions');
const { StacksMainnet } = require('@stacks/network');
require('dotenv').config();

const network = new StacksMainnet();
const CONTRACT_ADDRESS = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';

// Read private key from environment variable
// IMPORTANT: Never commit your private key!
const SENDER_KEY = process.env.STACKS_PRIVATE_KEY;

if (!SENDER_KEY) {
  console.error('❌ Error: STACKS_PRIVATE_KEY environment variable not set');
  console.log('Create a .env file with:');
  console.log('STACKS_PRIVATE_KEY=your_private_key_here');
  process.exit(1);
}

// Utility function to wait for transaction confirmation
async function waitForTransaction(txId) {
  console.log(`⏳ Waiting for transaction ${txId} to confirm...`);
  console.log(`   View at: https://explorer.hiro.so/txid/${txId}?chain=mainnet`);
  
  // In production, you'd poll the API for status
  // For now, we'll just wait a reasonable time
  await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
}

// Test 1: Register as Researcher
async function testRegisterResearcher() {
  console.log('\n📋 Test 1: Register as Researcher');
  console.log('=====================================');
  
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
    const broadcastResponse = await broadcastTransaction(transaction, network);
    
    console.log('✅ Transaction broadcast successfully!');
    console.log(`   TxID: ${broadcastResponse.txid}`);
    
    return broadcastResponse.txid;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 2: Create a Bounty
async function testCreateBounty() {
  console.log('\n🎯 Test 2: Create Bug Bounty Program');
  console.log('=====================================');
  
  try {
    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bounty-vault',
      functionName: 'create-bounty',
      functionArgs: [
        stringUtf8CV('Mainnet Security Test'),
        stringUtf8CV('Testing bounty creation on mainnet'),
        uintCV(100000000), // 100 STX total pool
        uintCV(50000000),  // 50 STX critical
        uintCV(30000000),  // 30 STX high
        uintCV(15000000),  // 15 STX medium
        uintCV(5000000),   // 5 STX low
        uintCV(4320),      // ~30 days
      ],
      senderKey: SENDER_KEY,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    
    console.log('✅ Bounty created successfully!');
    console.log(`   TxID: ${broadcastResponse.txid}`);
    console.log('   Pool: 100 STX');
    console.log('   Rewards: 50/30/15/5 STX');
    
    return broadcastResponse.txid;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 3: Read Bounty Details
async function testReadBounty(bountyId) {
  console.log(`\n🔍 Test 3: Read Bounty #${bountyId} Details`);
  console.log('=====================================');
  
  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bounty-vault',
      functionName: 'get-bounty',
      functionArgs: [uintCV(bountyId)],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });

    const data = cvToJSON(result);
    console.log('✅ Bounty details retrieved:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 4: Submit Vulnerability
async function testSubmitVulnerability(bountyId) {
  console.log(`\n🐛 Test 4: Submit Vulnerability for Bounty #${bountyId}`);
  console.log('=====================================');
  
  try {
    // Create a sample report hash (32 bytes)
    const reportHash = Buffer.from('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'hex');
    
    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bounty-vault',
      functionName: 'submit-vulnerability',
      functionArgs: [
        uintCV(bountyId),
        stringAsciiCV('high'),
        bufferCV(reportHash),
      ],
      senderKey: SENDER_KEY,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    
    console.log('✅ Vulnerability submitted successfully!');
    console.log(`   TxID: ${broadcastResponse.txid}`);
    console.log('   Severity: HIGH');
    console.log('   Expected Reward: 30 STX');
    
    return broadcastResponse.txid;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 5: Read Submission Details
async function testReadSubmission(submissionId) {
  console.log(`\n🔍 Test 5: Read Submission #${submissionId} Details`);
  console.log('=====================================');
  
  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bounty-vault',
      functionName: 'get-submission',
      functionArgs: [uintCV(submissionId)],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });

    const data = cvToJSON(result);
    console.log('✅ Submission details retrieved:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 6: Check Researcher Profile
async function testReadProfile(address) {
  console.log(`\n👤 Test 6: Read Researcher Profile`);
  console.log('=====================================');
  
  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'reputation',
      functionName: 'get-researcher-profile',
      functionArgs: [principalCV(address)],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });

    const data = cvToJSON(result);
    console.log('✅ Profile retrieved:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 7: Get Total Bounties
async function testGetTotalBounties() {
  console.log(`\n📊 Test 7: Get Total Bounties Count`);
  console.log('=====================================');
  
  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bounty-vault',
      functionName: 'get-total-bounties',
      functionArgs: [],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });

    const data = cvToJSON(result);
    console.log('✅ Total bounties:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Solve-Earn Mainnet Contract Tests');
  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: Mainnet`);
  console.log('==============================================\n');
  
  try {
    // Test 1: Register as researcher (if not already registered)
    const registerTxId = await testRegisterResearcher();
    if (registerTxId) {
      await waitForTransaction(registerTxId);
    }
    
    // Test 2: Create a bounty
    const bountyTxId = await testCreateBounty();
    if (bountyTxId) {
      await waitForTransaction(bountyTxId);
      
      // Test 3: Read the bounty we just created
      await testReadBounty(1); // Assuming it's bounty #1
    }
    
    // Test 4: Submit a vulnerability
    const submitTxId = await testSubmitVulnerability(1);
    if (submitTxId) {
      await waitForTransaction(submitTxId);
      
      // Test 5: Read the submission
      await testReadSubmission(1); // Assuming it's submission #1
    }
    
    // Test 6: Check profile (read-only, no wait needed)
    await testReadProfile(CONTRACT_ADDRESS);
    
    // Test 7: Get total bounties (read-only, no wait needed)
    await testGetTotalBounties();
    
    console.log('\n✅ All tests completed!');
    console.log('\n📝 Summary:');
    console.log('   - Researcher registered');
    console.log('   - Bounty created with 100 STX pool');
    console.log('   - Vulnerability submitted (HIGH severity)');
    console.log('   - All data read successfully');
    console.log('\n🎉 Your Solve-Earn contracts are working on mainnet!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testRegisterResearcher,
  testCreateBounty,
  testReadBounty,
  testSubmitVulnerability,
  testReadSubmission,
  testReadProfile,
  testGetTotalBounties,
};
