const {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  TokenInfoQuery,
  TokenId,
  TokenTransferTransaction
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
      console.log(' Creating mock tokens...');

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

      console.log(' Mock tokens created:');
      console.log(` USDC: ${this.tokens.USDC}`);
      console.log(` USDT: ${this.tokens.USDT}`);

      return this.tokens;
    } catch (error) {
      console.error(' Error creating mock tokens:', error);
      throw error;
    }
  }

  /**
   * Associate token with account (required before receiving tokens)
   */
  async associateTokenWithAccount(accountId, tokenId, accountKey) {
    try {
      console.log(` Associating token ${tokenId} with account ${accountId}`);

      const associateTransaction = new TokenAssociateTransaction()
        .setAccountId(accountId)
        .setTokenIds([tokenId])
        .freezeWith(this.client);

      const signedTransaction = await associateTransaction.sign(accountKey);
      const response = await signedTransaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      console.log(` Token ${tokenId} associated with account ${accountId}`);
      return {
        transactionId: response.transactionId.toString(),
        receipt
      };
    } catch (error) {
      console.error(' Error associating token:', error);
      throw error;
    }
  }

  /**
   * Transfer HTS tokens between accounts using TokenTransferTransaction
   */
  async transferTokens(fromAccountId, toAccountId, tokenId, amount, fromAccountKey) {
    try {
      console.log(` Transferring ${amount} tokens from ${fromAccountId} to ${toAccountId}`);

      // Use TokenTransferTransaction for HTS token transfers
      const transferTransaction = new TokenTransferTransaction()
        .addTokenTransfer(tokenId, fromAccountId, -amount)
        .addTokenTransfer(tokenId, toAccountId, amount)
        .freezeWith(this.client);

      const signedTransaction = await transferTransaction.sign(fromAccountKey);
      const response = await signedTransaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      console.log(` Transferred ${amount} tokens successfully`);
      return {
        transactionId: response.transactionId.toString(),
        receipt,
        status: receipt.status.toString()
      };
    } catch (error) {
      console.error(' Error transferring tokens:', error);
      throw error;
    }
  }

  /**
   * Get token information using TokenInfoQuery
   */
  async getTokenInfo(tokenId) {
    try {
      console.log(` Querying token info for ${tokenId}`);

      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(this.client);

      const info = {
        tokenId: tokenInfo.tokenId.toString(),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        totalSupply: tokenInfo.totalSupply.toString(),
        treasury: tokenInfo.treasuryAccountId.toString(),
        adminKey: tokenInfo.adminKey ? tokenInfo.adminKey.toString() : null,
        supplyKey: tokenInfo.supplyKey ? tokenInfo.supplyKey.toString() : null,
        tokenType: tokenInfo.tokenType.toString(),
        supplyType: tokenInfo.supplyType.toString(),
        maxSupply: tokenInfo.maxSupply ? tokenInfo.maxSupply.toString() : null,
        tokenMemo: tokenInfo.tokenMemo || null,
        createdTime: tokenInfo.createdTime ? tokenInfo.createdTime.toDate() : null
      };

      console.log(` Token info retrieved for ${tokenInfo.name} (${tokenInfo.symbol})`);
      return info;
    } catch (error) {
      console.error(' Error getting token info:', error);
      throw error;
    }
  }

  /**
   * Get account token balances
   */
  async getAccountTokenBalances(accountId) {
    try {
      console.log(` Getting token balances for account ${accountId}`);

      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(this.client);

      const balances = {
        hbar: accountBalance.hbars.toString(),
        tokens: {}
      };

      // Convert token balances to readable format
      if (accountBalance.tokens && accountBalance.tokens.size > 0) {
        for (const [tokenId, balance] of accountBalance.tokens.entries()) {
          balances.tokens[tokenId.toString()] = balance.toString();
        }
      }

      console.log(` Retrieved balances for account ${accountId}`);
      return balances;
    } catch (error) {
      console.error(' Error getting account token balances:', error);
      throw error;
    }
  }

  /**
   * Get detailed token balance with token info
   */
  async getDetailedTokenBalance(accountId, tokenId) {
    try {
      const balances = await this.getAccountTokenBalances(accountId);
      const tokenInfo = await this.getTokenInfo(tokenId);
      
      const tokenBalance = balances.tokens[tokenId.toString()] || '0';
      
      return {
        accountId: accountId.toString(),
        tokenId: tokenId.toString(),
        balance: tokenBalance,
        tokenInfo: tokenInfo,
        formattedBalance: this.formatTokenAmount(tokenBalance, tokenInfo.decimals),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(' Error getting detailed token balance:', error);
      throw error;
    }
  }

  /**
   * Format token amount based on decimals
   */
  formatTokenAmount(amount, decimals) {
    const divisor = Math.pow(10, decimals);
    return (parseInt(amount) / divisor).toFixed(decimals);
  }

  /**
   * Get token IDs
   */
  getTokenIds() {
    return this.tokens;
  }

  /**
   * Check if tokens are created
   */
  areTokensCreated() {
    return this.tokens.USDC && this.tokens.USDT;
  }
}

module.exports = new TokenService();