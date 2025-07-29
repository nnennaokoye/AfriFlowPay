const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Generate QR code for payment
router.post('/generate-qr', paymentController.generateQRCode);

// Process payment transaction
router.post('/process', paymentController.processPayment);

// Get payment status by nonce
router.get('/status/:nonce', paymentController.getPaymentStatus);

// Validate payment request
router.post('/validate', paymentController.validatePaymentRequest);

module.exports = router;