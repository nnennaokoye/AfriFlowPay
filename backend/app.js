const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const paymentRoutes = require('./routes/payment');
const accountRoutes = require('./routes/account');
const yellowCardRoutes = require('./routes/yellowcard');
const invoiceRoutes = require('./routes/invoice');
const walletRoutes = require('./routes/wallet');
const withdrawalRoutes = require('./routes/withdrawal');
const directDepositRoutes = require('./routes/directDeposit');

// Import services for initialization
const tokenService = require('./services/tokenService');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/yellowcard', yellowCardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/direct-deposit', directDepositRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    project: 'AfriPayFlow'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    project: 'AfriPayFlow',
    description: 'Gasless crypto payments for Africa',
    version: '1.0.0',
    endpoints: {
      accounts: {
        'POST /api/accounts/create': 'Create new custodial account',
        'GET /api/accounts/:userId/balance': 'Get account balance',
        'GET /api/accounts/:userId/transactions': 'Get transaction history',
        'GET /api/accounts/:userId/info': 'Get account info'
      },
      payments: {
        'POST /api/payments/generate-qr': 'Generate payment QR code',
        'POST /api/payments/process': 'Process payment',
        'GET /api/payments/status/:nonce': 'Get payment status',
        'POST /api/payments/validate': 'Validate payment request'
      },
      yellowcard: {
        'GET /api/yellowcard/countries': 'Get supported countries',
        'GET /api/yellowcard/payment-methods/:countryCode': 'Get payment methods',
        'POST /api/yellowcard/purchase': 'Purchase crypto',
        'GET /api/yellowcard/history/:userId': 'Get purchase history'
      },
      invoices: {
        'POST /api/invoices/create': 'Create and tokenize invoice',
        'GET /api/invoices/:invoiceId': 'Get invoice details',
        'GET /api/invoices/merchant/:merchantId': 'Get merchant invoices',
        'GET /api/invoices/investments/opportunities': 'Get investment opportunities'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableEndpoints: '/api'
  });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('Starting AfriPayFlow backend server...');
    
    // Initialize mock tokens
    console.log('Initializing Hedera services...');
    await tokenService.createMockTokens();
    
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`AfriPayFlow server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`API Documentation: http://localhost:${PORT}/api`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start AfriPayFlow server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('AfriPayFlow server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('AfriPayFlow server shutting down gracefully...');
  process.exit(0);
});

startServer();

module.exports = app;