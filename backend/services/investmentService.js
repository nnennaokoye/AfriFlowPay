const crypto = require('crypto');
const accountService = require('./accountService');
const paymentService = require('./paymentService');
const invoiceService = require('./invoiceService');

class InvestmentService {
  constructor() {
    // Store all investments
    this.investments = new Map(); // investmentId -> investment details
    this.investorPortfolios = new Map(); // userId -> portfolio data
    this.investmentOpportunities = new Map(); // opportunityId -> opportunity details
  }

  /**
   * Create an investment opportunity from an invoice
   */
  async createInvestmentOpportunity(invoiceId, investmentPercentage, minimumInvestment = 10) {
    try {
      const invoiceToken = await invoiceService.getInvoiceToken(invoiceId);
      if (!invoiceToken) {
        throw new Error('INVOICE_NOT_FOUND');
      }

      if (invoiceToken.status !== 'active') {
        throw new Error('INVOICE_NOT_ACTIVE');
      }

      const opportunityId = `opp_${invoiceId}_${investmentPercentage}_${Date.now()}`;
      const { metadata } = invoiceToken;
      
      const totalInvestmentAmount = (metadata.amount * investmentPercentage) / 100;
      
      const opportunity = {
        id: opportunityId,
        invoiceId,
        tokenId: invoiceToken.tokenId,
        title: `${investmentPercentage}% of Invoice #${invoiceId}`,
        description: `Invest in ${investmentPercentage}% of invoice for ${metadata.serviceType}`,
        totalInvestmentAmount,
        investmentPercentage,
        minimumInvestment,
        maximumInvestors: 10, // Max 10 investors per opportunity
        totalInvoiceAmount: metadata.amount,
        currency: metadata.currency,
        expectedReturn: totalInvestmentAmount * 1.15, // 15% return
        expectedReturnPercentage: 15,
        dueDate: metadata.dueDate,
        riskLevel: 'Medium',
        merchantId: metadata.merchantId,
        status: 'active',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        
        // Investment tracking
        currentInvestments: [],
        totalInvested: 0,
        remainingAmount: totalInvestmentAmount,
        investorCount: 0,
        isFunded: false,
        
        // Metadata
        hederaTokenId: invoiceToken.tokenId,
        serialNumber: invoiceToken.serialNumbers ? invoiceToken.serialNumbers[0] : null
      };

      this.investmentOpportunities.set(opportunityId, opportunity);
      
      console.log(`✅ Investment opportunity created: ${opportunityId}`);
      return opportunity;

    } catch (error) {
      console.error('❌ Error creating investment opportunity:', error);
      throw error;
    }
  }

  /**
   * Process investment from any user (customer/merchant/anyone)
   */
  async processInvestment(opportunityId, investorUserId, investmentAmount) {
    try {
      console.log(`💰 Processing investment: ${investmentAmount} from ${investorUserId} into ${opportunityId}`);

      // Get investment opportunity
      const opportunity = this.investmentOpportunities.get(opportunityId);
      if (!opportunity) {
        throw new Error('INVESTMENT_OPPORTUNITY_NOT_FOUND');
      }

      // Validate opportunity status
      if (opportunity.status !== 'active') {
        throw new Error('INVESTMENT_OPPORTUNITY_NOT_ACTIVE');
      }

      if (new Date() > opportunity.expiresAt) {
        opportunity.status = 'expired';
        throw new Error('INVESTMENT_OPPORTUNITY_EXPIRED');
      }

      if (opportunity.isFunded) {
        throw new Error('INVESTMENT_OPPORTUNITY_FULLY_FUNDED');
      }

      // Validate investment amount
      const numericAmount = parseFloat(investmentAmount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('INVALID_INVESTMENT_AMOUNT');
      }

      if (numericAmount < opportunity.minimumInvestment) {
        throw new Error('INVESTMENT_BELOW_MINIMUM');
      }

      if (numericAmount > opportunity.remainingAmount) {
        throw new Error('INVESTMENT_EXCEEDS_REMAINING');
      }

      // Check if investor has custodial account
      const investorAccount = accountService.getCustodialAccount(investorUserId);
      if (!investorAccount) {
        throw new Error('INVESTOR_ACCOUNT_NOT_FOUND');
      }

      // Check investor balance
      const investorBalance = await accountService.getBalance(investorUserId);
      if (investorBalance.hbar < numericAmount) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      // Get merchant account for receiving investment
      const merchantAccount = accountService.getCustodialAccount(opportunity.merchantId);
      if (!merchantAccount) {
        throw new Error('MERCHANT_ACCOUNT_NOT_FOUND');
      }

      // Generate investment ID
      const investmentId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // Create investment record
      const investment = {
        id: investmentId,
        opportunityId,
        invoiceId: opportunity.invoiceId,
        investorUserId,
        investorAccountId: investorAccount.accountId,
        merchantId: opportunity.merchantId,
        merchantAccountId: merchantAccount.accountId,
        amount: numericAmount,
        currency: opportunity.currency,
        investmentDate: new Date(),
        status: 'processing',
        expectedReturn: (numericAmount / opportunity.totalInvestmentAmount) * opportunity.expectedReturn,
        expectedReturnPercentage: opportunity.expectedReturnPercentage,
        dueDate: opportunity.dueDate,
        hederaTransactionId: null,
        paymentNonce: null
      };

      // Process payment from investor to merchant
      console.log(`💸 Transferring ${numericAmount} HBAR from investor to merchant`);
      const transferResult = await accountService.transferFunds(
        investorUserId, 
        opportunity.merchantId, 
        numericAmount, 
        'HBAR'
      );

      // Update investment with payment details
      investment.hederaTransactionId = transferResult.transactionId;
      investment.status = 'completed';
      investment.completedAt = new Date();

      // Store investment
      this.investments.set(investmentId, investment);

      // Update opportunity
      opportunity.currentInvestments.push(investmentId);
      opportunity.totalInvested += numericAmount;
      opportunity.remainingAmount -= numericAmount;
      opportunity.investorCount++;

      // Check if opportunity is fully funded
      if (opportunity.remainingAmount <= 0) {
        opportunity.isFunded = true;
        opportunity.status = 'funded';
        opportunity.fundedAt = new Date();
      }

      // Update investor portfolio
      this.updateInvestorPortfolio(investorUserId, investment);

      console.log(`✅ Investment completed: ${investmentId}`);
      console.log(`📊 Opportunity status: ${opportunity.totalInvested}/${opportunity.totalInvestmentAmount} funded`);

      return {
        investment,
        opportunity: {
          id: opportunity.id,
          totalInvested: opportunity.totalInvested,
          remainingAmount: opportunity.remainingAmount,
          isFunded: opportunity.isFunded,
          investorCount: opportunity.investorCount
        },
        transferDetails: transferResult
      };

    } catch (error) {
      console.error('❌ Error processing investment:', error);
      throw error;
    }
  }

  /**
   * Update investor portfolio
   */
  updateInvestorPortfolio(investorUserId, investment) {
    let portfolio = this.investorPortfolios.get(investorUserId);
    
    if (!portfolio) {
      portfolio = {
        userId: investorUserId,
        totalInvested: 0,
        totalExpectedReturn: 0,
        activeInvestments: 0,
        completedInvestments: 0,
        investments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Add investment to portfolio
    portfolio.investments.push(investment.id);
    portfolio.totalInvested += investment.amount;
    portfolio.totalExpectedReturn += investment.expectedReturn;
    
    if (investment.status === 'completed') {
      portfolio.activeInvestments++;
    }
    
    portfolio.updatedAt = new Date();
    
    this.investorPortfolios.set(investorUserId, portfolio);
    
    console.log(`📈 Updated portfolio for investor ${investorUserId}`);
    return portfolio;
  }

  /**
   * Get investor portfolio
   */
  getInvestorPortfolio(investorUserId) {
    const portfolio = this.investorPortfolios.get(investorUserId);
    if (!portfolio) {
      return {
        userId: investorUserId,
        totalInvested: 0,
        totalExpectedReturn: 0,
        activeInvestments: 0,
        completedInvestments: 0,
        investments: [],
        message: 'No investments found'
      };
    }

    // Get detailed investment data
    const detailedInvestments = portfolio.investments.map(investmentId => {
      const investment = this.investments.get(investmentId);
      const opportunity = this.investmentOpportunities.get(investment?.opportunityId);
      
      return {
        investmentId,
        investment,
        opportunity: opportunity ? {
          id: opportunity.id,
          title: opportunity.title,
          status: opportunity.status,
          isFunded: opportunity.isFunded
        } : null
      };
    });

    return {
      ...portfolio,
      detailedInvestments
    };
  }

  /**
   * Get investment opportunity details
   */
  getInvestmentOpportunity(opportunityId) {
    return this.investmentOpportunities.get(opportunityId);
  }

  /**
   * Get all available investment opportunities
   */
  getAvailableOpportunities(filters = {}) {
    const { status = 'active', minAmount, maxAmount, riskLevel, limit = 20 } = filters;
    
    let opportunities = Array.from(this.investmentOpportunities.values());
    
    // Apply filters
    opportunities = opportunities.filter(opp => {
      if (status && opp.status !== status) return false;
      if (minAmount && opp.minimumInvestment < minAmount) return false;
      if (maxAmount && opp.minimumInvestment > maxAmount) return false;
      if (riskLevel && opp.riskLevel !== riskLevel) return false;
      return true;
    });

    // Sort by creation date (newest first)
    opportunities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply limit
    return opportunities.slice(0, limit);
  }

  /**
   * Get investment details
   */
  getInvestment(investmentId) {
    const investment = this.investments.get(investmentId);
    if (!investment) return null;

    const opportunity = this.investmentOpportunities.get(investment.opportunityId);
    
    return {
      investment,
      opportunity: opportunity ? {
        id: opportunity.id,
        title: opportunity.title,
        status: opportunity.status,
        totalInvestmentAmount: opportunity.totalInvestmentAmount,
        isFunded: opportunity.isFunded
      } : null
    };
  }

  /**
   * Get investment statistics
   */
  getInvestmentStats() {
    const totalOpportunities = this.investmentOpportunities.size;
    const totalInvestments = this.investments.size;
    const totalInvestors = this.investorPortfolios.size;
    
    let totalInvestedAmount = 0;
    let totalExpectedReturns = 0;
    let activeOpportunities = 0;
    let fundedOpportunities = 0;

    for (const opportunity of this.investmentOpportunities.values()) {
      totalInvestedAmount += opportunity.totalInvested;
      if (opportunity.status === 'active') activeOpportunities++;
      if (opportunity.isFunded) fundedOpportunities++;
    }

    for (const investment of this.investments.values()) {
      totalExpectedReturns += investment.expectedReturn;
    }

    return {
      totalOpportunities,
      activeOpportunities,
      fundedOpportunities,
      totalInvestments,
      totalInvestors,
      totalInvestedAmount,
      totalExpectedReturns,
      averageInvestmentSize: totalInvestments > 0 ? totalInvestedAmount / totalInvestments : 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Simulate return distribution (for demo purposes)
   */
  async distributeReturns(investmentId) {
    try {
      const investment = this.investments.get(investmentId);
      if (!investment) {
        throw new Error('INVESTMENT_NOT_FOUND');
      }

      if (investment.status !== 'completed') {
        throw new Error('INVESTMENT_NOT_COMPLETED');
      }

      // Simulate return payment
      const returnAmount = investment.expectedReturn;
      
      // In a real system, this would transfer funds from merchant to investor
      console.log(`Distributing return: ${returnAmount} HBAR to investor ${investment.investorUserId}`);

      investment.status = 'returned';
      investment.returnedAt = new Date();
      investment.actualReturn = returnAmount;

      return {
        investmentId,
        returnAmount,
        investorUserId: investment.investorUserId,
        status: 'returned'
      };

    } catch (error) {
      console.error('Error distributing returns:', error);
      throw error;
    }
  }
}

module.exports = new InvestmentService();