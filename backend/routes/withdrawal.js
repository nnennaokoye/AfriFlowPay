const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const rateLimiters = require('../middleware/rateLimiting');

// Apply rate limiting - methods are already bound in controller constructor
router.post('/request', 
  rateLimiters.withdrawals,
  withdrawalController.requestWithdrawal
);

router.get('/history/:userId', 
  rateLimiters.general,
  withdrawalController.getWithdrawalHistory
);

router.get('/status/:withdrawalId', 
  rateLimiters.general,
  withdrawalController.getWithdrawalStatus
);

module.exports = router;