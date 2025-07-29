const {
    AccountCreateTransaction,
    AccountBalanceQuery,
    TransferTransaction,
    PrivateKey,
    AccountId,
    Hbar
  } = require('@hashgraph/sdk');
  const hederaClient = require('./hederaClient');
  
  class AccountService {
    constructor() {
      this.client = hederaClient.getClient();
      this.operatorId = hederaClient.getOperatorId();
      this.operatorKey = hederaClient.getOperatorKey();
      
      // Store custodial accounts for users
      this.custodialAccounts = new Map();
    }
  
    /**
     * Create a new custodial account for a user
     */
    async createCustodialAccount(userId) {
      try {
        console.log(`Creating custodial account for user: ${userId}`);
  
        // Generate new key pair for the account
        const newAccountPrivateKey = PrivateKey.generate();
        const newAccountPublicKey = newAccountPrivateKey.publicKey;
  
        // Create account with initial balance
        const createAccountTransaction = new AccountCreateTransaction()
          .setKey(newAccountPublicKey)
          .setInitialBalance(new Hbar(1)) // 1 HBAR initial balance
          .freezeWith(this.client);
  
        const response = await createAccountTransaction.execute(this.client);
        const receipt = await response.getReceipt(this.client);
        const newAccountId = receipt.accountId;
  
        // Store custodial account info
        const accountInfo = {
          userId,
          accountId: newAccountId.toString(),
          privateKey: newAccountPrivateKey.toString(),
          publicKey: newAccountPublicKey.toString(),
          createdAt: new Date()
        };
  
        this.custodialAccounts.set(userId, accountInfo);
  
        console.log(`Custodial account created: ${newAccountId}`);
        return accountInfo;
  
      } catch (error) {
        console.error('Error creating custodial account:', error);
        throw error;
      }
    }
  
    /**
     * Get custodial account for user
     */
    getCustodialAccount(userId) {
      return this.custodialAccounts.get(userId);
    }
  
    /**
     * Get account balance (HBAR + tokens)
     */
    async getAccountBalance(accountId) {
      try {
        const accountBalance = await new AccountBalanceQuery()
          .setAccountId(accountId)
          .execute(this.client);
  
        return {
          hbar: accountBalance.hbars.toString(),
          tokens: accountBalance.tokens
        };
      } catch (error) {
        console.error('Error getting account balance:', error);
        throw error;
      }
    }
  
    /**
     * Transfer HBAR between accounts (gasless for user)
     */
    async transferHbar(fromAccountId, toAccountId, amount, isGasless = true) {
      try {
        const transferTransaction = new TransferTransaction()
          .addHbarTransfer(fromAccountId, new Hbar(-amount))
          .addHbarTransfer(toAccountId, new Hbar(amount));
  
        if (isGasless) {
          // Operator pays the transaction fee
          transferTransaction.addHbarTransfer(this.operatorId, new Hbar(-0.001));
        }
  
        const response = await transferTransaction
          .freezeWith(this.client)
          .execute(this.client);
  
        const receipt = await response.getReceipt(this.client);
  
        console.log(`Transferred ${amount} HBAR from ${fromAccountId} to ${toAccountId}`);
        return {
          transactionId: response.transactionId.toString(),
          receipt
        };
      } catch (error) {
        console.error('Error transferring HBAR:', error);
        throw error;
      }
    }
  
    /**
     * List all custodial accounts
     */
    getAllCustodialAccounts() {
      return Array.from(this.custodialAccounts.values());
    }
  }
  
  module.exports = new AccountService();