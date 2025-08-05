const crypto = require('crypto');
const { TransferTransaction, Hbar, TokenTransferTransaction, AccountId } = require('@hashgraph/sdk');
const hederaClient = require('./hederaClient');
const accountService = require('./accountService');
const tokenService = require('./tokenService');
const mirrorNodeService = require('./mirrorNodeService');

class PaymentService {
  constructor() {
    this.pendingPayments = new Map();
    this.qrStore = new Map(); // Store QR payment requests
    this.paymentRequests = new Map(); // Store payment request details
  }

  /**
   * Generate payment QR code data
   * Following Hedera best practice: store userId in payload, resolve to account ID at transaction time
   */
  generatePaymentRequest(merchantUserId, amount = null, tokenType = 'HBAR') {
    try {
      // Generate unique nonce for this payment request
      const nonce = crypto.randomBytes(16).toString('hex');
      
      // Create payment request payload with merchant userId (not Hedera account ID)
      // This allows proper custodial account lookup during payment processing
      const payload = {
        merchantUserId,  // Store userId, not Hedera account ID
        amount,
        tokenType,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
      
      // Store the payment request
      this.qrStore.set(nonce, payload);
      this.paymentRequests.set(nonce, payload);
      
      console.log(`🎯 QR payment request stored with nonce: ${nonce}`);
      console.log(`📊 QR store now has ${this.qrStore.size} entries`);
      console.log('📦 Stored payload:', payload);

      return {
        qrData: nonce,
        paymentLink: `afripayflow.com/pay?data=${nonce}`,
        merchantUserId: merchantUserId,  // Return userId for consistency
        amount,
        tokenType,
        nonce
      };
    } catch (error) {
      console.error('❌ Error generating payment request:', error);
      throw error;
    }
  }

  /**
   * Process payment transaction
   * ENHANCED: Better error handling and validation
   */
  async processPayment(paymentData, customerUserId, amount) {
    try {
      console.log('🚀 Starting payment processing...');
      console.log('📥 Payment data received:', { paymentData, customerUserId, amount });

      // Handle both nonce string and payment object
      let nonce, merchantUserId, tokenType;
      
      if (typeof paymentData === 'string') {
        // If paymentData is a nonce string, get the stored QR payload
        nonce = paymentData;
        console.log(`🔍 Looking up QR payload for nonce: ${nonce}`);
        
        const storedPayload = this.qrStore.get(nonce);
        if (!storedPayload) {
          console.error(`❌ No stored payload found for nonce: ${nonce}`);
          console.log(`📊 Available nonces: [${Array.from(this.qrStore.keys()).join(', ')}]`);
          throw new Error('Invalid or expired payment request');
        }
        
        console.log('✅ Stored payload found:', storedPayload);
        
        // Check if payment request has expired
        if (new Date() > storedPayload.expiresAt) {
          console.error(`⏰ Payment request expired at: ${storedPayload.expiresAt}`);
          this.qrStore.delete(nonce);
          throw new Error('Payment request has expired');
        }
        
        // Extract merchant userId from payload (following Hedera best practice)
        merchantUserId = storedPayload.merchantUserId;
        tokenType = storedPayload.tokenType || 'HBAR';
        amount = amount || storedPayload.amount;
        
        console.log(`📋 Extracted from payload: merchantUserId=${merchantUserId}, tokenType=${tokenType}, amount=${amount}`);
      } else {
        // If paymentData is an object
        ({ merchantUserId, tokenType, nonce } = paymentData);
        if (!this.validatePaymentRequest(paymentData)) {
          throw new Error('Invalid or expired payment request');
        }
      }

      // Validate inputs
      if (!merchantUserId) {
        throw new Error('Merchant userId is required');
      }
      if (!customerUserId) {
        throw new Error('Customer userId is required');
      }
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Valid amount is required');
      }

      // Process payment using custodial accounts
      // Transfer from customer custodial account to merchant custodial account
      const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`🔄 Processing payment: ${transactionId}`);
      console.log(`👤 Customer: ${customerUserId} → 🏪 Merchant: ${merchantUserId}`);
      console.log(`💰 Amount: ${amount} ${tokenType}`);
      
      // Validate customer custodial account exists
      const customerAccount = accountService.getCustodialAccount(customerUserId);
      if (!customerAccount) {
        console.error(`❌ Customer account not found for userId: ${customerUserId}`);
        throw new Error(`Customer account not found for userId: ${customerUserId}`);
      }
      
      // Validate merchant custodial account exists
      const merchantAccount = accountService.getCustodialAccount(merchantUserId);
      if (!merchantAccount) {
        console.error(`❌ Merchant account not found for userId: ${merchantUserId}`);
        throw new Error(`Merchant account not found for userId: ${merchantUserId}`);
      }
      
      console.log(`✅ Customer Hedera Account: ${customerAccount.accountId}`);
      console.log(`✅ Merchant Hedera Account: ${merchantAccount.accountId}`);
      
      // Check customer balance
      console.log('💳 Checking customer balance...');
      const customerBalance = await accountService.getBalance(customerUserId);
      const requiredAmount = parseFloat(amount);
      
      console.log(`💰 Customer balance: ${customerBalance.hbar} HBAR`);
      console.log(`💸 Required amount: ${requiredAmount} HBAR`);
      
      if (tokenType === 'HBAR' && customerBalance.hbar < requiredAmount) {
        throw new Error(`Insufficient HBAR balance. Have: ${customerBalance.hbar}, Need: ${requiredAmount}`);
      }
      
      // Mark payment as processing
      this.pendingPayments.set(nonce, {
        status: 'processing',
        transactionId: transactionId,
        startedAt: new Date(),
        amount: amount,
        customerUserId,
        merchantUserId,
        customerHederaAccount: customerAccount.accountId,
        merchantHederaAccount: merchantAccount.accountId,
        tokenType
      });
      
      console.log('🔄 Executing transfer...');
      
      // Process the transfer using userIds (accountService will resolve to Hedera account IDs)
      const transferResult = await accountService.transferFunds(customerUserId, merchantUserId, amount, tokenType);
      
      console.log('✅ Transfer completed:', transferResult);
      
      // Store payment completion info using userIds
      this.pendingPayments.set(nonce, {
        status: 'completed',
        transactionId: transferResult.transactionId || transactionId,
        completedAt: new Date(),
        amount: amount,
        customerUserId,
        merchantUserId,
        customerHederaAccount: customerAccount.accountId,
        merchantHederaAccount: merchantAccount.accountId,
        tokenType,
        hederaTransactionId: transferResult.transactionId,
        receipt: transferResult.receipt
      });

      console.log(`🎉 Payment processed successfully: ${transferResult.transactionId}`);

      return {
        success: true,
        transactionId: transferResult.transactionId || transactionId,
        hederaTransactionId: transferResult.transactionId,
        amount: amount,
        tokenType: tokenType,
        customerUserId: customerUserId,
        merchantUserId: merchantUserId,
        customerHederaAccount: customerAccount.accountId,
        merchantHederaAccount: merchantAccount.accountId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        message: `${tokenType} payment processed successfully`,
        receipt: transferResult.receipt
      };

    } catch (error) {
      console.error('❌ Error processing payment:', error);
      console.error('📊 Error details:', {
        message: error.message,
        stack: error.stack
      });
      
      // Update payment status to failed
      if (typeof paymentData === 'string' && this.pendingPayments.has(paymentData)) {
        const pendingPayment = this.pendingPayments.get(paymentData);
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
    const status = this.pendingPayments.get(nonce);
    console.log(`📊 Payment status for nonce ${nonce}:`, status);
    return status;
  }

  /**
   * Validate payment request
   */
  validatePaymentRequest(paymentData) {
    try {
      console.log('🔍 Validating payment request:', paymentData);
      
      if (typeof paymentData === 'string') {
        // If it's a nonce, get the stored payment request from QR store
        console.log('🔍 Looking for nonce in QR store:', paymentData);
        const storedRequest = this.qrStore.get(paymentData);
        console.log('📦 Stored request found:', !!storedRequest);
        
        if (!storedRequest) {
          console.log('❌ No stored request found');
          console.log(`📊 Available nonces: [${Array.from(this.qrStore.keys()).join(', ')}]`);
          return false;
        }
        
        // Check if expired
        if (new Date() > storedRequest.expiresAt) {
          console.log('⏰ Request expired, removing from store');
          this.qrStore.delete(paymentData);
          return false;
        }
        
        console.log('✅ Payment request is valid');
        return true;
      }

      const { merchantUserId, tokenType, nonce } = paymentData;
      
      // Basic validation
      if (!merchantUserId || !tokenType || !nonce) {
        console.log('❌ Missing required fields');
        return false;
      }

      // Check if payment request exists and is valid
      const storedRequest = this.qrStore.get(nonce);
      if (!storedRequest) {
        console.log('❌ No stored request found for nonce');
        return false;
      }

      // Check if expired
      if (new Date() > storedRequest.expiresAt) {
        console.log('⏰ Request expired');
        this.qrStore.delete(nonce);
        return false;
      }

      console.log('✅ Payment request is valid');
      return true;
    } catch (error) {
      console.error('❌ Error validating payment request:', error);
      return false;
    }
  }

  /**
   * Debug method to inspect QR store
   */
  debugQRStore() {
    console.log('🔍 QR Store Debug:');
    console.log(`📊 Total entries: ${this.qrStore.size}`);
    for (const [nonce, payload] of this.qrStore.entries()) {
      console.log(`📦 ${nonce}: ${JSON.stringify(payload, null, 2)}`);
    }
  }
}

module.exports = new PaymentService();