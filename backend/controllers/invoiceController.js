const invoiceService = require('../services/invoiceService');
const accountService = require('../services/accountService');

class InvoiceController {
  /**
   * Create and tokenize invoice
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
          message: 'Missing required fields: merchantId, amount, description, dueDate'
        });
      }

      // Validate merchant exists
      const merchantAccount = accountService.getCustodialAccount(merchantId);
      if (!merchantAccount) {
        return res.status(404).json({
          success: false,
          message: 'Merchant account not found'
        });
      }

      // Generate unique invoice ID
      const invoiceId = `INV_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const invoiceData = {
        merchantId,
        invoiceId,
        amount: parseFloat(amount),
        currency,
        description,
        dueDate,
        serviceType
      };

      const invoiceToken = await invoiceService.createInvoiceToken(invoiceData);

      res.json({
        success: true,
        data: invoiceToken,
        message: 'Invoice successfully tokenized'
      });

    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create invoice',
        error: error.message
      });
    }
  }

  /**
   * Get invoice token details
   */
  async getInvoice(req, res) {
    try {
      const { invoiceId } = req.params;

      const invoiceToken = invoiceService.getInvoiceToken(invoiceId);
      if (!invoiceToken) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }

      res.json({
        success: true,
        data: invoiceToken
      });

    } catch (error) {
      console.error('Error getting invoice:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get invoice',
        error: error.message
      });
    }
  }

  /**
   * Get merchant's invoice tokens
   */
  async getMerchantInvoices(req, res) {
    try {
      const { merchantId } = req.params;

      const invoices = invoiceService.getMerchantInvoiceTokens(merchantId);

      res.json({
        success: true,
        data: invoices
      });

    } catch (error) {
      console.error('Error getting merchant invoices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get merchant invoices',
        error: error.message
      });
    }
  }

  /**
   * Get investment opportunities
   */
  async getInvestmentOpportunities(req, res) {
    try {
      const { limit = 10 } = req.query;

      const opportunities = invoiceService.getInvestmentOpportunities(parseInt(limit));

      res.json({
        success: true,
        data: opportunities,
        message: 'Investment opportunities retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting investment opportunities:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get investment opportunities',
        error: error.message
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

      const invoiceToken = invoiceService.getInvoiceToken(invoiceId);
      if (!invoiceToken) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }

      const investment = invoiceService.generateInvestmentOpportunity(
        invoiceToken, 
        parseInt(percentage)
      );

      res.json({
        success: true,
        data: investment
      });

    } catch (error) {
      console.error('Error generating investment opportunity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate investment opportunity',
        error: error.message
      });
    }
  }
}

module.exports = new InvoiceController();