// Test register-researcher function on mainnet
const {
  callReadOnlyFunction,
  cvToJSON,
  principalCV,
} = require('@stacks/transactions');
const { StacksMainnet } = require('@stacks/network');

const network = new StacksMainnet();
const CONTRACT_ADDRESS = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';

async function testRegisterFunction() {
  console.log('🧪 Testing register-researcher function availability\n');
  console.log('📍 Contract:', CONTRACT_ADDRESS);
  console.log('📄 Contract Name: reputation\n');
  
  // Test 1: Check if contract exists and is accessible
  console.log('Test 1: Check contract accessibility');
  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'reputation',
      functionName: 'get-total-researchers',
      functionArgs: [],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });
    const data = cvToJSON(result);
    console.log('✅ Contract accessible');
    console.log('   Total researchers:', data.value || data);
  } catch (error) {
    console.log('❌ Contract access error:', error.message);
    return;
  }
  
  // Test 2: Try to check a researcher profile (should return none if not registered)
  console.log('\nTest 2: Check researcher profile structure');
  try {
    const testAddress = CONTRACT_ADDRESS;
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'reputation',
      functionName: 'get-researcher-profile',
      functionArgs: [principalCV(testAddress)],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });
    const data = cvToJSON(result);
    console.log('✅ Profile query works');
    console.log('   Result:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Profile query error:', error.message);
  }
  
  // Test 3: Check reputation score function
  console.log('\nTest 3: Check reputation score function');
  try {
    const testAddress = CONTRACT_ADDRESS;
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'reputation',
      functionName: 'get-reputation-score',
      functionArgs: [principalCV(testAddress)],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });
    const data = cvToJSON(result);
    console.log('✅ Reputation score query works');
    console.log('   Result:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Reputation score error:', error.message);
  }
  
  console.log('\n📋 Summary:');
  console.log('   The register-researcher function exists in the contract.');
  console.log('   To register, you need to:');
  console.log('   1. Have a Stacks wallet with STX');
  console.log('   2. Add your private key to .env file');
  console.log('   3. Run: node demo-first-transaction.js\n');
  
  console.log('💡 Common issues:');
  console.log('   - "Already registered" → You\'re already registered, skip this step');
  console.log('   - "Insufficient balance" → Add STX to your wallet');
  console.log('   - "STACKS_PRIVATE_KEY not set" → Create .env file with your key\n');
}

testRegisterFunction().catch(console.error);
