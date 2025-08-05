const mirrorNodeService = require('../services/mirrorNodeService');
const accountService = require('../services/accountService');

class TransactionController {
  /**
   * Get transaction history for account
   * GET /api/v1/transactions/:accountId
   */
  async getAccountTransactions(req, res) {
    try {
      const { accountId } = req.params;
      const { 
        limit = 50, 
        order = 'desc',
        transactionType,
        fromTimestamp,
        toTimestamp 
      } = req.query;

      // Validate account ID format
      if (!accountId || !accountId.match(/^0\.0\.\d+$/)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_ACCOUNT_ID',
          message: 'Invalid account ID format. Expected format: 0.0.123456',
          details: {
            canRetry: true,
            suggestedAction: 'Provide a valid Hedera account ID'
          }
        });
      }

      console.log(`📜 Getting transactions for account: ${accountId}`);

      // Get transaction history from mirror node
      const transactions = await mirrorNodeService.getTransactionHistory(
        accountId,
        parseInt(limit),
        order,
        {
          transactionType,
          fromTimestamp,
          toTimestamp
        }
      );

      res.json({
        success: true,
        data: {
          accountId,
          transactions,
          pagination: {
            limit: parseInt(limit),
            order,
            count: transactions.length
          },
          filters: {
            transactionType: transactionType || null,
            fromTimestamp: fromTimestamp || null,
            toTimestamp: toTimestamp || null
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error getting account transactions:', error);
      
      const errorResponse = this.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get custodial account transaction history by userId
   * GET /api/v1/transactions/custodial/:userId
   */
  async getCustodialAccountTransactions(req, res) {
    try {
      const { userId } = req.params;
      const { 
        limit = 50, 
        order = 'desc',
        transactionType,
        fromTimestamp,
        toTimestamp 
      } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          errorCode: 'USER_ID_REQUIRED',
          message: 'User ID is required'
        });
      }

      // Get custodial account
      const custodialAccount = accountService.getCustodialAccount(userId);
      if (!custodialAccount) {
        return res.status(404).json({
          success: false,
          errorCode: 'CUSTODIAL_ACCOUNT_NOT_FOUND',
          message: 'Custodial account not found for this user',
          details: {
            canRetry: false,
            suggestedAction: 'Create a custodial account first'
          }
        });
      }

      console.log(`📜 Getting custodial transactions for user: ${userId} (${custodialAccount.accountId})`);

      // Get transaction history for the custodial account
      const transactions = await mirrorNodeService.getTransactionHistory(
        custodialAccount.accountId,
        parseInt(limit),
        order,
        {
          transactionType,
          fromTimestamp,
          toTimestamp
        }
      );

      res.json({
        success: true,
        data: {
          userId,
          custodialAccount: {
            accountId: custodialAccount.accountId,
            createdAt: custodialAccount.createdAt
          },
          transactions,
          pagination: {
            limit: parseInt(limit),
            order,
            count: transactions.length
          },
          filters: {
            transactionType: transactionType || null,
            fromTimestamp: fromTimestamp || null,
            toTimestamp: toTimestamp || null
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error getting custodial account transactions:', error);
      
      const errorResponse = this.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get specific transaction details
   * GET /api/v1/transactions/details/:transactionId
   */
  async getTransactionDetails(req, res) {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          errorCode: 'TRANSACTION_ID_REQUIRED',
          message: 'Transaction ID is required'
        });
      }

      console.log(`🔍 Getting transaction details for: ${transactionId}`);

      // Get transaction details from mirror node
      const transactionDetails = await mirrorNodeService.getTransactionDetails(transactionId);

      if (!transactionDetails) {
        return res.status(404).json({
          success: false,
          errorCode: 'TRANSACTION_NOT_FOUND',
          message: 'Transaction not found',
          details: {
            canRetry: false,
            suggestedAction: 'Verify the transaction ID is correct'
          }
        });
      }

      res.json({
        success: true,
        data: transactionDetails
      });

    } catch (error) {
      console.error('❌ Error getting transaction details:', error);
      
      const errorResponse = this.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get payment system transaction history
   * GET /api/v1/transactions/payments
   */
  async getPaymentTransactions(req, res) {
    try {
      const { 
        limit = 50, 
        status,
        customerUserId,
        merchantUserId,
        fromDate,
        toDate 
      } = req.query;

      console.log('📜 Getting payment system transactions...');

      // Get payment service instance to access pending payments
      const paymentService = require('../services/paymentService');
      
      let transactions = [];
      
      // Convert payment data to transaction format
      for (const [nonce, paymentData] of paymentService.pendingPayments.entries()) {
        // Apply filters
        if (status && paymentData.status !== status) continue;
        if (customerUserId && paymentData.customerUserId !== customerUserId) continue;
        if (merchantUserId && paymentData.merchantUserId !== merchantUserId) continue;
        
        if (fromDate) {
          const fromDateTime = new Date(fromDate);
          const transactionTime = paymentData.completedAt || paymentData.startedAt || paymentData.failedAt;
          if (transactionTime && new Date(transactionTime) < fromDateTime) continue;
        }
        
        if (toDate) {
          const toDateTime = new Date(toDate);
          const transactionTime = paymentData.completedAt || paymentData.startedAt || paymentData.failedAt;
          if (transactionTime && new Date(transactionTime) > toDateTime) continue;
        }

        transactions.push({
          nonce,
          transactionId: paymentData.transactionId,
          hederaTransactionId: paymentData.hederaTransactionId || null,
          status: paymentData.status,
          amount: paymentData.amount,
          tokenType: paymentData.tokenType,
          customerUserId: paymentData.customerUserId,
          merchantUserId: paymentData.merchantUserId,
          customerHederaAccount: paymentData.customerHederaAccount,
          merchantHederaAccount: paymentData.merchantHederaAccount,
          startedAt: paymentData.startedAt || null,
          completedAt: paymentData.completedAt || null,
          failedAt: paymentData.failedAt || null,
          error: paymentData.error || null,
          errorCode: paymentData.errorCode || null
        });
      }

      // Sort by most recent first
      transactions.sort((a, b) => {
        const timeA = new Date(a.completedAt || a.startedAt || a.failedAt || 0);
        const timeB = new Date(b.completedAt || b.startedAt || b.failedAt || 0);
        return timeB - timeA;
      });

      // Apply limit
      const limitedTransactions = transactions.slice(0, parseInt(limit));

      res.json({
        success: true,
        data: {
          transactions: limitedTransactions,
          pagination: {
            limit: parseInt(limit),
            total: transactions.length,
            showing: limitedTransactions.length
          },
          filters: {
            status: status || null,
            customerUserId: customerUserId || null,
            merchantUserId: merchantUserId || null,
            fromDate: fromDate || null,
            toDate: toDate || null
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error getting payment transactions:', error);
      
      const errorResponse = this.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get transaction statistics
   * GET /api/v1/transactions/stats
   */
  async getTransactionStats(req, res) {
    try {
      const { accountId, userId, period = '24h' } = req.query;

      console.log('📊 Getting transaction statistics...');

      let stats = {
        period,
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalVolume: 0,
        averageTransactionValue: 0,
        timestamp: new Date().toISOString()
      };

      // If specific account requested
      if (accountId || userId) {
        let targetAccountId = accountId;
        
        if (userId) {
          const custodialAccount = accountService.getCustodialAccount(userId);
          if (!custodialAccount) {
            return res.status(404).json({
              success: false,
              errorCode: 'CUSTODIAL_ACCOUNT_NOT_FOUND',
              message: 'Custodial account not found for this user'
            });
          }
          targetAccountId = custodialAccount.accountId;
        }

        // Get transaction history and calculate stats
        const transactions = await mirrorNodeService.getTransactionHistory(targetAccountId, 1000, 'desc');
        
        // Filter by time period
        const periodMs = this.getPeriodInMs(period);
        const cutoffTime = new Date(Date.now() - periodMs);
        
        const recentTransactions = transactions.filter(tx => {
          const txTime = new Date(tx.consensus_timestamp || tx.valid_start_timestamp);
          return txTime >= cutoffTime;
        });

        stats.totalTransactions = recentTransactions.length;
        stats.successfulTransactions = recentTransactions.filter(tx => tx.result === 'SUCCESS').length;
        stats.failedTransactions = recentTransactions.length - stats.successfulTransactions;
        
        // Calculate volume for HBAR transfers
        const hbarTransfers = recentTransactions.filter(tx => 
          tx.transfers && tx.transfers.some(transfer => transfer.account === targetAccountId)
        );
        
        stats.totalVolume = hbarTransfers.reduce((sum, tx) => {
          const transfer = tx.transfers.find(t => t.account === targetAccountId);
          return sum + Math.abs(transfer ? transfer.amount : 0);
        }, 0);

        stats.averageTransactionValue = stats.totalTransactions > 0 ? 
          stats.totalVolume / stats.totalTransactions : 0;
      }

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Error getting transaction stats:', error);
      
      const errorResponse = this.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Convert period string to milliseconds
   */
  getPeriodInMs(period) {
    const periods = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return periods[period] || periods['24h'];
  }

  /**
   * Map error codes to appropriate HTTP responses
   */
  getErrorResponse(error) {
    const errorMappings = {
      'INVALID_ACCOUNT_ID': {
        statusCode: 400,
        code: 'INVALID_ACCOUNT_ID',
        message: 'Invalid account ID format',
        details: { canRetry: true, suggestedAction: 'Provide a valid Hedera account ID' }
      },
      'CUSTODIAL_ACCOUNT_NOT_FOUND': {
        statusCode: 404,
        code: 'CUSTODIAL_ACCOUNT_NOT_FOUND',
        message: 'Custodial account not found',
        details: { canRetry: false, suggestedAction: 'Create a custodial account first' }
      },
      'TRANSACTION_NOT_FOUND': {
        statusCode: 404,
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
        details: { canRetry: false, suggestedAction: 'Verify the transaction ID is correct' }
      }
    };

    const errorCode = error.code || error.message;
    return errorMappings[errorCode] || {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while fetching transactions',
      details: { canRetry: true, suggestedAction: 'Please try again or contact support' }
    };
  }
}

module.exports = new TransactionController();