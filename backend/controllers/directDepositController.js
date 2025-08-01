const accountService = require('../services/accountService');

class DirectDepositController {
  /**
   * Initiate direct deposit funding
   */
  async initiateDeposit(req, res) {
    try {
      const { userId, amount, tokenType = 'HBAR', bankDetails } = req.body;

      // Validate required fields
      if (!userId || !amount || !bankDetails) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: userId, amount, bankDetails'
        });
      }

      // Validate amount
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than 0'
        });
      }

      // Get or create user's custodial account
      let userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        userAccount = await accountService.createCustodialAccount(userId);
      }

      // For demo purposes, simulate direct deposit processing
      const depositRequest = {
        id: `deposit-${Date.now()}`,
        userId,
        amount,
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

      // Store deposit request (in-memory for demo)
      if (!global.depositRequests) {
        global.depositRequests = new Map();
      }
      global.depositRequests.set(depositRequest.id, depositRequest);

      console.log('Direct deposit initiated:', depositRequest);

      res.json({
        success: true,
        data: {
          depositId: depositRequest.id,
          status: depositRequest.status,
          amount: depositRequest.amount,
          tokenType: depositRequest.tokenType,
          estimatedCompletion: depositRequest.estimatedCompletion,
          message: 'Direct deposit initiated successfully'
        }
      });

    } catch (error) {
      console.error('Error initiating direct deposit:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get deposit status
   */
  async getDepositStatus(req, res) {
    try {
      const { depositId } = req.params;

      if (!global.depositRequests) {
        return res.status(404).json({
          success: false,
          message: 'Deposit request not found'
        });
      }

      const depositRequest = global.depositRequests.get(depositId);
      if (!depositRequest) {
        return res.status(404).json({
          success: false,
          message: 'Deposit request not found'
        });
      }

      // For demo purposes, simulate status progression
      const now = new Date();
      const createdAt = new Date(depositRequest.createdAt);
      const timeDiff = now - createdAt;
      const oneHour = 60 * 60 * 1000;

      if (timeDiff > oneHour && depositRequest.status === 'pending') {
        depositRequest.status = 'processing';
        depositRequest.updatedAt = now.toISOString();
      }

      res.json({
        success: true,
        data: depositRequest
      });

    } catch (error) {
      console.error('Error getting deposit status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user's deposit history
   */
  async getDepositHistory(req, res) {
    try {
      const { userId } = req.params;

      if (!global.depositRequests) {
        return res.json({
          success: true,
          data: []
        });
      }

      const userDeposits = Array.from(global.depositRequests.values())
        .filter(deposit => deposit.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({
        success: true,
        data: userDeposits,
        message: 'Deposit history retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting deposit history:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Simulate deposit completion (for demo purposes)
   */
  async completeDeposit(req, res) {
    try {
      const { depositId } = req.params;

      if (!global.depositRequests) {
        return res.status(404).json({
          success: false,
          message: 'Deposit request not found'
        });
      }

      const depositRequest = global.depositRequests.get(depositId);
      if (!depositRequest) {
        return res.status(404).json({
          success: false,
          message: 'Deposit request not found'
        });
      }

      // Update deposit status
      depositRequest.status = 'completed';
      depositRequest.completedAt = new Date().toISOString();
      depositRequest.transactionId = `hbar-deposit-${Date.now()}`;

      console.log('Direct deposit completed:', depositRequest);

      res.json({
        success: true,
        data: depositRequest,
        message: 'Direct deposit completed successfully'
      });

    } catch (error) {
      console.error('Error completing deposit:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new DirectDepositController();
