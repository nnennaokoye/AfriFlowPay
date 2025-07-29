const { Client, PrivateKey, AccountId } = require('@hashgraph/sdk');
require('dotenv').config();

class HederaClient {
  constructor() {
    this.client = null;
    this.operatorId = null;
    this.operatorKey = null;
    this.initialize();
  }

  initialize() {
    try {
      // Validate environment variables
      if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
        throw new Error('Missing Hedera operator credentials');
      }

      this.operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
      this.operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY);

      // Initialize client for testnet
      this.client = Client.forTestnet();
      this.client.setOperator(this.operatorId, this.operatorKey);

      console.log('Hedera client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Hedera client:', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  getOperatorId() {
    return this.operatorId;
  }

  getOperatorKey() {
    return this.operatorKey;
  }
}

module.exports = new HederaClient();