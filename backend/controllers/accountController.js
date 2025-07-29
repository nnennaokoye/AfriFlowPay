const accountService = require('../services/accountService');
const mirrorNodeService = require('../services/mirrorNodeService');
const tokenService = require('../services/tokenService');
const { PrivateKey } = require('@hashgraph/sdk');

class AccountController {
  /**
   * Create user account
   */
  async createAccount(req, res) {
    try {
      const { userId, email } = req.body;

      // Validate required fields
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId is required'
        });
      }

      // Check if account already exists
      const existingAccount = accountService.getCustodialAccount(userId);
      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message: 'Account already exists for this user'
        });
      }

      console.log(`Creating account for user: ${userId}`);
      const accountInfo = await accountService.createCustodialAccount(userId);

      // Associate mock tokens with the new account
      try {
        const tokenIds = tokenService.getTokenIds();
        
        // Convert string private key back to PrivateKey object
        const privateKeyObject = PrivateKey.fromString(accountInfo.privateKey);
        
        if (tokenIds.USDC) {
          console.log(`Associating USDC token with account ${accountInfo.accountId}`);
          await tokenService.associateTokenWithAccount(
            accountInfo.accountId,
            tokenIds.USDC,
            privateKeyObject
          );
        }
        
        if (tokenIds.USDT) {
          console.log(`Associating USDT token with account ${accountInfo.accountId}`);
          await tokenService.associateTokenWithAccount(
            accountInfo.accountId,
            tokenIds.USDT,
            privateKeyObject
          );
        }
      } catch (tokenError) {
        console.warn('Token association failed, but account created:', tokenError.message);
        // Continue anyway - account is created, just tokens not associated
      }

      res.json({
        success: true,
        data: {
          userId: accountInfo.userId,
          accountId: accountInfo.accountId,
          createdAt: accountInfo.createdAt
        },
        message: 'Account created successfully'
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
   * Get account balance
   */
  async getBalance(req, res) {
    try {
      const { userId } = req.params;

      const userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      console.log(`Getting balance for account: ${userAccount.accountId}`);
      const balance = await accountService.getAccountBalance(userAccount.accountId);

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
   * Get transaction history
   */
  async getTransactionHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 50, order = 'desc' } = req.query;

      const userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      console.log(`Getting transaction history for account: ${userAccount.accountId}`);
      const history = await mirrorNodeService.getTransactionHistory(
        userAccount.accountId,
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
   * Get account info
   */
  async getAccountInfo(req, res) {
    try {
      const { userId } = req.params;

      const userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      // Get balance
      let balance;
      try {
        balance = await accountService.getAccountBalance(userAccount.accountId);
      } catch (balanceError) {
        console.warn('Could not fetch balance:', balanceError.message);
        balance = { hbar: '0 ℏ', tokens: {} };
      }

      res.json({
        success: true,
        data: {
          userId: userAccount.userId,
          accountId: userAccount.accountId,
          createdAt: userAccount.createdAt,
          balance
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
   * List all custodial accounts (for debugging)
   */
  async listAllAccounts(req, res) {
    try {
      const accounts = accountService.getAllCustodialAccounts();
      
      // Remove private keys from response for security
      const safeAccounts = accounts.map(account => ({
        userId: account.userId,
        accountId: account.accountId,
        createdAt: account.createdAt
      }));

      res.json({
        success: true,
        data: {
          count: safeAccounts.length,
          accounts: safeAccounts
        }
      });

    } catch (error) {
      console.error('Error listing accounts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list accounts',
        error: error.message
      });
    }
  }

  /**
   * Delete account (for testing)
   */
  async deleteAccount(req, res) {
    try {
      const { userId } = req.params;

      const userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      // Note: This only removes from memory, not from Hedera network
      // In production, you'd want proper account management
      accountService.custodialAccounts.delete(userId);

      res.json({
        success: true,
        message: 'Account removed from custodial storage'
      });

    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account',
        error: error.message
      });
    }
  }
}

module.exports = new AccountController();