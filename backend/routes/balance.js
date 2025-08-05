const express = require('express');
const router = express.Router();
const balanceController = require('../controllers/balanceController');

// Get account balances (HBAR + tokens)
router.get('/:accountId', balanceController.getAccountBalances);

// Get custodial account balances by userId
router.get('/custodial/:userId', balanceController.getCustodialAccountBalances);

// Get token information using TokenInfoQuery
router.get('/token/:tokenId/info', balanceController.getTokenInfo);

// Get system tokens overview (USDC/USDT info)
router.get('/tokens/overview', balanceController.getTokensOverview);

module.exports = router;