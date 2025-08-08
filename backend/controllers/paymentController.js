const paymentService = require('../services/paymentService');
const accountService = require('../services/accountService');
const logger = require('../utils/logger');
const ValidationUtils = require('../utils/validation');
const ResponseUtils = require('../utils/response');

class PaymentController {
  /**
   * Generate QR code for payment
   * POST /api/payments/generate-qr
   */
  async generateQRCode(req, res) {
    try {
      // Validate request
      const { merchantId, merchantAccountId, merchantWallet, amount, tokenType = 'HBAR' } = req.body;

      // At least one merchant identifier must be provided
      if (!merchantId && !merchantAccountId && !merchantWallet) {
        return ResponseUtils.validationError(res, ['Either merchantId, merchantAccountId, or merchantWallet must be provided']);
      }

      let finalMerchantWallet = merchantWallet;

      // If merchantId or merchantAccountId is provided, look up custodial account
      const merchantUserId = merchantId || merchantAccountId;
      if (merchantUserId && !merchantWallet) {
        const merchantAccount = accountService.getCustodialAccount(merchantUserId);
        if (!merchantAccount) {
          logger.warn(`Merchant custodial account not found for merchantId: ${merchantUserId}`);
          return ResponseUtils.notFound(res, 'Merchant custodial account');
        }
        finalMerchantWallet = merchantAccount.accountId;
        logger.info(`Using custodial account ${finalMerchantWallet} for merchant ${merchantUserId}`);
      }

      // Validate final merchant wallet address format
      if (finalMerchantWallet && !ValidationUtils.isValidAccountId(finalMerchantWallet)) {
        return ResponseUtils.validationError(res, ['Invalid merchant wallet address format. Expected format: 0.0.123456']);
      }

      // Validate token type
      if (!ValidationUtils.isValidTokenType(tokenType)) {
        return ResponseUtils.validationError(res, ['Invalid token type. Supported: HBAR, USDC, USDT']);
      }

      // Validate amount if provided
      if (amount !== null && amount !== undefined && !ValidationUtils.isValidAmount(amount)) {
        return ResponseUtils.validationError(res, ['Amount must be a positive number']);
      }

      // Generate payment request
      const paymentRequest = paymentService.generatePaymentRequest(
        merchantUserId,  
        amount,
        tokenType
      );

      logger.info(`Generated payment QR for merchant ${merchantUserId}, amount: ${amount}, token: ${tokenType}`);
      return ResponseUtils.success(res, paymentRequest, 'Payment QR code generated successfully');

    } catch (error) {
      logger.error('Error generating QR code:', error);
      return ResponseUtils.error(res, 'Failed to generate QR code', 500, error.message);
    }
  }

  /**
   * Process payment
   * POST /api/payments/process
   */
  async processPayment(req, res) {
    try {
      const { paymentData, customerWallet, customerAccountId, customerUserId, amount } = req.body;
      
      logger.info('Payment request received', { paymentData: paymentData?.substring(0, 8) + '...', customerUserId, amount });

      // Validate payment data format (nonce)
      if (!ValidationUtils.isValidNonce(paymentData)) {
        return ResponseUtils.validationError(res, ['Invalid payment request format. Expected 32-character hex nonce']);
      }

      // Prioritize customerUserId for custodial accounts (Hedera best practice)
      let finalCustomerUserId = customerUserId || customerAccountId;
      logger.debug('Using customer identifier:', finalCustomerUserId);

      // Validate customer identifier
      if (!ValidationUtils.isValidUserId(finalCustomerUserId)) {
        return ResponseUtils.validationError(res, ['Customer userId is required for custodial account payments']);
      }

      // Validate amount if provided
      if (amount !== null && amount !== undefined && !ValidationUtils.isValidAmount(amount)) {
        return ResponseUtils.validationError(res, ['Amount must be a positive number']);
      }

      // Validate custodial account exists
      const customerAccount = accountService.getCustodialAccount(finalCustomerUserId);
      if (!customerAccount) {
        logger.warn(`Customer custodial account not found for userId: ${finalCustomerUserId}`);
        return ResponseUtils.notFound(res, 'Customer custodial account');
      }
      logger.info(`Customer custodial account found: ${customerAccount.accountId}`);
      
      logger.info(`Processing payment with nonce: ${paymentData.substring(0, 8)}... from customer: ${finalCustomerUserId}`);

      // Process payment using payment service
      const result = await paymentService.processPayment(paymentData, finalCustomerUserId, amount);
      
      logger.info('Payment completed successfully', { transactionId: result.transactionId, amount: result.amount });

      return ResponseUtils.success(res, {
        data: result
      });

    } catch (error) {
      logger.error('Error processing payment:', error);
      return ResponseUtils.error(res, 'Payment processing failed', 500, error.message);
    }
  }

  /**
   * Get payment status by nonce
   * GET /api/payments/status/:nonce
   */
  async getPaymentStatus(req, res) {
    try {
      const { nonce } = req.params;
      
      // Validate nonce format
      if (!nonce) {
        return ResponseUtils.validationError(res, ['Nonce is required']);
      }

      if (!ValidationUtils.isValidNonce(nonce)) {
        return ResponseUtils.validationError(res, ['Invalid nonce format. Expected 32-character hex string']);
      }

      logger.info(`Getting payment status for nonce: ${nonce.substring(0, 8)}...`);

      // Get payment status from service
      const status = paymentService.getPaymentStatus(nonce);

      if (!status) {
        logger.warn(`Payment request not found for nonce: ${nonce.substring(0, 8)}...`);
        return ResponseUtils.notFound(res, 'Payment request');
      }

      logger.info(`Payment status retrieved for nonce: ${nonce.substring(0, 8)}...`);
      return ResponseUtils.success(res, status, 'Payment status retrieved successfully');

    } catch (error) {
      logger.error('Error getting payment status:', error);
      return ResponseUtils.error(res, 'Failed to get payment status', 500, error.message);
    }
  }

  /**
   * Validate payment request
   * POST /api/payments/validate
   */
  async validatePaymentRequest(req, res) {
    try {
      const { paymentData } = req.body;

      // Validate input format
      if (!paymentData) {
        return ResponseUtils.validationError(res, ['Payment data is required']);
      }

      if (!ValidationUtils.isValidNonce(paymentData)) {
        return ResponseUtils.validationError(res, ['Invalid payment data format. Expected 32-character hex string']);
      }

      logger.info(`Validating payment request for nonce: ${paymentData.substring(0, 8)}...`);

      // Validate payment request using service
      const isValid = paymentService.validatePaymentRequest(paymentData);
      const message = isValid ? 'Payment request is valid' : 'Invalid payment request';

      logger.info(`Payment validation result for ${paymentData.substring(0, 8)}...: ${isValid}`);
      
      return ResponseUtils.success(res, {
        isValid,
        message,
        nonce: paymentData
      }, 'Payment request validated');

    } catch (error) {
      logger.error('Error validating payment request:', error);
      return ResponseUtils.error(res, 'Failed to validate payment request', 500, error.message);
    }
  }

  /**
   * Get payment history (bonus method)
   * GET /api/payments/history
   */
  async getPaymentHistory(req, res) {
    try {
      const { merchantUserId, status, limit = 50 } = req.query;

      logger.info('Getting merchant QR payment requests', { merchantUserId, status, limit });

      if (!merchantUserId) {
        return ResponseUtils.validationError(res, ['merchantUserId is required']);
      }

      const list = paymentService.getMerchantPaymentRequests(merchantUserId, {
        status,
        limit: parseInt(limit)
      });

      return ResponseUtils.success(res, {
        payments: list,
        total: list.length
      }, 'Payment requests retrieved successfully');

    } catch (error) {
      logger.error('Error getting payment history:', error);
      return ResponseUtils.error(res, 'Failed to get payment history', 500, error.message);
    }
  }

  /**
   * Cancel payment request
   * POST /api/payments/cancel/:nonce
   */
  async cancelPaymentRequest(req, res) {
    try {
      const { nonce } = req.params;
      
      // Validate nonce format
      if (!ValidationUtils.isValidNonce(nonce)) {
        return ResponseUtils.validationError(res, ['Invalid nonce format']);
      }

      logger.info(`Cancelling payment request for nonce: ${nonce.substring(0, 8)}...`);

      // Cancel payment request
      const result = paymentService.cancelPaymentRequest(nonce);

      if (!result) {
        logger.warn(`Payment request not found for cancellation: ${nonce.substring(0, 8)}...`);
        return ResponseUtils.notFound(res, 'Payment request');
      }

      logger.info(`Payment request cancelled for nonce: ${nonce.substring(0, 8)}...`);
      return ResponseUtils.success(res, result, 'Payment request cancelled successfully');

    } catch (error) {
      logger.error('Error cancelling payment request:', error);
      return ResponseUtils.error(res, 'Failed to cancel payment request', 500, error.message);
    }
  }
}

module.exports = new PaymentController();