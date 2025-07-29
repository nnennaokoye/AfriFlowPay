const express = require('express');
const router = express.Router();
const yellowCardController = require('../controllers/yellowCardController');

// Get supported countries
router.get('/countries', yellowCardController.getSupportedCountries);

// Get payment methods for country
router.get('/payment-methods/:countryCode', yellowCardController.getPaymentMethods);

// Purchase crypto
router.post('/purchase', yellowCardController.purchaseCrypto);

// Get user's purchase history
router.get('/history/:userId', yellowCardController.getPurchaseHistory);

module.exports = router;