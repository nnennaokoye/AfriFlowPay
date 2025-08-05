const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// Create custodial account for testing
router.post('/create', accountController.createAccount);

// Debug: List all custodial accounts
router.get('/debug/list', accountController.listCustodialAccounts);

// Get custodial account balance by userId
router.get('/custodial/:userId/balance', accountController.getCustodialBalance);

// Get custodial account transaction history by userId
router.get('/custodial/:userId/transactions', accountController.getCustodialTransactionHistory);

// Get account balance by wallet address
router.get('/:walletAddress/balance', accountController.getBalance);

// Get transaction history by wallet address
router.get('/:walletAddress/transactions', accountController.getTransactionHistory);

// Get account info by wallet address
router.get('/:walletAddress/info', accountController.getAccountInfo);

module.exports = router;