// FIXED: investmentController.js
// Replace your existing controller with this fixed version

const investmentService = require('../services/investmentService');
const accountService = require('../services/accountService');
const invoiceService = require('../services/invoiceService');

class InvestmentController {
  /**
   * Create investment opportunity from invoice
   * POST /api/investments/opportunities/create
   */
  async createOpportunity(req, res) {
    try {
      const { 
        invoiceId, 
        investmentPercentage, 
        minimumInvestment = 10 
      } = req.body;

      // Validate required fields
      if (!invoiceId || !investmentPercentage) {
        return res.status(400).json({
          success: false,
          errorCode: 'MISSING_REQUIRED_FIELDS',
          message: 'Missing required fields: invoiceId, investmentPercentage',
          details: {
            canRetry: true,
            suggestedAction: 'Provide invoiceId and investmentPercentage'
          }
        });
      }

      // Validate percentage
      const percentage = parseFloat(investmentPercentage);
      if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_PERCENTAGE',
          message: 'Investment percentage must be between 1 and 100',
          details: {
            canRetry: true,
            suggestedAction: 'Provide a valid percentage between 1 and 100'
          }
        });
      }

      console.log(`📈 Creating investment opportunity for invoice ${invoiceId}`);

      const opportunity = await investmentService.createInvestmentOpportunity(
        invoiceId, 
        percentage, 
        parseFloat(minimumInvestment)
      );

      res.json({
        success: true,
        data: opportunity,
        message: 'Investment opportunity created successfully'
      });

    } catch (error) {
      console.error('❌ Error creating investment opportunity:', error);
      
      const errorResponse = InvestmentController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Process investment - ANY user can invest
   * POST /api/investments/invest
   */
  async processInvestment(req, res) {
    try {
      const { 
        opportunityId, 
        investorUserId, 
        investmentAmount 
      } = req.body;

      // Validate required fields
      if (!opportunityId || !investorUserId || !investmentAmount) {
        return res.status(400).json({
          success: false,
          errorCode: 'MISSING_REQUIRED_FIELDS',
          message: 'Missing required fields: opportunityId, investorUserId, investmentAmount',
          details: {
            canRetry: true,
            suggestedAction: 'Provide all required fields'
          }
        });
      }

      // Validate investment amount
      const amount = parseFloat(investmentAmount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_AMOUNT',
          message: 'Investment amount must be a positive number',
          details: {
            canRetry: true,
            suggestedAction: 'Provide a valid positive amount'
          }
        });
      }

      // Check if investor has custodial account
      const investorAccount = accountService.getCustodialAccount(investorUserId);
      if (!investorAccount) {
        return res.status(404).json({
          success: false,
          errorCode: 'INVESTOR_ACCOUNT_NOT_FOUND',
          message: 'Investor account not found. Please create an account first.',
          details: {
            canRetry: false,
            suggestedAction: 'Create a custodial account before investing'
          }
        });
      }

      console.log(`💰 Processing investment: ${amount} HBAR from ${investorUserId}`);

      const result = await investmentService.processInvestment(
        opportunityId, 
        investorUserId, 
        amount
      );

      res.json({
        success: true,
        data: result,
        message: 'Investment processed successfully'
      });

    } catch (error) {
      console.error('❌ Error processing investment:', error);
      
      const errorResponse = InvestmentController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get available investment opportunities
   * GET /api/investments/opportunities
   */
  async getOpportunities(req, res) {
    try {
      const { 
        status = 'active', 
        minAmount, 
        maxAmount, 
        riskLevel, 
        limit = 20 
      } = req.query;

      const filters = {
        status,
        limit: parseInt(limit)
      };

      if (minAmount) filters.minAmount = parseFloat(minAmount);
      if (maxAmount) filters.maxAmount = parseFloat(maxAmount);
      if (riskLevel) filters.riskLevel = riskLevel;

      const opportunities = investmentService.getAvailableOpportunities(filters);

      res.json({
        success: true,
        data: {
          opportunities,
          total: opportunities.length,
          filters
        },
        message: 'Investment opportunities retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error getting investment opportunities:', error);
      
      const errorResponse = InvestmentController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get specific investment opportunity
   * GET /api/investments/opportunities/:opportunityId
   */
  async getOpportunity(req, res) {
    try {
      const { opportunityId } = req.params;

      if (!opportunityId) {
        return res.status(400).json({
          success: false,
          errorCode: 'OPPORTUNITY_ID_REQUIRED',
          message: 'Opportunity ID is required'
        });
      }

      const opportunity = investmentService.getInvestmentOpportunity(opportunityId);

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          errorCode: 'OPPORTUNITY_NOT_FOUND',
          message: 'Investment opportunity not found',
          details: {
            canRetry: false,
            suggestedAction: 'Verify the opportunity ID is correct'
          }
        });
      }

      res.json({
        success: true,
        data: opportunity
      });

    } catch (error) {
      console.error('❌ Error getting investment opportunity:', error);
      
      const errorResponse = InvestmentController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get investor portfolio - ANY user can check their investments
   * GET /api/investments/portfolio/:userId
   */
  async getInvestorPortfolio(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          errorCode: 'USER_ID_REQUIRED',
          message: 'User ID is required'
        });
      }

      // Check if user has custodial account
      const userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        return res.status(404).json({
          success: false,
          errorCode: 'USER_ACCOUNT_NOT_FOUND',
          message: 'User account not found',
          details: {
            canRetry: false,
            suggestedAction: 'Create a custodial account first'
          }
        });
      }

      const portfolio = investmentService.getInvestorPortfolio(userId);

      res.json({
        success: true,
        data: {
          ...portfolio,
          userAccount: {
            userId: userAccount.userId,
            accountId: userAccount.accountId,
            createdAt: userAccount.createdAt
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting investor portfolio:', error);
      
      const errorResponse = InvestmentController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get specific investment details
   * GET /api/investments/:investmentId
   */
  async getInvestment(req, res) {
    try {
      const { investmentId } = req.params;

      if (!investmentId) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVESTMENT_ID_REQUIRED',
          message: 'Investment ID is required'
        });
      }

      const investmentDetails = investmentService.getInvestment(investmentId);

      if (!investmentDetails) {
        return res.status(404).json({
          success: false,
          errorCode: 'INVESTMENT_NOT_FOUND',
          message: 'Investment not found',
          details: {
            canRetry: false,
            suggestedAction: 'Verify the investment ID is correct'
          }
        });
      }

      res.json({
        success: true,
        data: investmentDetails
      });

    } catch (error) {
      console.error('❌ Error getting investment:', error);
      
      const errorResponse = InvestmentController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get investment statistics
   * GET /api/investments/stats
   */
  async getInvestmentStats(req, res) {
    try {
      const stats = investmentService.getInvestmentStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Error getting investment stats:', error);
      
      const errorResponse = InvestmentController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Distribute returns (demo function)
   * POST /api/investments/:investmentId/distribute-returns
   */
  async distributeReturns(req, res) {
    try {
      const { investmentId } = req.params;

      if (!investmentId) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVESTMENT_ID_REQUIRED',
          message: 'Investment ID is required'
        });
      }

      const result = await investmentService.distributeReturns(investmentId);

      res.json({
        success: true,
        data: result,
        message: 'Returns distributed successfully'
      });

    } catch (error) {
      console.error('❌ Error distributing returns:', error);
      
      const errorResponse = InvestmentController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * FIXED: Static method for error mapping
   */
  static getErrorResponse(error) {
    const errorMappings = {
      'INVOICE_NOT_FOUND': {
        statusCode: 404,
        code: 'INVOICE_NOT_FOUND',
        message: 'Invoice not found',
        details: { canRetry: false, suggestedAction: 'Verify the invoice ID is correct' }
      },
      'INVOICE_NOT_ACTIVE': {
        statusCode: 400,
        code: 'INVOICE_NOT_ACTIVE',
        message: 'Invoice is not active',
        details: { canRetry: false, suggestedAction: 'Only active invoices can have investment opportunities' }
      },
      'INVESTMENT_OPPORTUNITY_NOT_FOUND': {
        statusCode: 404,
        code: 'INVESTMENT_OPPORTUNITY_NOT_FOUND',
        message: 'Investment opportunity not found',
        details: { canRetry: false, suggestedAction: 'Verify the opportunity ID is correct' }
      },
      'INVESTMENT_OPPORTUNITY_EXPIRED': {
        statusCode: 410,
        code: 'INVESTMENT_OPPORTUNITY_EXPIRED',
        message: 'Investment opportunity has expired',
        details: { canRetry: false, suggestedAction: 'Look for other active opportunities' }
      },
      'INVESTMENT_OPPORTUNITY_FULLY_FUNDED': {
        statusCode: 409,
        code: 'INVESTMENT_OPPORTUNITY_FULLY_FUNDED',
        message: 'Investment opportunity is fully funded',
        details: { canRetry: false, suggestedAction: 'Look for other available opportunities' }
      },
      'INSUFFICIENT_FUNDS': {
        statusCode: 402,
        code: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient balance to complete investment',
        details: { canRetry: false, suggestedAction: 'Add more funds to your account or try a smaller amount' }
      },
      'INVESTMENT_BELOW_MINIMUM': {
        statusCode: 400,
        code: 'INVESTMENT_BELOW_MINIMUM',
        message: 'Investment amount below minimum required',
        details: { canRetry: true, suggestedAction: 'Increase investment amount to meet minimum' }
      },
      'INVESTMENT_EXCEEDS_REMAINING': {
        statusCode: 400,
        code: 'INVESTMENT_EXCEEDS_REMAINING',
        message: 'Investment amount exceeds remaining opportunity amount',
        details: { canRetry: true, suggestedAction: 'Reduce investment amount or invest in another opportunity' }
      },
      'INVESTOR_ACCOUNT_NOT_FOUND': {
        statusCode: 404,
        code: 'INVESTOR_ACCOUNT_NOT_FOUND',
        message: 'Investor account not found',
        details: { canRetry: false, suggestedAction: 'Create a custodial account before investing' }
      }
    };

    const errorCode = error.code || error.message;
    return errorMappings[errorCode] || {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred during investment processing',
      details: { 
        canRetry: true, 
        suggestedAction: 'Please try again or contact support',
        originalError: error.message 
      }
    };
  }
}

module.exports = new InvestmentController();