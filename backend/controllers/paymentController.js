const paymentService = require('../services/paymentService');
const accountService = require('../services/accountService');

class PaymentController {
  /**
   * Generate QR code for payment
   */
  async generateQRCode(req, res) {
    try {
      const { merchantId, merchantAccountId, merchantWallet, amount, tokenType = 'HBAR' } = req.body;

      let finalMerchantWallet = merchantWallet;

      // If merchantId or merchantAccountId is provided, look up custodial account
      const merchantUserId = merchantId || merchantAccountId;
      if (merchantUserId && !merchantWallet) {
        const merchantAccount = accountService.getCustodialAccount(merchantUserId);
        if (!merchantAccount) {
          return res.status(404).json({
            success: false,
            message: `Merchant custodial account not found for merchantId: ${merchantUserId}`
          });
        }
        finalMerchantWallet = merchantAccount.accountId;
        console.log(`Using custodial account ${finalMerchantWallet} for merchant ${merchantUserId}`);
      }

      // Validate final merchant wallet address format
      if (!finalMerchantWallet || !finalMerchantWallet.match(/^0\.0\.\d+$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid merchant wallet address format. Expected format: 0.0.123456. Provide either merchantId (for custodial accounts) or merchantWallet (direct address).'
        });
      }

    
      const paymentRequest = paymentService.generatePaymentRequest(
        merchantUserId,  
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
      const { paymentData, customerWallet, customerAccountId, customerUserId, amount } = req.body;
      
      console.log('Payment request received:', { paymentData, customerWallet, customerAccountId, customerUserId, amount });

      // Validate payment data format
      if (!paymentData || typeof paymentData !== 'string' || paymentData.length < 20) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment request format'
        });
      }

      // Prioritize customerUserId for custodial accounts (Hedera best practice)
      let finalCustomerUserId = customerUserId || customerAccountId;
      console.log('Using customer identifier:', finalCustomerUserId);

      // Validate customer identifier
      if (!finalCustomerUserId) {
        return res.status(400).json({
          success: false,
          message: 'Customer userId is required for custodial account payments'
        });
      }

      // Validate custodial account exists
      const customerAccount = accountService.getCustodialAccount(finalCustomerUserId);
      if (!customerAccount) {
        return res.status(400).json({
          success: false,
          message: 'Customer custodial account not found'
        });
      }
      console.log('Customer custodial account found:', customerAccount.accountId);
      
      console.log('Processing payment with nonce:', paymentData, 'from customer:', finalCustomerUserId);

      // Process payment using payment service
      const result = await paymentService.processPayment(paymentData, finalCustomerUserId, amount);
      
      console.log('Payment completed:', result);

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