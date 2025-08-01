const crypto = require('crypto');
const { TransferTransaction, Hbar, TokenTransferTransaction, AccountId } = require('@hashgraph/sdk');
const hederaClient = require('./hederaClient');
const accountService = require('./accountService');
const walletConnectionService = require('./walletConnectionService');
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
    try {
      // Use wallet connection service to store QR payload
      const { nonce, payload } = walletConnectionService.storeQRPayload(merchantAccountId, amount, tokenType);

      return {
        qrData: nonce,
        paymentLink: `afripayflow.com/pay?data=${nonce}`,
        merchantWallet: merchantAccountId,
        amount,
        tokenType,
        nonce
      };
    } catch (error) {
      console.error('Error generating payment request:', error);
      throw error;
    }
  }

  /**
   * Process payment transaction
   */
  async processPayment(paymentData, userAccountId, amount) {
    try {
      // Handle both nonce string and payment object
      let nonce, merchantWallet, tokenType;
      
      if (typeof paymentData === 'string') {
        // If paymentData is a nonce string, get the stored QR payload
        nonce = paymentData;
        const storedPayload = walletConnectionService.getQRPayload(nonce);
        if (!storedPayload) {
          throw new Error('Invalid or expired payment request');
        }
        merchantWallet = storedPayload.merchantWallet;
        tokenType = storedPayload.tokenType || 'HBAR';
      } else {
        // If paymentData is an object
        ({ merchantWallet, tokenType, nonce } = paymentData);
        if (!this.validatePaymentRequest(paymentData)) {
          throw new Error('Invalid or expired payment request');
        }
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

      // Store payment completion info
      this.pendingPayments.set(nonce, {
        status: 'completed',
        transactionId: transactionResult.transactionId,
        completedAt: new Date(),
        amount: amount,
        merchantWallet,
        tokenType
      });

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
   * Validate payment request
   */
  validatePaymentRequest(paymentData) {
    try {
      console.log('Validating payment request:', paymentData);
      
      if (typeof paymentData === 'string') {
        // If it's a nonce, get the stored payment request from wallet service
        console.log('Looking for nonce in wallet service:', paymentData);
        const storedRequest = walletConnectionService.getQRPayload(paymentData);
        console.log('Stored request found:', !!storedRequest, storedRequest);
        return !!storedRequest;
      }

      const { merchantWallet, tokenType, nonce } = paymentData;
      
      // Basic validation
      if (!merchantWallet || !tokenType || !nonce) {
        return false;
      }

      // Check if payment request exists and is valid
      const storedRequest = walletConnectionService.getQRPayload(nonce);
      if (!storedRequest) {
        return false;
      }

      // Validate timestamp (15 minutes expiry)
      const now = new Date();
      const requestAge = now - storedRequest.createdAt;
      const fifteenMinutes = 15 * 60 * 1000;
      
      if (requestAge > fifteenMinutes) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating payment request:', error);
      return false;
    }
  }
}

module.exports = new PaymentService();