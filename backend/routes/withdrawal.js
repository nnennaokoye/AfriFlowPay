const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');

// Request withdrawal
router.post('/request', withdrawalController.requestWithdrawal);

// Get withdrawal history
router.get('/history/:userId', withdrawalController.getWithdrawalHistory);

// Get withdrawal status
router.get('/status/:withdrawalId', withdrawalController.getWithdrawalStatus);

module.exports = router;
