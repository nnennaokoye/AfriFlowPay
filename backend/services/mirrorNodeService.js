const axios = require('axios');

class MirrorNodeService {
  constructor() {
    this.baseUrl = process.env.MIRROR_NODE_BASE_URL || 'https://testnet.mirrornode.hedera.com/api/v1';
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  /**
   * Get account balance from Mirror Node
   */
  async getAccountBalance(accountId) {
    try {
      const cacheKey = `balance_${accountId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await axios.get(`${this.baseUrl}/balances`, {
        params: { 'account.id': accountId }
      });

      const data = response.data;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error fetching balance from Mirror Node:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for account
   */
  async getTransactionHistory(accountId, limit = 50, order = 'desc') {
    try {
      const cacheKey = `transactions_${accountId}_${limit}_${order}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await axios.get(`${this.baseUrl}/transactions`, {
        params: {
          'account.id': accountId,
          limit,
          order
        }
      });

      const data = response.data;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error fetching transactions from Mirror Node:', error);
      throw error;
    }
  }

  /**
   * Get specific transaction by ID
   */
  async getTransaction(transactionId) {
    try {
      const response = await axios.get(`${this.baseUrl}/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction from Mirror Node:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new MirrorNodeService();