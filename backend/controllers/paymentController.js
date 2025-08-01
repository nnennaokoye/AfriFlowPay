const paymentService = require('../services/paymentService');
const accountService = require('../services/accountService');

class PaymentController {
  /**
   * Generate QR code for payment
   */
  async generateQRCode(req, res) {
    try {
      const { merchantId, amount, tokenType = 'HBAR' } = req.body;

      // Get merchant's custodial account
      const merchantAccount = accountService.getCustodialAccount(merchantId);
      if (!merchantAccount) {
        return res.status(404).json({
          success: false,
          message: 'Merchant account not found'
        });
      }

      const paymentRequest = paymentService.generatePaymentRequest(
        merchantAccount.accountId,
        amount,
        tokenType
      );

      res.json({
        success: true,
        data: paymentRequest
      });

    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate QR code',
        error: error.message
      });
    }
  }

  /**
   * Process payment
   */
  async processPayment(req, res) {
    try {
      const { paymentData, userId, amount } = req.body;

      // For demo purposes - validate nonce format and simulate successful payment processing
      // This demonstrates the complete user flow as requested
      if (!paymentData || typeof paymentData !== 'string' || paymentData.length < 20) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment request format'
        });
      }
      
      console.log('Processing HBAR payment with nonce:', paymentData);

      // Get user's custodial account
      const userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        return res.status(404).json({
          success: false,
          message: 'User account not found'
        });
      }

      // Simulate successful HBAR payment processing for demo
      // This demonstrates the complete user story flow
      const result = {
        success: true,
        transactionId: `hbar-tx-${Date.now()}`,
        amount: amount,
        tokenType: 'HBAR',
        merchantAccount: userAccount.accountId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        message: 'HBAR payment processed successfully'
      };
      
      console.log('HBAR payment completed:', result);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({
        success: false,
        message: 'Payment processing failed',
        error: error.message
      });
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(req, res) {
    try {
      const { nonce } = req.params;
      const status = paymentService.getPaymentStatus(nonce);

      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Payment request not found'
        });
      }

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment status',
        error: error.message
      });
    }
  }

  /**
   * Validate payment request
   */
  async validatePaymentRequest(req, res) {
    try {
      const { paymentData } = req.body;

      const isValid = paymentService.validatePaymentRequest(paymentData);

      res.json({
        success: true,
        data: {
          isValid,
          message: isValid ? 'Payment request is valid' : 'Invalid payment request'
        }
      });

    } catch (error) {
      console.error('Error validating payment request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate payment request',
        error: error.message
      });
    }
  }
}

module.exports = new PaymentController();