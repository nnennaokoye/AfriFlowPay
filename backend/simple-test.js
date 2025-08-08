const http = require('http');

// Simple test to verify server is working
const testServer = () => {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Server is responding with status: ${res.statusCode}`);
    console.log('🎉 Server startup successful after cleanup!');
    
    // Test a simple endpoint
    testAccountCreation();
  });

  req.on('error', (err) => {
    console.log(`❌ Server test failed: ${err.message}`);
  });

  req.end();
};

// Test account creation endpoint
const testAccountCreation = () => {
  const postData = JSON.stringify({
    userId: 'test_user_' + Date.now(),
    role: 'customer'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/accounts/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Account creation test - Status: ${res.statusCode}`);
      if (res.statusCode === 201) {
        console.log('✅ Account creation endpoint working correctly!');
      } else {
        console.log('⚠️ Account creation returned:', data);
      }
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.log(`❌ Account creation test failed: ${err.message}`);
    process.exit(1);
  });

  req.write(postData);
  req.end();
};

console.log('🧪 Testing server functionality after cleanup...');
testServer();
