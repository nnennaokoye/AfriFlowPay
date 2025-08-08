const accountService = require('../services/accountService');
const logger = require('../utils/logger');
const ValidationUtils = require('../utils/validation');
const ResponseUtils = require('../utils/response');
const crypto = require('crypto');

class DirectDepositController {
  constructor() {
    this.depositRequests = new Map(); 
  
    this.initiateDeposit = this.initiateDeposit.bind(this);
    this.getDepositStatus = this.getDepositStatus.bind(this);
    this.getDepositHistory = this.getDepositHistory.bind(this);
    this.completeDeposit = this.completeDeposit.bind(this);
  }

  /**
   * Initiate direct deposit funding
   */
  async initiateDeposit(req, res) {
    try {
      const { userId, amount, tokenType = 'HBAR', bankDetails } = req.body;

      // Validate required fields
      const validationErrors = [];
      if (!userId) validationErrors.push('userId is required');
      if (!amount) validationErrors.push('amount is required');
      if (!bankDetails) validationErrors.push('bankDetails is required');
      
      if (validationErrors.length > 0) {
        return ResponseUtils.validationError(res, validationErrors);
      }

      // Validate userId format
      if (!ValidationUtils.isValidUserId(userId)) {
        return ResponseUtils.validationError(res, ['Invalid userId format']);
      }

      // Validate amount
      const depositAmount = parseFloat(amount);
      if (isNaN(depositAmount) || depositAmount <= 0) {
        return ResponseUtils.validationError(res, ['Amount must be a positive number']);
      }

      // Get or create user's custodial account
      let userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        try {
          userAccount = await accountService.createCustodialAccount(userId);
          logger.info(`Created custodial account for direct deposit: ${userId}`);
        } catch (error) {
          logger.error('Error creating custodial account for direct deposit:', error);
          return ResponseUtils.error(res, 'Failed to create user account', 500, error.message);
        }
      }

      // Generate deposit ID
      const depositId = crypto.randomBytes(16).toString('hex');

      // For demo purposes, simulate direct deposit processing
      const depositRequest = {
        id: depositId,
        userId,
        amount: depositAmount,
        tokenType,
        bankDetails: {
          accountNumber: bankDetails.accountNumber,
          routingNumber: bankDetails.routingNumber,
          accountType: bankDetails.accountType || 'checking'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days
      };

      // Store deposit request
      this.depositRequests.set(depositId, depositRequest);
      logger.info(`Direct deposit initiated: ${depositId} for user ${userId}`);

      return ResponseUtils.success(res, {
        depositId: depositRequest.id,
        status: depositRequest.status,
        amount: depositRequest.amount,
        tokenType: depositRequest.tokenType,
        estimatedCompletion: depositRequest.estimatedCompletion,
        message: 'Direct deposit initiated successfully'
      }, 'Direct deposit initiated successfully', 201);

    } catch (error) {
      logger.error('Error initiating direct deposit:', error);
      return ResponseUtils.error(res, 'Failed to initiate direct deposit', 500, error.message);
    }
  }

  /**
   * Get deposit status
   */
  async getDepositStatus(req, res) {
    try {
      const { depositId } = req.params;

      if (!depositId) {
        return ResponseUtils.validationError(res, ['Deposit ID is required']);
      }

      logger.info(`Retrieving deposit status: ${depositId}`);
      const depositRequest = this.depositRequests.get(depositId);
      if (!depositRequest) {
        logger.warn(`Deposit request not found: ${depositId}`);
        return ResponseUtils.notFound(res, 'Deposit request');
      }

      // For demo purposes, simulate status progression
      const now = new Date();
      const createdAt = new Date(depositRequest.createdAt);
      const timeDiff = now - createdAt;
      const oneHour = 60 * 60 * 1000;

      if (timeDiff > oneHour && depositRequest.status === 'pending') {
        depositRequest.status = 'processing';
        depositRequest.updatedAt = now.toISOString();
        logger.info(`Deposit status updated to processing: ${depositId}`);
      }

      return ResponseUtils.success(res, depositRequest, 'Deposit status retrieved successfully');

    } catch (error) {
      logger.error('Error getting deposit status:', error);
      return ResponseUtils.error(res, 'Failed to get deposit status', 500, error.message);
    }
  }

  /**
   * Get user's deposit history
   */
  async getDepositHistory(req, res) {
    try {
      const { userId } = req.params;

      // Validate userId
      if (!ValidationUtils.isValidUserId(userId)) {
        return ResponseUtils.validationError(res, ['Invalid userId format']);
      }

      logger.info(`Retrieving deposit history for user: ${userId}`);

      const userDeposits = Array.from(this.depositRequests.values())
        .filter(deposit => deposit.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return ResponseUtils.success(res, {
        userId,
        deposits: userDeposits,
        total: userDeposits.length
      }, 'Deposit history retrieved successfully');

    } catch (error) {
      logger.error('Error getting deposit history:', error);
      return ResponseUtils.error(res, 'Failed to get deposit history', 500, error.message);
    }
  }

  /**
   * Simulate deposit completion (for demo purposes)
   */
  async completeDeposit(req, res) {
    try {
      const { depositId } = req.params;

      if (!depositId) {
        return ResponseUtils.validationError(res, ['Deposit ID is required']);
      }

      logger.info(`Completing deposit: ${depositId}`);
      const depositRequest = this.depositRequests.get(depositId);
      if (!depositRequest) {
        logger.warn(`Deposit request not found for completion: ${depositId}`);
        return ResponseUtils.notFound(res, 'Deposit request');
      }

      // Update deposit status
      depositRequest.status = 'completed';
      depositRequest.completedAt = new Date().toISOString();
      depositRequest.transactionId = `hbar-deposit-${Date.now()}`;

      logger.info(`Direct deposit completed: ${depositId}`, { transactionId: depositRequest.transactionId });

      return ResponseUtils.success(res, depositRequest, 'Direct deposit completed successfully');

    } catch (error) {
      logger.error('Error completing deposit:', error);
      return ResponseUtils.error(res, 'Failed to complete deposit', 500, error.message);
    }
  }
}

module.exports = new DirectDepositController();
