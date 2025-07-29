const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

// Create and tokenize invoice
router.post('/create', invoiceController.createInvoice);

// Get invoice details
router.get('/:invoiceId', invoiceController.getInvoice);

// Get merchant's invoices
router.get('/merchant/:merchantId', invoiceController.getMerchantInvoices);

// Get investment opportunities
router.get('/investments/opportunities', invoiceController.getInvestmentOpportunities);

// Get investment opportunity for specific invoice
router.get('/:invoiceId/investment', invoiceController.getInvoiceInvestment);

module.exports = router;