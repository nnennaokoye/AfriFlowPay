const accountService = require('../services/accountService');
const mirrorNodeService = require('../services/mirrorNodeService');

class AccountController {
  /**
   * Create a new custodial account
   */
  async createAccount(req, res) {
    try {
      const { userId } = req.body;
      const userIdToUse = userId || `user_${Date.now()}`; // Generate userId if not provided
      
      console.log(`Creating new custodial account for user: ${userIdToUse}`);
      const account = await accountService.createCustodialAccount(userIdToUse);
      
      console.log(`Created custodial account: ${account.accountId}`);
      
    
      res.json({
        success: true,
        data: {
          userId: userIdToUse,
          accountId: account.accountId,
          publicKey: account.publicKey,
          createdAt: account.createdAt,
          initialBalance: "5 HBAR", // New accounts get 5 HBAR
          network: "Hedera Testnet"
        },
        message: "Custodial account created successfully"
      });
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create account',
        error: error.message
      });
    }
  }

  /**
   * Get account balance for wallet address
   */
  async getBalance(req, res) {
    try {
      const { walletAddress } = req.params;

      // Validate wallet address format
      if (!walletAddress || !walletAddress.match(/^0\.0\.\d+$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet address format. Expected format: 0.0.123456'
        });
      }

      console.log(`Getting balance for wallet: ${walletAddress}`);
      const balance = await accountService.getAccountBalance(walletAddress);

      res.json({
        success: true,
        data: balance
      });

    } catch (error) {
      console.error('Error getting balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get balance',
        error: error.message
      });
    }
  }

  /**
   * Get transaction history for wallet address
   */
  async getTransactionHistory(req, res) {
    try {
      const { walletAddress } = req.params;
      const { limit = 50, order = 'desc' } = req.query;

      // Validate wallet address format
      if (!walletAddress || !walletAddress.match(/^0\.0\.\d+$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet address format. Expected format: 0.0.123456'
        });
      }

      console.log(`Getting transaction history for wallet: ${walletAddress}`);
      const history = await mirrorNodeService.getTransactionHistory(
        walletAddress,
        parseInt(limit),
        order
      );

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Error getting transaction history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction history',
        error: error.message
      });
    }
  }

  /**
   * Debug: List all custodial accounts ()
   */
  async listCustodialAccounts(req, res) {
    try {
      const accounts = accountService.getAllCustodialAccounts();
      
      // SECURE: Filter out any sensitive data
      const safeAccounts = {};
      Object.keys(accounts).forEach(userId => {
        const account = accounts[userId];
        safeAccounts[userId] = {
          userId: account.userId || userId,
          accountId: account.accountId,
          createdAt: account.createdAt,
          
        };
      });
      
      res.json({
        success: true,
        data: safeAccounts,
        count: Object.keys(safeAccounts).length,
        network: "Hedera Testnet"
      });
    } catch (error) {
      console.error('Error listing custodial accounts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list custodial accounts',
        error: error.message
      });
    }
  }

  /**
   * Get custodial account balance by userId
   */
  async getCustodialBalance(req, res) {
    try {
      const { userId } = req.params;
      
      const custodialAccount = accountService.getCustodialAccount(userId);
      if (!custodialAccount) {
        return res.status(404).json({
          success: false,
          message: `Custodial account not found for userId: ${userId}`
        });
      }
      
      const balance = await accountService.getBalance(userId);
      res.json({
        success: true,
        data: {
          userId,
          accountId: custodialAccount.accountId,
          balance,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting custodial balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get custodial account balance',
        error: error.message
      });
    }
  }

  /**
   * Get custodial account transaction history by userId
   */
  async getCustodialTransactionHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 50, order = 'desc' } = req.query;
      
      const custodialAccount = accountService.getCustodialAccount(userId);
      if (!custodialAccount) {
        return res.status(404).json({
          success: false,
          message: `Custodial account not found for userId: ${userId}`
        });
      }
      
      console.log(`Getting transaction history for custodial account: ${custodialAccount.accountId}`);
      const history = await mirrorNodeService.getTransactionHistory(
        custodialAccount.accountId,
        parseInt(limit),
        order
      );
      
      res.json({
        success: true,
        data: {
          userId,
          accountId: custodialAccount.accountId,
          transactions: history,
          pagination: {
            limit: parseInt(limit),
            order,
            count: history.length
          }
        }
      });
    } catch (error) {
      console.error('Error getting custodial transaction history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get custodial account transaction history',
        error: error.message
      });
    }
  }

  /**
   * Get account info for wallet address
   */
  async getAccountInfo(req, res) {
    try {
      const { walletAddress } = req.params;

      // Validate wallet address format
      if (!walletAddress || !walletAddress.match(/^0\.0\.\d+$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet address format. Expected format: 0.0.123456'
        });
      }

      // Get balance
      let balance;
      try {
        balance = await accountService.getAccountBalance(walletAddress);
      } catch (balanceError) {
        console.warn('Could not fetch balance:', balanceError.message);
        balance = { hbar: '0 ℏ', tokens: {} };
      }

      res.json({
        success: true,
        data: {
          walletAddress,
          balance,
          timestamp: new Date().toISOString(),
          network: "Hedera Testnet"
        }
      });

    } catch (error) {
      console.error('Error getting account info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get account info',
        error: error.message
      });
    }
  }

  /**
   * DEVELOPMENT ONLY: Get account keys for debugging
   * This would be removed completely in production
   * Only accessible with special debug header
   */
  async getAccountKeysDebug(req, res) {
    try {
      // Only allow in development mode with special header
      const debugHeader = req.headers['x-debug-mode'];
      if (debugHeader !== 'development-only') {
        return res.status(403).json({
          success: false,
          message: 'Debug endpoint not available'
        });
      }

      const { userId } = req.params;
      const custodialAccount = accountService.getCustodialAccount(userId);
      
      if (!custodialAccount) {
        return res.status(404).json({
          success: false,
          message: `Custodial account not found for userId: ${userId}`
        });
      }

      // Only log to console, never return in response
      console.log(`🔐 DEBUG - Account keys for ${userId}:`);
      console.log(`   Public Key: ${custodialAccount.publicKey}`);
      console.log(`   Private Key: ${custodialAccount.privateKey}`);
      console.log(`   Account ID: ${custodialAccount.accountId}`);

      res.json({
        success: true,
        data: {
          message: "Account keys logged to console",
          userId,
          accountId: custodialAccount.accountId,
          publicKey: custodialAccount.publicKey
          // privateKey: Still never returned, only logged
        }
      });

    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Debug endpoint error',
        error: error.message
      });
    }
  }
}

module.exports = new AccountController();