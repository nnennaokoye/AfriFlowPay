const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const rateLimiters = require('../middleware/rateLimiting');

// Create custodial account for testing
router.post('/create', rateLimiters.accountCreation, accountController.createAccount);

// Debug: List all custodial accounts
router.get('/debug/list', rateLimiters.general, accountController.listCustodialAccounts);

// Get custodial account balance by userId
router.get('/custodial/:userId/balance', rateLimiters.balanceQueries, accountController.getCustodialBalance);

// Get custodial account transaction history by userId
router.get('/custodial/:userId/transactions', rateLimiters.transactionQueries, accountController.getCustodialTransactionHistory);

// Get account balance by wallet address
router.get('/:walletAddress/balance', rateLimiters.balanceQueries, accountController.getBalance);

// Get transaction history by wallet address
router.get('/:walletAddress/transactions', rateLimiters.balanceQueries, accountController.getTransactionHistory);

// Get account info by wallet address
router.get('/:walletAddress/info', rateLimiters.balanceQueries, accountController.getAccountInfo);

// ========== PASSWORD-ONLY AUTHENTICATION ROUTES ==========

// Create account with password-only authentication
router.post('/auth/create', rateLimiters.accountCreation, accountController.createAccountWithPassword);

// Login with password-only authentication
router.post('/auth/login', rateLimiters.accountCreation, accountController.loginWithPassword);

module.exports = router;