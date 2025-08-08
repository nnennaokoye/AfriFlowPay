const accountService = require('../services/accountService');
const mirrorNodeService = require('../services/mirrorNodeService');
const logger = require('../utils/logger');
const ValidationUtils = require('../utils/validation');
const ResponseUtils = require('../utils/response');

class AccountController {
  /**
   * Create a new custodial account
   */
  async createAccount(req, res) {
    try {
      const { userId } = req.body;
      
      // Validate or generate userId
      let userIdToUse;
      if (userId) {
        if (!ValidationUtils.isValidUserId(userId)) {
          return ResponseUtils.validationError(res, ['Invalid userId format']);
        }
        userIdToUse = ValidationUtils.sanitizeInput(userId);
      } else {
        userIdToUse = `user_${Date.now()}`; // Generate userId if not provided
      }
      
      // Check if account already exists
      const existingAccount = accountService.getCustodialAccount(userIdToUse);
      if (existingAccount) {
        logger.warn(`Custodial account already exists for user: ${userIdToUse}`);
        return ResponseUtils.error(res, 'Account already exists for this user', 409);
      }
      
      logger.info(`Creating new custodial account for user: ${userIdToUse}`);
      const account = await accountService.createCustodialAccount(userIdToUse);
      
      logger.info(`Created custodial account: ${account.accountId} for user: ${userIdToUse}`);
      
      return ResponseUtils.success(res, {
        userId: userIdToUse,
        accountId: account.accountId,
        createdAt: account.createdAt,
        initialBalance: "1 HBAR", // Initial balance from account creation
        network: "Hedera Testnet"
      }, "Custodial account created successfully", 201);
      
    } catch (error) {
      logger.error('Error creating account:', error);
      return ResponseUtils.error(res, 'Failed to create account', 500, error.message);
    }
  }

  /**
   * Get account balance for wallet address
   */
  async getBalance(req, res) {
    try {
      const { walletAddress } = req.params;

      // Validate wallet address format
      if (!ValidationUtils.isValidAccountId(walletAddress)) {
        return ResponseUtils.validationError(res, ['Invalid wallet address format. Expected format: 0.0.123456']);
      }

      logger.info(`Getting balance for wallet: ${walletAddress}`);
      const balance = await accountService.getAccountBalance(walletAddress);

      if (!balance) {
        logger.warn(`No balance data found for wallet: ${walletAddress}`);
        return ResponseUtils.notFound(res, 'Account balance');
      }

      logger.info(`Balance retrieved successfully for wallet: ${walletAddress}`);
      return ResponseUtils.success(res, balance, 'Balance retrieved successfully');

    } catch (error) {
      logger.error('Error getting balance:', error);
      return ResponseUtils.error(res, 'Failed to get balance', 500, error.message);
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
      if (!ValidationUtils.isValidAccountId(walletAddress)) {
        return ResponseUtils.validationError(res, ['Invalid wallet address format. Expected format: 0.0.123456']);
      }

      // Validate query parameters
      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return ResponseUtils.validationError(res, ['Limit must be between 1 and 100']);
      }

      if (!['asc', 'desc'].includes(order.toLowerCase())) {
        return ResponseUtils.validationError(res, ['Order must be either "asc" or "desc"']);
      }

      logger.info(`Getting transaction history for wallet: ${walletAddress}, limit: ${parsedLimit}, order: ${order}`);
      const history = await mirrorNodeService.getTransactionHistory(
        walletAddress,
        parsedLimit,
        order.toLowerCase()
      );

      if (!history || (Array.isArray(history) && history.length === 0)) {
        logger.info(`No transaction history found for wallet: ${walletAddress}`);
        return ResponseUtils.success(res, [], 'No transactions found for this wallet');
      }

      logger.info(`Retrieved ${Array.isArray(history) ? history.length : 'transaction'} history for wallet: ${walletAddress}`);
      return ResponseUtils.success(res, history, 'Transaction history retrieved successfully');

    } catch (error) {
      logger.error('Error getting transaction history:', error);
      return ResponseUtils.error(res, 'Failed to get transaction history', 500, error.message);
    }
  }

  /**
   * Debug: List all custodial accounts (for development/testing only)
   */
  async listCustodialAccounts(req, res) {
    try {
      // Security check: Only allow in development environment
      if (process.env.NODE_ENV === 'production') {
        logger.warn('Attempted to access debug endpoint in production');
        return ResponseUtils.forbidden(res, 'Debug endpoints not available in production');
      }

      logger.info('Listing all custodial accounts (debug endpoint)');
      const accounts = accountService.getAllCustodialAccounts();
      
      // SECURE: Filter out any sensitive data
      const safeAccounts = {};
      Object.keys(accounts).forEach(userId => {
        const account = accounts[userId];
        safeAccounts[userId] = {
          userId: account.userId || userId,
          accountId: account.accountId,
          createdAt: account.createdAt,
          network: "Hedera Testnet"
        };
      });
      
      logger.info(`Listed ${Object.keys(safeAccounts).length} custodial accounts`);
      return ResponseUtils.success(res, {
        accounts: safeAccounts,
        count: Object.keys(safeAccounts).length,
        network: "Hedera Testnet"
      }, 'Custodial accounts retrieved successfully');
      
    } catch (error) {
      logger.error('Error listing custodial accounts:', error);
      return ResponseUtils.error(res, 'Failed to list custodial accounts', 500, error.message);
    }
  }

  /**
   * Get custodial account balance by userId
   */
  async getCustodialBalance(req, res) {
    try {
      const { userId } = req.params;
      
      // Validate userId
      if (!ValidationUtils.isValidUserId(userId)) {
        return ResponseUtils.validationError(res, ['Invalid userId format']);
      }
      
      logger.info(`Getting custodial account balance for userId: ${userId}`);
      const custodialAccount = accountService.getCustodialAccount(userId);
      if (!custodialAccount) {
        logger.warn(`Custodial account not found for userId: ${userId}`);
        return ResponseUtils.notFound(res, 'Custodial account');
      }
      
      const balance = await accountService.getBalance(userId);
      
      if (!balance) {
        logger.warn(`No balance data found for custodial account: ${userId}`);
        return ResponseUtils.notFound(res, 'Balance data');
      }
      
      logger.info(`Retrieved balance for custodial account: ${userId}`);
      return ResponseUtils.success(res, {
        userId,
        accountId: custodialAccount.accountId,
        balance,
        timestamp: new Date().toISOString(),
        network: "Hedera Testnet"
      }, 'Custodial account balance retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting custodial balance:', error);
      return ResponseUtils.error(res, 'Failed to get custodial account balance', 500, error.message);
    }
  }

  /**
   * Get custodial account transaction history by userId
   */
  async getCustodialTransactionHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 50, order = 'desc' } = req.query;
      
      // Validate userId
      if (!ValidationUtils.isValidUserId(userId)) {
        return ResponseUtils.validationError(res, ['Invalid userId format']);
      }

      const custodialAccount = accountService.getCustodialAccount(userId);
      if (!custodialAccount) {
        logger.warn(`Custodial account not found for userId: ${userId}`);
        return ResponseUtils.notFound(res, 'Custodial account');
      }
      
      // Validate query parameters
      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return ResponseUtils.validationError(res, ['Limit must be between 1 and 100']);
      }

      if (!['asc', 'desc'].includes(order.toLowerCase())) {
        return ResponseUtils.validationError(res, ['Order must be either "asc" or "desc"']);
      }
      
      logger.info(`Getting transaction history for custodial account: ${custodialAccount.accountId}`);
      const history = await mirrorNodeService.getTransactionHistory(
        custodialAccount.accountId,
        parsedLimit,
        order.toLowerCase()
      );
      
      if (!history || (Array.isArray(history) && history.length === 0)) {
        logger.info(`No transaction history found for custodial account: ${userId}`);
        return ResponseUtils.success(res, {
          userId,
          accountId: custodialAccount.accountId,
          transactions: [],
          pagination: {
            limit: parsedLimit,
            order: order.toLowerCase(),
            count: 0
          }
        }, 'No transactions found for this custodial account');
      }
      
      logger.info(`Retrieved ${Array.isArray(history) ? history.length : 'transaction'} history for custodial account: ${userId}`);
      return ResponseUtils.success(res, {
        userId,
        accountId: custodialAccount.accountId,
        transactions: history,
        pagination: {
          limit: parsedLimit,
          order: order.toLowerCase(),
          count: Array.isArray(history) ? history.length : 1
        }
      }, 'Transaction history retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting custodial transaction history:', error);
      return ResponseUtils.error(res, 'Failed to get custodial account transaction history', 500, error.message);
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

  

  // ========== PASSWORD-ONLY AUTHENTICATION ENDPOINTS ==========

  /**
   * Create account with password-only authentication
   */
  async createAccountWithPassword(req, res) {
    try {
      const { password, accountType } = req.body;
      
      // Validate input
      if (!password || typeof password !== 'string' || password.length < 6) {
        return ResponseUtils.validationError(res, ['Password must be at least 6 characters long']);
      }
      
      if (!accountType || !['customer', 'merchant'].includes(accountType)) {
        return ResponseUtils.validationError(res, ['Account type must be either "customer" or "merchant"']);
      }
      
      // Check if password already exists for this account type
      if (accountService.passwordExists(password, accountType)) {
        return ResponseUtils.error(res, 'An account with this password already exists for this account type', 409);
      }
      
      logger.info(`Creating account with password authentication - Type: ${accountType}`);
      const accountData = await accountService.createAccountWithPassword(password, accountType);
      
      logger.info(`Account created successfully - UserId: ${accountData.userId}, Type: ${accountType}`);
      return ResponseUtils.success(res, {
        userId: accountData.userId,
        accountId: accountData.accountId,
        accountType: accountData.accountType,
        network: "Hedera Testnet"
      }, 'Account created successfully');
      
    } catch (error) {
      logger.error('Error creating account with password:', error);
      return ResponseUtils.error(res, 'Failed to create account', 500, error.message);
    }
  }

  /**
   * Login with password-only authentication
   */
  async loginWithPassword(req, res) {
    try {
      const { password, accountType } = req.body;
      
      // Validate input
      if (!password || typeof password !== 'string') {
        return ResponseUtils.validationError(res, ['Password is required']);
      }
      
      if (!accountType || !['customer', 'merchant'].includes(accountType)) {
        return ResponseUtils.validationError(res, ['Account type must be either "customer" or "merchant"']);
      }
      
      logger.info(`Login attempt - Type: ${accountType}`);
      const accountData = await accountService.loginWithPassword(password, accountType);
      
      // Get the current balance after successful login
      let currentBalance;
      try {
        // Use the correct method name: getBalance (not getCustodialBalance)
        currentBalance = await accountService.getBalance(accountData.userId);
      } catch (balanceError) {
        logger.warn('Could not fetch balance during login:', balanceError.message);
        // Fallback to default balance if balance fetch fails
        currentBalance = { hbar: 0, tokens: [] };
      }
      
      logger.info(`Login successful - UserId: ${accountData.userId}, Type: ${accountType}`);
      return ResponseUtils.success(res, {
        userId: accountData.userId,
        accountId: accountData.accountId,
        accountType: accountData.accountType,
        balances: currentBalance, // Use the fetched balance
        network: "Hedera Testnet"
      }, 'Login successful');
      
    } catch (error) {
      logger.error('Error logging in with password:', error);
      
      // Return generic error message for security
      if (error.message.includes('Invalid password') || error.message.includes('not found')) {
        return ResponseUtils.error(res, 'Invalid password or account type', 401);
      }
      
      return ResponseUtils.error(res, 'Login failed', 500, error.message);
    }
  }
}

module.exports = new AccountController();