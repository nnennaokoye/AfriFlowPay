const crypto = require('crypto');
const accountService = require('./accountService');
const tokenService = require('./tokenService');
const mirrorNodeService = require('./mirrorNodeService');

class PaymentService {
  constructor() {
    this.pendingPayments = new Map();
  }

  /**
   * Generate payment QR code data
   */
  generatePaymentRequest(merchantAccountId, amount = null, tokenType = 'HBAR') {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    
    const payload = {
      merchantWallet: merchantAccountId,
      amount: amount,
      tokenType: tokenType,
      nonce: nonce,
      timestamp: timestamp
    };

    // Create signature for security
    const signature = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    const paymentData = {
      ...payload,
      signature
    };

    // Store in pending payments
    this.pendingPayments.set(nonce, {
      ...paymentData,
      status: 'pending',
      createdAt: new Date()
    });

    return {
      qrData: JSON.stringify(paymentData),
      paymentUrl: `${process.env.FRONTEND_URL}/pay?data=${Buffer.from(JSON.stringify(paymentData)).toString('base64')}`,
      nonce
    };
  }

  /**
   * Process payment transaction
   */
  async processPayment(paymentData, userAccountId, amount) {
    try {
      const { merchantWallet, tokenType, nonce } = paymentData;

      // Validate payment request
      if (!this.pendingPayments.has(nonce)) {
        throw new Error('Invalid or expired payment request');
      }

      const pendingPayment = this.pendingPayments.get(nonce);
      if (pendingPayment.status !== 'pending') {
        throw new Error('Payment already processed');
      }

      let transactionResult;

      if (tokenType === 'HBAR') {
        // Transfer HBAR
        transactionResult = await accountService.transferHbar(
          userAccountId,
          merchantWallet,
          amount,
          true // gasless
        );
      } else {
        // Transfer HTS tokens (USDC/USDT)
        const tokenIds = tokenService.getTokenIds();
        const tokenId = tokenIds[tokenType];
        
        if (!tokenId) {
          throw new Error(`Unsupported token type: ${tokenType}`);
        }

        const userAccount = accountService.getCustodialAccount(userAccountId);
        transactionResult = await tokenService.transferTokens(
          userAccountId,
          merchantWallet,
          tokenId,
          amount * Math.pow(10, 6), // Convert to token units (6 decimals)
          userAccount.privateKey
        );
      }

      // Update payment status
      pendingPayment.status = 'completed';
      pendingPayment.transactionId = transactionResult.transactionId;
      pendingPayment.completedAt = new Date();
      pendingPayment.amount = amount;

      console.log(`Payment processed: ${transactionResult.transactionId}`);

      return {
        success: true,
        transactionId: transactionResult.transactionId,
        amount: amount,
        tokenType: tokenType,
        merchantWallet: merchantWallet
      };

    } catch (error) {
      console.error('Error processing payment:', error);
      
      // Update payment status to failed
      if (paymentData.nonce && this.pendingPayments.has(paymentData.nonce)) {
        const pendingPayment = this.pendingPayments.get(paymentData.nonce);
        pendingPayment.status = 'failed';
        pendingPayment.error = error.message;
        pendingPayment.failedAt = new Date();
      }

      throw error;
    }
  }

  /**
   * Get payment status
   */
  getPaymentStatus(nonce) {
    return this.pendingPayments.get(nonce);
  }

  /**
   * Validate payment request signature
   */
  validatePaymentRequest(paymentData) {
    const { signature, ...payload } = paymentData;
    const expectedSignature = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expectedSignature;
  }
}

module.exports = new PaymentService();