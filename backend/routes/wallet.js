const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

// Connect wallet and determine role
router.post('/connect', walletController.connectWallet);

// Get session info
router.get('/session/:sessionId', walletController.getSession);

// Disconnect wallet
router.post('/disconnect', walletController.disconnectWallet);

// Validate session (middleware endpoint)
router.post('/validate-session', walletController.validateSession);

module.exports = router;
