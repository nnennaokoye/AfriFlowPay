const {
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
    TokenAssociateTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    TokenId
  } = require('@hashgraph/sdk');
  const hederaClient = require('./hederaClient');
  
  class TokenService {
    constructor() {
      this.client = hederaClient.getClient();
      this.operatorId = hederaClient.getOperatorId();
      this.operatorKey = hederaClient.getOperatorKey();
      
      // Store created token IDs
      this.tokens = {
        USDC: null,
        USDT: null
      };
    }
  
    /**
     * Create mock USDC and USDT tokens on Hedera testnet
     */
    async createMockTokens() {
      try {
        console.log('Creating mock tokens...');
  
        // Create mock USDC
        const usdcTransaction = new TokenCreateTransaction()
          .setTokenName('Mock USD Coin')
          .setTokenSymbol('USDC')
          .setTokenType(TokenType.FungibleCommon)
          .setDecimals(6) // USDC has 6 decimals
          .setInitialSupply(1000000 * Math.pow(10, 6)) // 1M USDC
          .setTreasuryAccountId(this.operatorId)
          .setSupplyType(TokenSupplyType.Infinite)
          .setSupplyKey(this.operatorKey)
          .setAdminKey(this.operatorKey)
          .freezeWith(this.client);
  
        const usdcResponse = await usdcTransaction.execute(this.client);
        const usdcReceipt = await usdcResponse.getReceipt(this.client);
        this.tokens.USDC = usdcReceipt.tokenId;
  
        // Create mock USDT
        const usdtTransaction = new TokenCreateTransaction()
          .setTokenName('Mock Tether USD')
          .setTokenSymbol('USDT')
          .setTokenType(TokenType.FungibleCommon)
          .setDecimals(6) // USDT has 6 decimals
          .setInitialSupply(1000000 * Math.pow(10, 6)) // 1M USDT
          .setTreasuryAccountId(this.operatorId)
          .setSupplyType(TokenSupplyType.Infinite)
          .setSupplyKey(this.operatorKey)
          .setAdminKey(this.operatorKey)
          .freezeWith(this.client);
  
        const usdtResponse = await usdtTransaction.execute(this.client);
        const usdtReceipt = await usdtResponse.getReceipt(this.client);
        this.tokens.USDT = usdtReceipt.tokenId;
  
        console.log('Mock tokens created:');
        console.log(`USDC: ${this.tokens.USDC}`);
        console.log(`USDT: ${this.tokens.USDT}`);
  
        return this.tokens;
      } catch (error) {
        console.error('Error creating mock tokens:', error);
        throw error;
      }
    }
  
    /**
     * Associate token with account (required before receiving tokens)
     */
    async associateTokenWithAccount(accountId, tokenId, accountKey) {
      try {
        const associateTransaction = new TokenAssociateTransaction()
          .setAccountId(accountId)
          .setTokenIds([tokenId])
          .freezeWith(this.client);
  
        const signedTransaction = await associateTransaction.sign(accountKey);
        const response = await signedTransaction.execute(this.client);
        const receipt = await response.getReceipt(this.client);
  
        console.log(`Token ${tokenId} associated with account ${accountId}`);
        return receipt;
      } catch (error) {
        console.error('Error associating token:', error);
        throw error;
      }
    }
  
    /**
     * Transfer HTS tokens between accounts
     */
    async transferTokens(fromAccountId, toAccountId, tokenId, amount, fromAccountKey) {
      try {
        const transferTransaction = new TransferTransaction()
          .addTokenTransfer(tokenId, fromAccountId, -amount)
          .addTokenTransfer(tokenId, toAccountId, amount)
          .freezeWith(this.client);
  
        const signedTransaction = await transferTransaction.sign(fromAccountKey);
        const response = await signedTransaction.execute(this.client);
        const receipt = await response.getReceipt(this.client);
  
        console.log(`Transferred ${amount} tokens from ${fromAccountId} to ${toAccountId}`);
        return {
          transactionId: response.transactionId.toString(),
          receipt
        };
      } catch (error) {
        console.error('Error transferring tokens:', error);
        throw error;
      }
    }
  
    /**
     * Get token IDs
     */
    getTokenIds() {
      return this.tokens;
    }
  }
  
  module.exports = new TokenService();