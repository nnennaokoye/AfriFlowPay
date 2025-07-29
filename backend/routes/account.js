const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// Create new custodial account
router.post('/create', accountController.createAccount);

// Get account balance
router.get('/:userId/balance', accountController.getBalance);

// Get transaction history
router.get('/:userId/transactions', accountController.getTransactionHistory);

// Get account info
router.get('/:userId/info', accountController.getAccountInfo);

module.exports = router;