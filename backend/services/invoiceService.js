const {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenInfoQuery,
  TokenId
} = require('@hashgraph/sdk');
const hederaClient = require('./hederaClient');

class InvoiceService {
  constructor() {
    this.client = hederaClient.getClient();
    this.operatorId = hederaClient.getOperatorId();
    this.operatorKey = hederaClient.getOperatorKey();
    
    // Store created invoice tokens
    this.invoiceTokens = new Map();
  }

  /**
   * Create tokenized invoice using proper Hedera HTS NFT
   */
  async createInvoiceToken(invoiceData) {
    try {
      const {
        merchantId,
        invoiceId,
        amount,
        currency = 'USD',
        description,
        dueDate,
        serviceType = 'General Services'
      } = invoiceData;

      console.log(`🧾 Creating invoice token for invoice ${invoiceId}...`);

      // Create metadata for the invoice token (simplified and within limits)
      const metadata = {
        invoiceId,
        merchantId,
        amount,
        currency,
        description: description.length > 50 ? description.substring(0, 50) + '...' : description,
        serviceType,
        dueDate,
        createdAt: new Date().toISOString(),
        tokenType: 'invoice',
        version: '1.0'
      };

      // Create HTS token for the invoice
      const tokenName = `Invoice ${invoiceId.slice(-8)}`; // Shorter name
      const tokenSymbol = `INV${invoiceId.slice(-4)}`; // Use last 4 chars of invoice ID

      // Create very short memo (under 100 bytes)
      const shortMemo = `${invoiceId}:${amount}${currency}`;

      console.log(`🔧 Token details: ${tokenName} (${tokenSymbol})`);
      console.log(`📝 Memo: ${shortMemo} (${shortMemo.length} chars)`);

      const tokenCreateTransaction = new TokenCreateTransaction()
        .setTokenName(tokenName)
        .setTokenSymbol(tokenSymbol)
        .setTokenType(TokenType.NonFungibleUnique) // NFT for unique invoices
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(1) // Only one token per invoice
        .setTreasuryAccountId(this.operatorId)
        .setSupplyKey(this.operatorKey)
        .setAdminKey(this.operatorKey)
        .setTokenMemo(shortMemo) // Short memo
        .freezeWith(this.client);

      console.log(`⚡ Executing token creation transaction...`);
      const response = await tokenCreateTransaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);
      const tokenId = receipt.tokenId;

      console.log(`✅ Invoice token created: ${tokenId}`);

      // FIXED: Create ultra-minimal metadata for NFT minting (under 100 bytes!)
      // Option 1: Minimal JSON approach
      const nftMetadata = JSON.stringify({
        id: invoiceId.slice(-8), // Use last 8 chars only
        amt: amount,
        cur: currency
      });

      // Option 2: Even more compact - use delimited string instead of JSON
      // const nftMetadata = `${invoiceId.slice(-8)}|${amount}|${currency}|${merchantId.slice(-8)}`;

      // Option 3: Base64 encoded compact data (most space efficient)
      // const compactData = `${invoiceId.slice(-8)}:${amount}:${currency}`;
      // const nftMetadata = Buffer.from(compactData).toString('base64');

      console.log(`🪙 Minting NFT with metadata: ${nftMetadata} (${nftMetadata.length} bytes)`);
      
      // Validate metadata size before minting
      if (nftMetadata.length > 100) {
        throw new Error(`NFT metadata too large: ${nftMetadata.length} bytes (max 100 bytes)`);
      }

      // Mint the NFT token with minimal metadata
      const mintTransaction = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([Buffer.from(nftMetadata, 'utf8')])
        .freezeWith(this.client);

      console.log(`⚡ Executing mint transaction...`);
      const mintResponse = await mintTransaction.execute(this.client);
      const mintReceipt = await mintResponse.getReceipt(this.client);

      console.log(`🪙 Invoice NFT minted with serial: ${mintReceipt.serials[0]}`);

      const invoiceToken = {
        tokenId: tokenId.toString(),
        invoiceId,
        merchantId,
        metadata,
        transactionId: response.transactionId.toString(),
        mintTransactionId: mintResponse.transactionId.toString(),
        serialNumbers: mintReceipt.serials.map(s => s.toString()),
        status: 'active',
        createdAt: new Date(),
        hederaTokenInfo: null, // Will be populated by getTokenInfo
        nftMetadata: nftMetadata, // Store the on-chain metadata
        // Store full metadata off-chain for reference
        fullMetadata: metadata
      };

      // Store invoice token info
      this.invoiceTokens.set(invoiceId, invoiceToken);

      // Fetch and store token info from Hedera
      try {
        const tokenInfo = await this.getTokenInfoFromHedera(tokenId);
        invoiceToken.hederaTokenInfo = tokenInfo;
      } catch (error) {
        console.warn('⚠️ Could not fetch token info immediately:', error.message);
      }

      console.log(`🎉 Invoice token fully created and stored: ${invoiceId}`);
      console.log(`🔗 Hedera Token ID: ${tokenId}`);
      console.log(`🏷️ NFT Serial: ${mintReceipt.serials[0]}`);

      return invoiceToken;

    } catch (error) {
      console.error('❌ Error creating invoice token:', error);
      
      // Enhanced error logging for debugging
      if (error.message) {
        console.error('📋 Error details:', error.message);
      }
      if (error.status) {
        console.error('🔍 Hedera status code:', error.status._code);
      }
      
      throw error;
    }
  }

  /**
   * Get token information from Hedera using TokenInfoQuery
   */
  async getTokenInfoFromHedera(tokenId) {
    try {
      console.log(`📋 Fetching token info from Hedera for ${tokenId}`);

      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(this.client);

      const info = {
        tokenId: tokenInfo.tokenId.toString(),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        tokenType: tokenInfo.tokenType.toString(),
        supplyType: tokenInfo.supplyType.toString(),
        totalSupply: tokenInfo.totalSupply.toString(),
        maxSupply: tokenInfo.maxSupply ? tokenInfo.maxSupply.toString() : null,
        treasury: tokenInfo.treasuryAccountId.toString(),
        adminKey: tokenInfo.adminKey ? tokenInfo.adminKey.toString() : null,
        supplyKey: tokenInfo.supplyKey ? tokenInfo.supplyKey.toString() : null,
        tokenMemo: tokenInfo.tokenMemo || null,
        createdTime: tokenInfo.createdTime ? tokenInfo.createdTime.toDate() : null
      };

      console.log(`✅ Token info retrieved: ${info.name} (${info.symbol})`);
      return info;
    } catch (error) {
      console.error('❌ Error getting token info from Hedera:', error);
      throw error;
    }
  }

  /**
   * Get invoice token info with fresh Hedera data
   */
  async getInvoiceToken(invoiceId, refreshFromHedera = false) {
    const invoiceToken = this.invoiceTokens.get(invoiceId);
    
    if (!invoiceToken) {
      return null;
    }

    // Optionally refresh token info from Hedera
    if (refreshFromHedera && invoiceToken.tokenId) {
      try {
        const freshTokenInfo = await this.getTokenInfoFromHedera(invoiceToken.tokenId);
        invoiceToken.hederaTokenInfo = freshTokenInfo;
        invoiceToken.lastUpdated = new Date();
      } catch (error) {
        console.warn('Could not refresh token info:', error.message);
      }
    }

    return invoiceToken;
  }

  /**
   * Get all invoice tokens for merchant
   */
  getMerchantInvoiceTokens(merchantId) {
    const merchantTokens = [];
    for (const [invoiceId, tokenInfo] of this.invoiceTokens.entries()) {
      if (tokenInfo.merchantId === merchantId) {
        merchantTokens.push(tokenInfo);
      }
    }
    return merchantTokens;
  }

  /**
   * Generate investment opportunity for invoice token
   */
  generateInvestmentOpportunity(invoiceToken, investmentPercentage = 10) {
    const { metadata } = invoiceToken;
    const investmentAmount = (metadata.amount * investmentPercentage) / 100;
    
    return {
      id: `inv_${invoiceToken.invoiceId}_${investmentPercentage}`,
      tokenId: invoiceToken.tokenId,
      invoiceId: invoiceToken.invoiceId,
      title: `${investmentPercentage}% of Invoice #${invoiceToken.invoiceId}`,
      description: `Invest in ${investmentPercentage}% of invoice for ${metadata.serviceType}`,
      investmentAmount: investmentAmount,
      totalInvoiceAmount: metadata.amount,
      currency: metadata.currency,
      expectedReturn: investmentAmount * 1.15, // 15% return
      expectedReturnPercentage: 15,
      dueDate: metadata.dueDate,
      riskLevel: 'Medium',
      merchantId: metadata.merchantId,
      createdAt: invoiceToken.createdAt,
      status: 'available',
      hederaTokenId: invoiceToken.tokenId,
      serialNumber: invoiceToken.serialNumbers ? invoiceToken.serialNumbers[0] : null,
      // Hackathon showcase data
      blockchainProof: {
        network: 'Hedera Testnet',
        tokenId: invoiceToken.tokenId,
        transactionId: invoiceToken.transactionId,
        mintTransactionId: invoiceToken.mintTransactionId,
        nftSerial: invoiceToken.serialNumbers ? invoiceToken.serialNumbers[0] : null
      }
    };
  }

  /**
   * Get all available investment opportunities
   */
  getInvestmentOpportunities(limit = 10) {
    const opportunities = [];
    let count = 0;
    
    for (const [invoiceId, tokenInfo] of this.invoiceTokens.entries()) {
      if (count >= limit) break;
      
      // Only include active invoices
      if (tokenInfo.status === 'active') {
        // Generate different investment percentages
        const percentages = [5, 10, 15, 20, 25];
        const percentage = percentages[count % percentages.length];
        
        opportunities.push(
          this.generateInvestmentOpportunity(tokenInfo, percentage)
        );
      }
      count++;
    }
    
    return opportunities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Search invoices by criteria
   */
  searchInvoices(criteria = {}) {
    const { merchantId, status, minAmount, maxAmount, tokenId } = criteria;
    const results = [];

    for (const [invoiceId, tokenInfo] of this.invoiceTokens.entries()) {
      let matches = true;

      if (merchantId && tokenInfo.merchantId !== merchantId) matches = false;
      if (status && tokenInfo.status !== status) matches = false;
      if (tokenId && tokenInfo.tokenId !== tokenId) matches = false;
      if (minAmount && tokenInfo.metadata.amount < minAmount) matches = false;
      if (maxAmount && tokenInfo.metadata.amount > maxAmount) matches = false;

      if (matches) {
        results.push(tokenInfo);
      }
    }

    return results;
  }

  /**
   * Update invoice status
   */
  updateInvoiceStatus(invoiceId, newStatus) {
    const invoiceToken = this.invoiceTokens.get(invoiceId);
    if (invoiceToken) {
      invoiceToken.status = newStatus;
      invoiceToken.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get invoice statistics with Hedera integration showcase
   */
  getInvoiceStats() {
    const stats = {
      totalInvoices: this.invoiceTokens.size,
      activeInvoices: 0,
      totalValue: 0,
      averageValue: 0,
      tokenTypes: new Set(),
      merchants: new Set(),
      // Hackathon showcase data
      hederaIntegration: {
        totalNFTsCreated: this.invoiceTokens.size,
        totalTransactions: this.invoiceTokens.size * 2, // create + mint
        network: 'Hedera Testnet',
        features: [
          'Invoice NFT Tokenization',
          'HTS Token Creation',
          'TokenInfoQuery Integration',
          'Custodial Account Management',
          'Gasless Payments'
        ]
      }
    };

    for (const [invoiceId, tokenInfo] of this.invoiceTokens.entries()) {
      if (tokenInfo.status === 'active') {
        stats.activeInvoices++;
      }
      stats.totalValue += tokenInfo.metadata.amount;
      stats.tokenTypes.add(tokenInfo.metadata.currency);
      stats.merchants.add(tokenInfo.merchantId);
    }

    stats.averageValue = stats.totalInvoices > 0 ? stats.totalValue / stats.totalInvoices : 0;
    stats.tokenTypes = Array.from(stats.tokenTypes);
    stats.merchants = Array.from(stats.merchants);

    return stats;
  }

  /**
   * Get Hedera-specific invoice data (for hackathon demo)
   */
  getHederaInvoiceData(invoiceId) {
    const invoice = this.invoiceTokens.get(invoiceId);
    if (!invoice) return null;

    return {
      invoiceId,
      hederaTokenId: invoice.tokenId,
      nftSerial: invoice.serialNumbers[0],
      createTransactionId: invoice.transactionId,
      mintTransactionId: invoice.mintTransactionId,
      onChainMetadata: invoice.nftMetadata,
      fullMetadata: invoice.fullMetadata, // Full metadata stored off-chain
      tokenInfo: invoice.hederaTokenInfo,
      network: 'Hedera Testnet',
      explorerUrls: {
        token: `https://hashscan.io/testnet/token/${invoice.tokenId}`,
        createTx: `https://hashscan.io/testnet/transaction/${invoice.transactionId}`,
        mintTx: `https://hashscan.io/testnet/transaction/${invoice.mintTransactionId}`
      }
    };
  }
}

module.exports = new InvoiceService();