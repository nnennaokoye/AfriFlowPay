const axios = require('axios');
const logger = require('./utils/logger');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER_ID = 'test_user_' + Date.now();
const TEST_MERCHANT_ID = 'test_merchant_' + Date.now();

class ProductionTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    try {
      logger.info(`🧪 Running test: ${name}`);
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      logger.info(`✅ Test passed: ${name}`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      logger.error(`❌ Test failed: ${name}`, error.message);
    }
  }

  async testHealthCheck() {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.status !== 200 || !response.data.status) {
      throw new Error('Health check failed');
    }
  }

  async testAccountCreation() {
    const response = await axios.post(`${BASE_URL}/api/accounts/create`, {
      userId: TEST_USER_ID
    });
    
    if (response.status !== 201 || !response.data.success) {
      throw new Error('Account creation failed');
    }
    
    this.testAccountId = response.data.data.accountId;
    logger.info(`Created test account: ${this.testAccountId}`);
  }

  async testMerchantAccountCreation() {
    const response = await axios.post(`${BASE_URL}/api/accounts/create`, {
      userId: TEST_MERCHANT_ID
    });
    
    if (response.status !== 201 || !response.data.success) {
      throw new Error('Merchant account creation failed');
    }
    
    this.merchantAccountId = response.data.data.accountId;
    logger.info(`Created merchant account: ${this.merchantAccountId}`);
  }

  async testQRGeneration() {
    const response = await axios.post(`${BASE_URL}/api/payments/generate-qr`, {
      merchantId: TEST_MERCHANT_ID,
      amount: 10,
      tokenType: 'HBAR'
    });
    
    if (response.status !== 200 || !response.data.success) {
      throw new Error('QR generation failed');
    }
    
    this.paymentNonce = response.data.data.nonce;
    logger.info(`Generated QR with nonce: ${this.paymentNonce.substring(0, 8)}...`);
  }

  async testPaymentValidation() {
    const response = await axios.post(`${BASE_URL}/api/payments/validate`, {
      paymentData: this.paymentNonce
    });
    
    if (response.status !== 200 || !response.data.success || !response.data.data.isValid) {
      throw new Error('Payment validation failed');
    }
  }

  async testPaymentStatus() {
    const response = await axios.get(`${BASE_URL}/api/payments/status/${this.paymentNonce}`);
    
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Payment status check failed');
    }
  }

  async testAccountBalance() {
    const response = await axios.get(`${BASE_URL}/api/accounts/${this.testAccountId}/balance`);
    
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Balance check failed');
    }
  }

  async testInvalidRequests() {
    // Test invalid account creation
    try {
      await axios.post(`${BASE_URL}/api/accounts/create`, {
        userId: ''
      });
      throw new Error('Should have failed with empty userId');
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error('Invalid request validation failed');
      }
    }

    // Test invalid QR generation
    try {
      await axios.post(`${BASE_URL}/api/payments/generate-qr`, {
        merchantId: '',
        amount: -10
      });
      throw new Error('Should have failed with invalid data');
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error('Invalid QR request validation failed');
      }
    }
  }

  async testYellowCardIntegration() {
    // Test countries endpoint
    const countriesResponse = await axios.get(`${BASE_URL}/api/yellowcard/countries`);
    if (countriesResponse.status !== 200 || !countriesResponse.data.success) {
      throw new Error('YellowCard countries endpoint failed');
    }

    // Test payment methods endpoint
    const paymentMethodsResponse = await axios.get(`${BASE_URL}/api/yellowcard/payment-methods/NG`);
    if (paymentMethodsResponse.status !== 200 || !paymentMethodsResponse.data.success) {
      throw new Error('YellowCard payment methods endpoint failed');
    }
  }

  async testDirectDeposit() {
    const response = await axios.post(`${BASE_URL}/api/direct-deposit/initiate`, {
      userId: TEST_USER_ID,
      amount: 100,
      currency: 'USD',
      bankAccount: 'test-account'
    });
    
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Direct deposit initiation failed');
    }
  }

  async runAllTests() {
    logger.info('🚀 Starting production tests...');
    
    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('Account Creation', () => this.testAccountCreation());
    await this.runTest('Merchant Account Creation', () => this.testMerchantAccountCreation());
    await this.runTest('QR Generation', () => this.testQRGeneration());
    await this.runTest('Payment Validation', () => this.testPaymentValidation());
    await this.runTest('Payment Status', () => this.testPaymentStatus());
    await this.runTest('Account Balance', () => this.testAccountBalance());
    await this.runTest('Invalid Requests Validation', () => this.testInvalidRequests());
    await this.runTest('YellowCard Integration', () => this.testYellowCardIntegration());
    await this.runTest('Direct Deposit', () => this.testDirectDeposit());

    // Print results
    logger.info('\n📊 Test Results Summary:');
    logger.info(`✅ Passed: ${this.results.passed}`);
    logger.info(`❌ Failed: ${this.results.failed}`);
    logger.info(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2)}%`);
    
    if (this.results.failed > 0) {
      logger.error('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => logger.error(`  - ${test.name}: ${test.error}`));
    }
    
    return this.results.failed === 0;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ProductionTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = ProductionTester;
