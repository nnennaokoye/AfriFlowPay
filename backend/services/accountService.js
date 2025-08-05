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
    console.log(`Looking up custodial account for userId: ${userId}`);
    console.log(`Available accounts:`, Array.from(this.custodialAccounts.keys()));
    return this.custodialAccounts.get(userId);
  }

  /**
   * Debug: List all custodial accounts
   */
  getAllCustodialAccounts() {
    const accounts = {};
    for (const [userId, accountInfo] of this.custodialAccounts.entries()) {
      accounts[userId] = {
        accountId: accountInfo.accountId,
        createdAt: accountInfo.createdAt
      };
    }
    return accounts;
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
   * Transfer HBAR between custodial accounts
   * FIXED: Proper AccountId conversion and transaction signing
   */
  async transferHbar(fromAccountId, toAccountId, amount, fromPrivateKey) {
    try {
      console.log('🔍 Debug transferHbar inputs:');
      console.log('  fromAccountId:', fromAccountId, typeof fromAccountId);
      console.log('  toAccountId:', toAccountId, typeof toAccountId);
      console.log('  amount:', amount, typeof amount);
      console.log('  fromPrivateKey:', fromPrivateKey ? '[REDACTED]' : 'null', typeof fromPrivateKey);
      console.log('  operatorId:', this.operatorId ? this.operatorId.toString() : 'null', typeof this.operatorId);
      
      // Validate inputs
      if (!fromAccountId || typeof fromAccountId !== 'string') {
        throw new Error(`Invalid fromAccountId: ${fromAccountId} (type: ${typeof fromAccountId})`);
      }
      if (!toAccountId || typeof toAccountId !== 'string') {
        throw new Error(`Invalid toAccountId: ${toAccountId} (type: ${typeof toAccountId})`);
      }
      if (!fromPrivateKey || typeof fromPrivateKey !== 'string') {
        throw new Error(`Invalid fromPrivateKey: ${typeof fromPrivateKey}`);
      }
      if (!this.operatorId) {
        throw new Error(`Invalid operatorId: ${this.operatorId}`);
      }
      
      // Convert string account IDs to AccountId objects
      const fromAccount = AccountId.fromString(fromAccountId);
      const toAccount = AccountId.fromString(toAccountId);
      // operatorId is already an AccountId object from hederaClient
      const operatorAccount = this.operatorId;
      
      // Parse amount to ensure it's a number
      const transferAmount = parseFloat(amount);
      
      // Create transfer transaction (simplified - let Hedera handle fees)
      const transferTransaction = new TransferTransaction()
        .addHbarTransfer(fromAccount, new Hbar(-transferAmount))
        .addHbarTransfer(toAccount, new Hbar(transferAmount))
        .freezeWith(this.client);

      // Sign with sender's private key
      const senderPrivateKey = PrivateKey.fromString(fromPrivateKey);
      const signedTransaction = await transferTransaction.sign(senderPrivateKey);
      
      // Execute transaction (operator key is already set in client)
      const response = await signedTransaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      console.log(`✅ Transferred ${transferAmount} HBAR from ${fromAccountId} to ${toAccountId}`);
      console.log(`Transaction ID: ${response.transactionId.toString()}`);
      
      return {
        transactionId: response.transactionId.toString(),
        receipt,
        status: receipt.status.toString()
      };
    } catch (error) {
      console.error('❌ Error transferring HBAR:', error);
      throw error;
    }
  }

  /**
   * Get balance for custodial account by userId
   */
  async getBalance(userId) {
    try {
      const accountInfo = this.getCustodialAccount(userId);
      if (!accountInfo) {
        throw new Error(`No custodial account found for user: ${userId}`);
      }
      
      const balance = await this.getAccountBalance(accountInfo.accountId);
      return {
        hbar: parseFloat(balance.hbar),
        tokens: balance.tokens
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Transfer funds between custodial accounts
   * FIXED: Pass private key for transaction signing
   */
  async transferFunds(fromUserId, toUserId, amount, tokenType = 'HBAR') {
    try {
      console.log('🔍 Debug transferFunds inputs:');
      console.log('  fromUserId:', fromUserId, typeof fromUserId);
      console.log('  toUserId:', toUserId, typeof toUserId);
      console.log('  amount:', amount, typeof amount);
      console.log('  tokenType:', tokenType, typeof tokenType);
      
      const fromAccount = this.getCustodialAccount(fromUserId);
      const toAccount = this.getCustodialAccount(toUserId);
      
      console.log('🔍 Debug account lookup:');
      console.log('  fromAccount:', fromAccount ? 'found' : 'not found');
      console.log('  toAccount:', toAccount ? 'found' : 'not found');
      
      if (!fromAccount) {
        throw new Error(`No custodial account found for sender: ${fromUserId}`);
      }
      if (!toAccount) {
        throw new Error(`No custodial account found for recipient: ${toUserId}`);
      }
      
      console.log('🔍 Debug account details:');
      console.log('  fromAccount.accountId:', fromAccount.accountId, typeof fromAccount.accountId);
      console.log('  fromAccount.privateKey type:', typeof fromAccount.privateKey);
      console.log('  toAccount.accountId:', toAccount.accountId, typeof toAccount.accountId);
      
      console.log(`🔄 Transferring ${amount} ${tokenType} from ${fromUserId} to ${toUserId}`);
      console.log(`From account: ${fromAccount.accountId}`);
      console.log(`To account: ${toAccount.accountId}`);
      
      if (tokenType === 'HBAR') {
        // Pass the sender's private key for signing
        const result = await this.transferHbar(
          fromAccount.accountId, 
          toAccount.accountId, 
          amount, 
          fromAccount.privateKey
        );
        
        console.log(`✅ Transferred ${amount} HBAR from ${fromUserId} to ${toUserId}`);
        return result;
      } else {
        // For token transfers, implement token transfer logic here
        throw new Error('Token transfers not yet implemented');
      }
    } catch (error) {
      console.error('❌ Error transferring funds:', error);
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