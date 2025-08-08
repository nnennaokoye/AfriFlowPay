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
      
      // Format transaction data for frontend compatibility
      if (data && data.transactions) {
        data.transactions = data.transactions.map(tx => {
          // Calculate amount from transfers with improved logic
          let calculatedAmount = 0;
          
          if (tx.transfers && Array.isArray(tx.transfers) && tx.transfers.length > 0) {
            // For account creation transactions, use exactly 1 HBAR
            if (tx.name === 'CRYPTOCREATEACCOUNT') {
              calculatedAmount = 1.0; // Always 1 HBAR for account creation
            } else {
              // For CRYPTOTRANSFER, find non-fee transfers (exclude network fee transfers)
              const nonFeeTransfers = tx.transfers.filter(t => 
                t.account && 
                !t.account.startsWith('0.0.98') && // Exclude fee collector
                !t.account.startsWith('0.0.3') &&  // Exclude treasury
                Math.abs(t.amount || 0) >= 100000000 // Only include transfers >= 1 HBAR
              );
              
              if (nonFeeTransfers.length > 0) {
                // Use the actual transfer amount (not max, but the meaningful one)
                const meaningfulTransfer = nonFeeTransfers.find(t => Math.abs(t.amount || 0) >= 100000000);
                if (meaningfulTransfer) {
                  calculatedAmount = Math.abs(meaningfulTransfer.amount || 0) / 100000000;
                }
              }
            }
          }
          
          // Fallback for other transaction types
          if (calculatedAmount === 0 && tx.charged_tx_fee) {
            calculatedAmount = Math.abs(tx.charged_tx_fee) / 100000000;
          }
          
          console.log('🔍 Processing transaction:', {
            id: tx.transaction_id,
            type: tx.name,
            transfers: tx.transfers,
            charged_tx_fee: tx.charged_tx_fee,
            calculatedAmount,
            rawAmount: tx.transfers?.[0]?.amount
          });
          
          return {
            ...tx,
            // Convert Hedera nanosecond timestamp to ISO string
            timestamp: tx.consensus_timestamp ? 
              new Date(parseFloat(tx.consensus_timestamp) * 1000).toISOString() : 
              new Date().toISOString(),
            // Ensure other required fields
            transactionId: tx.transaction_id || tx.transactionId || 'unknown',
            type: tx.name || tx.type || 'transfer',
            amount: calculatedAmount,
            currency: 'HBAR',
            status: tx.result || 'SUCCESS',
            from: tx.transfers && tx.transfers.find(t => t.amount < 0)?.account || 'unknown',
            to: tx.transfers && tx.transfers.find(t => t.amount > 0)?.account || 'unknown'
          };
        });
      }
      
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