const {
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
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
  
    //Create tokenized invoice
     
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
  
        console.log(`Creating invoice token for invoice ${invoiceId}...`);
  
        // Create metadata for the invoice token
        const metadata = {
          invoiceId,
          merchantId,
          amount,
          currency,
          description,
          serviceType,
          dueDate,
          createdAt: new Date().toISOString(),
          tokenType: 'invoice'
        };
  
        // Create HTS token for the invoice
        const tokenName = `Invoice ${invoiceId}`;
        const tokenSymbol = `INV${invoiceId.slice(-4)}`; // Use last 4 chars of invoice ID
  
        const tokenCreateTransaction = new TokenCreateTransaction()
          .setTokenName(tokenName)
          .setTokenSymbol(tokenSymbol)
          .setTokenType(TokenType.NonFungibleUnique) // NFT for unique invoices
          .setSupplyType(TokenSupplyType.Finite)
          .setMaxSupply(1) // Only one token per invoice
          .setTreasuryAccountId(this.operatorId)
          .setSupplyKey(this.operatorKey)
          .setAdminKey(this.operatorKey)
          .setTokenMemo(JSON.stringify(metadata))
          .freezeWith(this.client);
  
        const response = await tokenCreateTransaction.execute(this.client);
        const receipt = await response.getReceipt(this.client);
        const tokenId = receipt.tokenId;
  
        // Mint the NFT token
        const mintTransaction = new TokenMintTransaction()
          .setTokenId(tokenId)
          .setMetadata([Buffer.from(JSON.stringify(metadata))])
          .freezeWith(this.client);
  
        const mintResponse = await mintTransaction.execute(this.client);
        const mintReceipt = await mintResponse.getReceipt(this.client);
  
        const invoiceToken = {
          tokenId: tokenId.toString(),
          invoiceId,
          merchantId,
          metadata,
          transactionId: response.transactionId.toString(),
          mintTransactionId: mintResponse.transactionId.toString(),
          serialNumbers: mintReceipt.serials,
          createdAt: new Date()
        };
  
        // Store invoice token info
        this.invoiceTokens.set(invoiceId, invoiceToken);
  
        console.log(`Invoice token created: ${tokenId}`);
  
        return invoiceToken;
  
      } catch (error) {
        console.error('Error creating invoice token:', error);
        throw error;
      }
    }
  
    
     // Get invoice token info
     
    getInvoiceToken(invoiceId) {
      return this.invoiceTokens.get(invoiceId);
    }
  
    //Get all invoice tokens for merchant
     
    getMerchantInvoiceTokens(merchantId) {
      const merchantTokens = [];
      for (const [invoiceId, tokenInfo] of this.invoiceTokens.entries()) {
        if (tokenInfo.merchantId === merchantId) {
          merchantTokens.push(tokenInfo);
        }
      }
      return merchantTokens;
    }
  
    // Generate mock investment opportunity for invoice token
     
    generateInvestmentOpportunity(invoiceToken, investmentPercentage = 10) {
      const { metadata } = invoiceToken;
      const investmentAmount = (metadata.amount * investmentPercentage) / 100;
      
      return {
        tokenId: invoiceToken.tokenId,
        invoiceId: invoiceToken.invoiceId,
        title: `${investmentPercentage}% of Invoice #${invoiceToken.invoiceId}`,
        description: `Invest in ${investmentPercentage}% of invoice for ${metadata.serviceType}`,
        investmentAmount: investmentAmount,
        totalInvoiceAmount: metadata.amount,
        currency: metadata.currency,
        expectedReturn: investmentAmount * 1.1, // 10% return (mock)
        dueDate: metadata.dueDate,
        riskLevel: 'Medium',
        merchantId: metadata.merchantId,
        createdAt: invoiceToken.createdAt
      };
    }
  
    //Get all available investment opportunities
     
    getInvestmentOpportunities(limit = 10) {
      const opportunities = [];
      let count = 0;
      
      for (const [invoiceId, tokenInfo] of this.invoiceTokens.entries()) {
        if (count >= limit) break;
        
        // Generate different investment percentages
        const percentages = [5, 10, 15, 20, 25];
        const percentage = percentages[count % percentages.length];
        
        opportunities.push(
          this.generateInvestmentOpportunity(tokenInfo, percentage)
        );
        count++;
      }
      
      return opportunities;
    }
  }
  
  module.exports = new InvoiceService();