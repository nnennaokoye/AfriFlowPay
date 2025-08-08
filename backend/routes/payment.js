const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const rateLimiters = require('../middleware/rateLimiting');

// Generate QR code for payment
router.post('/generate-qr', rateLimiters.payments, paymentController.generateQRCode);

// Process payment transaction
router.post('/process', rateLimiters.payments, paymentController.processPayment);

// Get payment status by nonce
router.get('/status/:nonce', rateLimiters.balanceQueries, paymentController.getPaymentStatus);

// Validate payment request
router.post('/validate', rateLimiters.payments, paymentController.validatePaymentRequest);

// Get merchant payment requests history
router.get('/history', rateLimiters.balanceQueries, paymentController.getPaymentHistory);

// Cancel a payment request by nonce
router.post('/cancel/:nonce', rateLimiters.payments, paymentController.cancelPaymentRequest);

module.exports = router;