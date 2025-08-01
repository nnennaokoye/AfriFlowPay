const express = require('express');
const router = express.Router();
const directDepositController = require('../controllers/directDepositController');

// Initiate direct deposit
router.post('/initiate', directDepositController.initiateDeposit);

// Get deposit status
router.get('/status/:depositId', directDepositController.getDepositStatus);

// Get user's deposit history
router.get('/history/:userId', directDepositController.getDepositHistory);

// Complete deposit (for demo purposes)
router.post('/complete/:depositId', directDepositController.completeDeposit);

module.exports = router;
