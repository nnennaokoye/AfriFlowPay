const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testWithdrawal() {
  console.log('🧪 Testing Withdrawal Functionality (Custodial Accounts)...\n');

  try {
    // First, create a custodial account for testing
    console.log('0️⃣ Creating test custodial account...');
    const accountRequest = {
      userId: 'test_withdrawal_user'
    };
    
    try {
      const accountResponse = await axios.post(`${BASE_URL}/api/accounts/create`, accountRequest);
      console.log('✅ Test account created:');
      console.log(JSON.stringify(accountResponse.data, null, 2));
    } catch (accountError) {
      if (accountError.response && accountError.response.status === 409) {
        console.log('ℹ️ Test account already exists, continuing...');
      } else {
        throw accountError;
      }
    }

    // Test 1: Request withdrawal
    console.log('\n1️⃣ Testing withdrawal request...');
    const withdrawalRequest = {
      userId: 'test_withdrawal_user',
      amount: 5,
      token: 'HBAR',
      destinationAddress: '0.0.654321'
    };

    const response = await axios.post(`${BASE_URL}/api/withdrawals/request`, withdrawalRequest);
    console.log('✅ Withdrawal request successful:');
    console.log(JSON.stringify(response.data, null, 2));
    
    const withdrawalId = response.data.data.withdrawalId;
    console.log(`\n📝 Withdrawal ID: ${withdrawalId}\n`);

    // Test 2: Check withdrawal status
    console.log('2️⃣ Testing withdrawal status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/withdrawals/status/${withdrawalId}`);
    console.log('✅ Status check successful:');
    console.log(JSON.stringify(statusResponse.data, null, 2));

    // Test 3: Get withdrawal history
    console.log('\n3️⃣ Testing withdrawal history...');
    const historyResponse = await axios.get(`${BASE_URL}/api/withdrawals/history/test_withdrawal_user`);
    console.log('✅ History retrieval successful:');
    console.log(JSON.stringify(historyResponse.data, null, 2));

    // Wait for withdrawal to complete and check status again
    console.log('\n4️⃣ Waiting 2 seconds for withdrawal to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalStatusResponse = await axios.get(`${BASE_URL}/api/withdrawals/status/${withdrawalId}`);
    console.log('✅ Final status check:');
    console.log(JSON.stringify(finalStatusResponse.data, null, 2));

    console.log('\n🎉 All withdrawal tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testWithdrawal();
