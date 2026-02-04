// Quick read-only test for deployed contracts
const { callReadOnlyFunction, cvToJSON } = require('@stacks/transactions');
const { StacksMainnet } = require('@stacks/network');

const network = new StacksMainnet();
const CONTRACT_ADDRESS = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';

async function testReadOnly() {
  console.log('🧪 Testing Deployed Contracts on Mainnet\n');
  console.log('📍 Contract:', CONTRACT_ADDRESS);
  console.log('🌐 Network: Mainnet\n');
  
  // Test 1: Get total bounties
  console.log('Test 1: Get Total Bounties');
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
    console.log('✅ Total bounties:', data.value || data);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\nTest 2: Get Total Researchers');
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
    console.log('✅ Total researchers:', data.value || data);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\nTest 3: Get Total Submissions');
  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: 'bounty-vault',
      functionName: 'get-total-submissions',
      functionArgs: [],
      network,
      senderAddress: CONTRACT_ADDRESS,
    });
    const data = cvToJSON(result);
    console.log('✅ Total submissions:', data.value || data);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n✅ Read-only tests completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Setup .env with your private key');
  console.log('   2. Run: node test-interactive.js');
  console.log('   3. Start testing write operations!\n');
}

testReadOnly().catch(console.error);
