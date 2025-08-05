const invoiceService = require('../services/invoiceService');
const accountService = require('../services/accountService');
const tokenService = require('../services/tokenService');

class InvoiceController {
  /**
   * Create and tokenize invoice using actual Hedera HTS
   */
  async createInvoice(req, res) {
    try {
      const {
        merchantId,
        amount,
        currency = 'USD',
        description,
        dueDate,
        serviceType = 'General Services'
      } = req.body;

      // Validate required fields
      if (!merchantId || !amount || !description || !dueDate) {
        return res.status(400).json({
          success: false,
          errorCode: 'MISSING_REQUIRED_FIELDS',
          message: 'Missing required fields: merchantId, amount, description, dueDate',
          details: {
            canRetry: true,
            suggestedAction: 'Provide all required fields'
          }
        });
      }

      // Validate amount
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_AMOUNT',
          message: 'Amount must be a positive number',
          details: {
            canRetry: true,
            suggestedAction: 'Provide a valid positive amount'
          }
        });
      }

      // Validate due date
      const dueDateObj = new Date(dueDate);
      if (isNaN(dueDateObj.getTime()) || dueDateObj <= new Date()) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_DUE_DATE',
          message: 'Due date must be a valid future date',
          details: {
            canRetry: true,
            suggestedAction: 'Provide a valid future date'
          }
        });
      }

      // Ensure merchant exists or create if needed
      let merchantAccount = accountService.getCustodialAccount(merchantId);
      if (!merchantAccount) {
        try {
          merchantAccount = await accountService.createCustodialAccount(merchantId);
          console.log('✅ Created merchant account for invoice:', merchantId);
        } catch (error) {
          console.error('❌ Error creating merchant account:', error);
          return res.status(400).json({
            success: false,
            errorCode: 'MERCHANT_ACCOUNT_ERROR',
            message: 'Unable to process merchant account',
            details: {
              canRetry: true,
              suggestedAction: 'Contact support or try again'
            }
          });
        }
      }

      // Generate unique invoice ID
      const invoiceId = `INV_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const invoiceData = {
        merchantId,
        invoiceId,
        amount: numericAmount,
        currency,
        description,
        dueDate: dueDateObj.toISOString(),
        serviceType
      };

      console.log('🧾 Creating invoice token on Hedera...');

      // Create actual Hedera token for the invoice
      const invoiceToken = await invoiceService.createInvoiceToken(invoiceData);
      
      console.log('✅ Invoice tokenized successfully:', invoiceToken.tokenId);

      // Return comprehensive invoice data
      const responseData = {
        ...invoiceToken,
        merchantAccount: {
          userId: merchantAccount.userId,
          accountId: merchantAccount.accountId
        },
        paymentInfo: {
          canAcceptHBAR: true,
          canAcceptTokens: tokenService.areTokensCreated ? tokenService.areTokensCreated() : false,
          supportedTokens: (tokenService.areTokensCreated && tokenService.areTokensCreated()) ? ['USDC', 'USDT'] : []
        }
      };

      res.json({
        success: true,
        data: responseData,
        message: 'Invoice successfully tokenized on Hedera network'
      });

    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      
      // FIXED: Use static method instead of this.getErrorResponse
      const errorResponse = InvoiceController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get invoice token details with fresh Hedera data
   */
  async getInvoice(req, res) {
    try {
      const { invoiceId } = req.params;
      const { refresh = false } = req.query;

      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVOICE_ID_REQUIRED',
          message: 'Invoice ID is required'
        });
      }

      const invoiceToken = await invoiceService.getInvoiceToken(invoiceId, refresh === 'true');
      
      if (!invoiceToken) {
        return res.status(404).json({
          success: false,
          errorCode: 'INVOICE_NOT_FOUND',
          message: 'Invoice not found',
          details: {
            canRetry: false,
            suggestedAction: 'Verify the invoice ID is correct'
          }
        });
      }

      res.json({
        success: true,
        data: invoiceToken
      });

    } catch (error) {
      console.error('❌ Error getting invoice:', error);
      
      const errorResponse = InvoiceController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get merchant's invoice tokens
   */
  async getMerchantInvoices(req, res) {
    try {
      const { merchantId } = req.params;
      const { status, limit = 50, offset = 0 } = req.query;

      if (!merchantId) {
        return res.status(400).json({
          success: false,
          errorCode: 'MERCHANT_ID_REQUIRED',
          message: 'Merchant ID is required'
        });
      }

      const invoices = invoiceService.getMerchantInvoiceTokens(merchantId);
      
      // Filter by status if provided
      let filteredInvoices = invoices;
      if (status) {
        filteredInvoices = invoices.filter(invoice => invoice.status === status);
      }

      // Apply pagination
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          invoices: paginatedInvoices,
          pagination: {
            total: filteredInvoices.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: endIndex < filteredInvoices.length
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting merchant invoices:', error);
      
      const errorResponse = InvoiceController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get investment opportunities
   */
  async getInvestmentOpportunities(req, res) {
    try {
      const { limit = 10, minAmount, maxAmount, currency } = req.query;

      const opportunities = invoiceService.getInvestmentOpportunities(parseInt(limit));
      
      // Apply filters
      let filteredOpportunities = opportunities;
      
      if (minAmount) {
        filteredOpportunities = filteredOpportunities.filter(
          opp => opp.investmentAmount >= parseFloat(minAmount)
        );
      }
      
      if (maxAmount) {
        filteredOpportunities = filteredOpportunities.filter(
          opp => opp.investmentAmount <= parseFloat(maxAmount)
        );
      }
      
      if (currency) {
        filteredOpportunities = filteredOpportunities.filter(
          opp => opp.currency.toLowerCase() === currency.toLowerCase()
        );
      }

      res.json({
        success: true,
        data: {
          opportunities: filteredOpportunities,
          total: filteredOpportunities.length,
          filters: {
            minAmount: minAmount || null,
            maxAmount: maxAmount || null,
            currency: currency || null
          }
        },
        message: 'Investment opportunities retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error getting investment opportunities:', error);
      
      const errorResponse = InvoiceController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Generate investment opportunity for specific invoice
   */
  async getInvoiceInvestment(req, res) {
    try {
      const { invoiceId } = req.params;
      const { percentage = 10 } = req.query;

      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVOICE_ID_REQUIRED',
          message: 'Invoice ID is required'
        });
      }

      const invoiceToken = await invoiceService.getInvoiceToken(invoiceId);
      if (!invoiceToken) {
        return res.status(404).json({
          success: false,
          errorCode: 'INVOICE_NOT_FOUND',
          message: 'Invoice not found',
          details: {
            canRetry: false,
            suggestedAction: 'Verify the invoice ID is correct'
          }
        });
      }

      const investmentPercentage = parseInt(percentage);
      if (isNaN(investmentPercentage) || investmentPercentage <= 0 || investmentPercentage > 100) {
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

      const investment = invoiceService.generateInvestmentOpportunity(
        invoiceToken, 
        investmentPercentage
      );

      res.json({
        success: true,
        data: investment
      });

    } catch (error) {
      console.error('❌ Error generating investment opportunity:', error);
      
      const errorResponse = InvoiceController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(req, res) {
    try {
      const stats = invoiceService.getInvoiceStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error getting invoice stats:', error);
      
      const errorResponse = InvoiceController.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Search invoices by criteria
   */
  async searchInvoices(req, res) {
    try {
      const { merchantId, status, minAmount, maxAmount, tokenId } = req.query;

      const criteria = {};
      if (merchantId) criteria.merchantId = merchantId;
      if (status) criteria.status = status;
      if (minAmount) criteria.minAmount = parseFloat(minAmount);
      if (maxAmount) criteria.maxAmount = parseFloat(maxAmount);
      if (tokenId) criteria.tokenId = tokenId;

      const results = invoiceService.searchInvoices(criteria);

      res.json({
        success: true,
        data: {
          results,
          total: results.length,
          criteria
        }
      });

    } catch (error) {
      console.error('❌ Error searching invoices:', error);
      
      const errorResponse = InvoiceController.getErrorResponse(error);
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
      'MISSING_REQUIRED_FIELDS': {
        statusCode: 400,
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Missing required fields',
        details: { canRetry: true, suggestedAction: 'Provide all required fields' }
      },
      'INVALID_AMOUNT': {
        statusCode: 400,
        code: 'INVALID_AMOUNT',
        message: 'Invalid amount provided',
        details: { canRetry: true, suggestedAction: 'Provide a valid positive amount' }
      },
      'INVALID_DUE_DATE': {
        statusCode: 400,
        code: 'INVALID_DUE_DATE',
        message: 'Invalid due date provided',
        details: { canRetry: true, suggestedAction: 'Provide a valid future date' }
      },
      'INVOICE_NOT_FOUND': {
        statusCode: 404,
        code: 'INVOICE_NOT_FOUND',
        message: 'Invoice not found',
        details: { canRetry: false, suggestedAction: 'Verify the invoice ID' }
      },
      'MEMO_TOO_LONG': {
        statusCode: 400,
        code: 'MEMO_TOO_LONG',
        message: 'Invoice description too long for token creation',
        details: { canRetry: true, suggestedAction: 'Shorten the invoice description' }
      }
    };

    const errorCode = error.code || error.message;
    return errorMappings[errorCode] || {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: { 
        canRetry: true, 
        suggestedAction: 'Please try again or contact support',
        originalError: error.message 
      }
    };
  }
}

module.exports = new InvoiceController();