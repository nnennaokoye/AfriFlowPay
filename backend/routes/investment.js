const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investmentController');

// Create investment opportunity from invoice
router.post('/opportunities/create', investmentController.createOpportunity);

// Get all available investment opportunities (with filtering)
router.get('/opportunities', investmentController.getOpportunities);

// Get specific investment opportunity details
router.get('/opportunities/:opportunityId', investmentController.getOpportunity);

// Process investment - ANY user (customer/merchant/anyone) can invest
router.post('/invest', investmentController.processInvestment);

// Get investor portfolio - ANY user can check their investments
router.get('/portfolio/:userId', investmentController.getInvestorPortfolio);

// Get specific investment details
router.get('/:investmentId', investmentController.getInvestment);

// Get investment statistics and overview
router.get('/stats/overview', investmentController.getInvestmentStats);

// Distribute returns (demo function)
router.post('/:investmentId/distribute-returns', investmentController.distributeReturns);

module.exports = router;