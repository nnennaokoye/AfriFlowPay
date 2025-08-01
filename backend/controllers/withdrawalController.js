const accountService = require('../services/accountService');
const tokenService = require('../services/tokenService');
const crypto = require('crypto');

class WithdrawalController {
  constructor() {
    // In-memory storage for withdrawal requests
    this.withdrawalRequests = new Map();
  }

  /**
   * Request withdrawal (mock implementation as per user story)
   */
  async requestWithdrawal(req, res) {
    try {
      const { userId, amount, token = 'HBAR', destinationAddress } = req.body;

      // Validate required fields
      if (!userId || !amount || !destinationAddress) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: userId, amount, destinationAddress'
        });
      }

      // Validate destination address format
      if (!destinationAddress.match(/^0\.0\.\d+$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid destination address format. Expected format: 0.0.123456'
        });
      }

      // Get user account
      const userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        return res.status(404).json({
          success: false,
          message: 'User account not found'
        });
      }

      // Check balance (simplified check for demo)
      // In production, this would check actual balance
      // For now, we'll simulate a successful balance check
      console.log(`Checking balance for user: ${userId}`);
      
      // Mock balance check - assume user has sufficient funds for demo
      const mockBalance = {
        success: true,
        balance: { HBAR: 100, USDC: 50 } // Mock sufficient balance
      };
      
      if (!mockBalance.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to check account balance'
        });
      }

      // Generate withdrawal ID
      const withdrawalId = crypto.randomBytes(16).toString('hex');

      // Create withdrawal request (mock - in production this would interact with external services)
      const withdrawalRequest = {
        withdrawalId,
        userId,
        amount: parseFloat(amount),
        token,
        destinationAddress,
        status: 'pending',
        requestedAt: new Date(),
        // Mock response as per user story
        mockResponse: {
          status: 'success',
          amount: parseFloat(amount),
          token: token,
          message: 'In a live version, this would transfer to the specified wallet'
        }
      };

      // Store withdrawal request
      this.withdrawalRequests.set(withdrawalId, withdrawalRequest);

      // Mock immediate success for demo purposes
      setTimeout(() => {
        const request = this.withdrawalRequests.get(withdrawalId);
        if (request) {
          request.status = 'completed';
          request.completedAt = new Date();
        }
      }, 1000); // Complete after 1 second

      console.log(`Withdrawal requested: ${withdrawalId} for user ${userId}`);

      res.json({
        success: true,
        data: {
          withdrawalId,
          status: 'pending',
          amount: parseFloat(amount),
          token,
          destinationAddress,
          message: 'Withdrawal requested! In a live version, this would transfer to your wallet.',
          mockResponse: withdrawalRequest.mockResponse
        }
      });

    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to request withdrawal',
        error: error.message
      });
    }
  }

  /**
   * Get withdrawal history for user
   */
  async getWithdrawalHistory(req, res) {
    try {
      const { userId } = req.params;

      // Get all withdrawals for user
      const userWithdrawals = [];
      for (const [withdrawalId, request] of this.withdrawalRequests.entries()) {
        if (request.userId === userId) {
          userWithdrawals.push({
            withdrawalId,
            amount: request.amount,
            token: request.token,
            destinationAddress: request.destinationAddress,
            status: request.status,
            requestedAt: request.requestedAt,
            completedAt: request.completedAt
          });
        }
      }

      // Sort by most recent first
      userWithdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

      res.json({
        success: true,
        data: {
          userId,
          withdrawals: userWithdrawals,
          total: userWithdrawals.length
        }
      });

    } catch (error) {
      console.error('Error getting withdrawal history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get withdrawal history',
        error: error.message
      });
    }
  }

  /**
   * Get withdrawal status
   */
  async getWithdrawalStatus(req, res) {
    try {
      const { withdrawalId } = req.params;

      const withdrawalRequest = this.withdrawalRequests.get(withdrawalId);
      
      if (!withdrawalRequest) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal request not found'
        });
      }

      res.json({
        success: true,
        data: {
          withdrawalId,
          status: withdrawalRequest.status,
          amount: withdrawalRequest.amount,
          token: withdrawalRequest.token,
          destinationAddress: withdrawalRequest.destinationAddress,
          requestedAt: withdrawalRequest.requestedAt,
          completedAt: withdrawalRequest.completedAt,
          mockResponse: withdrawalRequest.mockResponse
        }
      });

    } catch (error) {
      console.error('Error getting withdrawal status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get withdrawal status',
        error: error.message
      });
    }
  }
}

module.exports = new WithdrawalController();
