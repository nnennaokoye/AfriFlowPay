const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create different rate limiters for different endpoint types
const rateLimiters = {
  // Relaxed rate limiting for account creation (development mode)
  accountCreation: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // limit each IP to 50 account creations per windowMs (increased for development)
    message: {
      success: false,
      message: 'Too many account creation attempts. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for account creation from IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many account creation attempts. Please try again later.',
        retryAfter: '15 minutes'
      });
    }
  }),

  // Moderate rate limiting for payment operations
  payments: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 payment operations per minute
    message: {
      success: false,
      message: 'Too many payment requests. Please slow down.',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for payments from IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many payment requests. Please slow down.',
        retryAfter: '1 minute'
      });
    }
  }),

  // Lenient rate limiting for balance queries
  balanceQueries: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, 
    message: {
      success: false,
      message: 'Too many balance queries. Please slow down.',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for balance queries from IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many balance queries. Please slow down.',
        retryAfter: '1 minute'
      });
    }
  }),

  // Separate rate limiting for transaction queries
  transactionQueries: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 transaction queries per minute
    message: {
      success: false,
      message: 'Too many transaction queries. Please slow down.',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for transaction queries from IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many transaction queries. Please slow down.',
        retryAfter: '1 minute'
      });
    }
  }),

  // Moderate rate limiting for invoice creation (prevent spam invoices)
  invoiceCreation: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // limit each IP to 50 invoice creations per 5 minutes 
    message: {
      success: false,
      message: 'Too many invoice creation attempts. Please try again later.',
      retryAfter: '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for invoice creation from IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many invoice creation attempts. Please try again later.',
        retryAfter: '5 minutes'
      });
    }
  }),

  // Moderate rate limiting for withdrawal requests
  withdrawals: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // limit each IP to 20 withdrawal requests per 5 minutes
    message: {
      success: false,
      message: 'Too many withdrawal requests. Please try again later.',
      retryAfter: '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for withdrawals from IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many withdrawal requests. Please try again later.',
        retryAfter: '10 minutes'
      });
    }
  }),

  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`General rate limit exceeded from IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: '15 minutes'
      });
    }
  })
};

module.exports = rateLimiters;
