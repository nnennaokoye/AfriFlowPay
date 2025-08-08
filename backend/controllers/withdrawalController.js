const accountService = require('../services/accountService');
const tokenService = require('../services/tokenService');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ValidationUtils = require('../utils/validation');
const ResponseUtils = require('../utils/response');
const rateLimiters = require('../middleware/rateLimiting'); 

class WithdrawalController {
  constructor() {
    try {
      this.withdrawalRequests = new Map();
      this.initializeTestData();
      
      // Proper method binding
      this.requestWithdrawal = this.requestWithdrawal.bind(this);
      this.getWithdrawalHistory = this.getWithdrawalHistory.bind(this);
      this.getWithdrawalStatus = this.getWithdrawalStatus.bind(this);
      
      logger.info('WithdrawalController initialized successfully');
    } catch (error) {
      logger.error('WithdrawalController initialization failed:', error);
      throw error; 
    }
  }

  initializeTestData() {
    const testWithdrawal = {
      withdrawalId: 'test_withdrawal_123',
      userId: 'test_customer',
      amount: 10,
      token: 'HBAR',
      destinationAddress: '0.0.123456',
      status: 'completed',
      requestedAt: new Date(Date.now() - 86400000), 
      completedAt: new Date(),
      mockResponse: {
        status: 'success',
        message: 'Test withdrawal'
      }
    };
    this.withdrawalRequests.set(testWithdrawal.withdrawalId, testWithdrawal);
  }

  /**
   * Request withdrawal with rate limiting and enhanced validation
   */
  async requestWithdrawal(req, res, next) {
    try {
      const { userId, amount, token = 'HBAR', destinationAddress } = req.body;

      // Enhanced validation using your ValidationUtils
      const validationErrors = this.validateWithdrawalRequest(req.body);
      if (validationErrors.length > 0) {
        return ResponseUtils.validationError(res, validationErrors);
      }

      // Get user account with proper error handling
      const userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        logger.warn(`User account not found for withdrawal: ${userId}`);
        return ResponseUtils.notFound(res, 'User account');
      }

      // Balance check 
      try {
        const currentBalance = await accountService.getBalance(userId);
        if (token === 'HBAR' && parseFloat(currentBalance.hbar) < parseFloat(amount)) {
          return ResponseUtils.validationError(res, [
            `Insufficient HBAR balance. Available: ${currentBalance.hbar}, Requested: ${amount}`
          ]);
        }
      } catch (balErr) {
        logger.warn('Could not verify balance before withdrawal:', balErr.message || balErr);
      }

      // Generate withdrawal ID
      const withdrawalId = crypto.randomBytes(16).toString('hex');

      // Create withdrawal request
      const withdrawalRequest = {
        withdrawalId,
        userId,
        amount: parseFloat(amount),
        token,
        destinationAddress,
        status: 'pending',
        requestedAt: new Date(),
        mockResponse: {
          status: 'success',
          message: 'In a live version, this would transfer to the specified wallet'
        }
      };

      // Store withdrawal request
      this.withdrawalRequests.set(withdrawalId, withdrawalRequest);
      logger.info(`Withdrawal request created: ${withdrawalId}`);

      // Process real withdrawal transaction
      this.processRealWithdrawal(withdrawalId, userAccount, withdrawalRequest)
        .catch(error => {
          logger.error(`Withdrawal processing failed for ${withdrawalId}:`, error);
          const request = this.withdrawalRequests.get(withdrawalId);
          if (request) {
            request.status = 'failed';
            request.error = error.message;
            request.completedAt = new Date();
          }
        });

      return ResponseUtils.success(res, {
        withdrawalId,
        status: 'pending',
        amount: withdrawalRequest.amount,
        token,
        destinationAddress,
        message: 'Withdrawal requested successfully'
      }, 'Withdrawal requested', 201);
    } catch (error) {
      logger.error('Withdrawal processing error:', error);
      return ResponseUtils.error(res, 'Withdrawal processing failed', 500, error.message);
    }
  }

  /**
   * Process real withdrawal transaction on Hedera network
   */
  async processRealWithdrawal(withdrawalId, userAccount, withdrawalRequest) {
    try {
      logger.info(`Processing real withdrawal: ${withdrawalId}`);
      
      const { amount, token, destinationAddress } = withdrawalRequest;
      
      // For now, only support HBAR withdrawals
      if (token !== 'HBAR') {
        throw new Error(`Token ${token} withdrawals not yet supported`);
      }
      
      
      logger.info(`Executing HBAR transfer from user ${userAccount.accountId} to ${destinationAddress}: ${amount} HBAR`);
      // Double-check latest balance just before transfer to prevent race conditions
      try {
        const latest = await accountService.getBalance(userAccount.userId || withdrawalRequest.userId);
        if (token === 'HBAR' && parseFloat(latest.hbar) < parseFloat(amount)) {
          const reqRef = this.withdrawalRequests.get(withdrawalId);
          if (reqRef) {
            reqRef.status = 'failed';
            reqRef.error = 'Insufficient balance at execution time';
            reqRef.completedAt = new Date();
          }
          throw new Error('Insufficient balance at execution time');
        }
      } catch (e) {
        if (e.message?.includes('Insufficient balance at execution time')) throw e;
        logger.warn('Balance recheck failed; proceeding with best-effort:', e.message || e);
      }

      const transferResult = await accountService.transferHbar(
        userAccount.accountId,
        destinationAddress,
        amount,
        userAccount.privateKey
      );
      const transactionId = transferResult.transactionId;
      logger.info(`Withdrawal transaction successful: ${transactionId}`);
      
      // Update withdrawal request with success
      const request = this.withdrawalRequests.get(withdrawalId);
      if (request) {
        request.status = 'completed';
        request.completedAt = new Date();
        request.transactionId = transactionId;
        request.transactionHash = transactionId;
        request.networkFee = 0;
        request.mockResponse = {
          status: 'success',
          message: `Successfully transferred ${amount} HBAR to ${destinationAddress}`,
          transactionId,
          networkUrl: `https://hashscan.io/testnet/transaction/${transactionId}`
        };
      }
      
      logger.info(`Real withdrawal completed successfully: ${withdrawalId}`);
      
    } catch (error) {
      logger.error(`Real withdrawal failed for ${withdrawalId}:`, error);
      
      // Update withdrawal request with failure
      const request = this.withdrawalRequests.get(withdrawalId);
      if (request) {
        request.status = 'failed';
        request.error = error.message;
        request.completedAt = new Date();
        request.mockResponse = {
          status: 'error',
          message: `Withdrawal failed: ${error.message}`
        };
      }
      
      throw error;
    }
  }

  /**
   * Enhanced validation method using your ValidationUtils
   */
  validateWithdrawalRequest(body) {
    const errors = [];
    
    if (!ValidationUtils.isValidUserId(body.userId)) {
      errors.push('Invalid userId format');
    }
    
    if (!body.amount || isNaN(parseFloat(body.amount)) || parseFloat(body.amount) <= 0) {
      errors.push('Amount must be a positive number');
    }
    
    if (!ValidationUtils.isValidTokenType(body.token)) {
      errors.push(`Invalid token type. Valid types: HBAR, USDC, USDT`);
    }
    
    if (!ValidationUtils.isValidAccountId(body.destinationAddress)) {
      errors.push('Invalid destination address format. Expected format: 0.0.123456');
    }
    
    return errors;
  }

  /**
   * Get withdrawal history with validation
   */
  async getWithdrawalHistory(req, res) {
    try {
      const { userId } = req.params;

      if (!ValidationUtils.isValidUserId(userId)) {
        return ResponseUtils.validationError(res, ['Invalid userId format']);
      }

      // Get all withdrawals for user
      const userWithdrawals = Array.from(this.withdrawalRequests.values())
        .filter(request => request.userId === userId)
        .map(request => ({
          withdrawalId: request.withdrawalId,
          amount: request.amount,
          token: request.token,
          destinationAddress: request.destinationAddress,
          status: request.status,
          requestedAt: request.requestedAt,
          completedAt: request.completedAt
        }))
        .sort((a, b) => b.requestedAt - a.requestedAt);

      return ResponseUtils.success(res, {
        userId,
        withdrawals: userWithdrawals,
        total: userWithdrawals.length
      }, 'Withdrawal history retrieved');
    } catch (error) {
      logger.error('History retrieval error:', error);
      return ResponseUtils.error(res, 'Failed to get history', 500, error.message);
    }
  }

  /**
   * Get withdrawal status with validation
   */
  async getWithdrawalStatus(req, res) {
    try {
      const { withdrawalId } = req.params;

      if (!withdrawalId) {
        return ResponseUtils.validationError(res, ['Withdrawal ID is required']);
      }

      const withdrawalRequest = this.withdrawalRequests.get(withdrawalId);
      
      if (!withdrawalRequest) {
        return ResponseUtils.notFound(res, 'Withdrawal request');
      }

      return ResponseUtils.success(res, {
        withdrawalId,
        status: withdrawalRequest.status,
        amount: withdrawalRequest.amount,
        token: withdrawalRequest.token,
        destinationAddress: withdrawalRequest.destinationAddress,
        requestedAt: withdrawalRequest.requestedAt,
        completedAt: withdrawalRequest.completedAt
      }, 'Withdrawal status retrieved');
    } catch (error) {
      logger.error('Status retrieval error:', error);
      return ResponseUtils.error(res, 'Failed to get status', 500, error.message);
    }
  }
}


const withdrawalController = new WithdrawalController();
module.exports = withdrawalController;