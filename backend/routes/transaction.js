const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Get account transaction history
router.get('/:accountId', transactionController.getAccountTransactions);

// Get custodial account transaction history by userId
router.get('/custodial/:userId', transactionController.getCustodialAccountTransactions);

// Get specific transaction details
router.get('/details/:transactionId', transactionController.getTransactionDetails);

// Get payment system transaction history
router.get('/payments/history', transactionController.getPaymentTransactions);

// Get transaction statistics
router.get('/stats/overview', transactionController.getTransactionStats);

module.exports = router;