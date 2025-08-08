const axios = require('axios');

// Test investment API endpoint
async function testInvestmentAPI() {
  const baseURL = 'http://localhost:3002';
  
  try {
    console.log('🧪 Testing Investment API...');
    
    // Test data - using wallet address format
    const investmentData = {
      opportunityId: 'test_opportunity_123',
      investorUserId: '0.0.123456', // Wallet address format
      investmentAmount: 50
    };
    
    console.log('📤 Sending investment request:', JSON.stringify(investmentData, null, 2));
    
    const response = await axios.post(`${baseURL}/api/investments/invest`, investmentData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Investment API Response:', response.status, response.statusText);
    console.log('📋 Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Investment API Error:', error.response.status, error.response.statusText);
      console.log('📋 Error Data:', JSON.stringify(error.response.data, null, 2));
      
      // Check if it's still a 400 error or if we've resolved it
      if (error.response.status === 400) {
        console.log('🔍 400 Error Details:', error.response.data.message || error.response.data);
      }
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Run the test
testInvestmentAPI();
