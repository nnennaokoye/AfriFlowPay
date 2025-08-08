const logger = require('../utils/logger');
const ValidationUtils = require('../utils/validation');

class SecurityMiddleware {
  /**
   * Request sanitization middleware
   */
  static sanitizeRequest(req, res, next) {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
          if (typeof req.body[key] === 'string') {
            req.body[key] = ValidationUtils.sanitizeInput(req.body[key]);
          }
        }
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        for (const key in req.query) {
          if (typeof req.query[key] === 'string') {
            req.query[key] = ValidationUtils.sanitizeInput(req.query[key]);
          }
        }
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        for (const key in req.params) {
          if (typeof req.params[key] === 'string') {
            req.params[key] = ValidationUtils.sanitizeInput(req.params[key]);
          }
        }
      }

      next();
    } catch (error) {
      logger.error('Error in request sanitization middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Request processing error'
      });
    }
  }

  /**
   * Request logging middleware
   */
  static logRequest(req, res, next) {
    const startTime = Date.now();
    
    // Log incoming request
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Override res.json to log responses
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      // Log response
      logger.info('Outgoing response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        success: data?.success || false,
        timestamp: new Date().toISOString()
      });

      return originalJson.call(this, data);
    };

    next();
  }

  /**
   * Content type validation middleware
   */
  static validateContentType(req, res, next) {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      
      if (!contentType || !contentType.includes('application/json')) {
        logger.warn('Invalid content type', {
          method: req.method,
          url: req.url,
          contentType,
          ip: req.ip
        });
        
        return res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json'
        });
      }
    }
    
    next();
  }

  /**
   * Request size validation middleware
   */
  static validateRequestSize(req, res, next) {
    const maxSize = 1024 * 1024; // 1MB
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      logger.warn('Request too large', {
        method: req.method,
        url: req.url,
        contentLength,
        maxSize,
        ip: req.ip
      });
      
      return res.status(413).json({
        success: false,
        message: 'Request entity too large'
      });
    }
    
    next();
  }

  /**
   * Security headers middleware
   */
  static addSecurityHeaders(req, res, next) {
    // Add security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'"
    });
    
    next();
  }

  /**
   * API key validation middleware (for future use)
   */
  static validateApiKey(req, res, next) {
    // Skip API key validation in development
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const apiKey = req.get('X-API-Key');
    
    if (!apiKey) {
      logger.warn('Missing API key', {
        method: req.method,
        url: req.url,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'API key required'
      });
    }

    // Validate API key (implement your validation logic here)
    // For now, we'll just check if it exists
    if (apiKey !== process.env.API_KEY && process.env.API_KEY) {
      logger.warn('Invalid API key', {
        method: req.method,
        url: req.url,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }
    
    next();
  }

  /**
   * Error handling middleware
   */
  static handleErrors(err, req, res, next) {
    logger.error('Unhandled error in middleware', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip
    });

    // Don't expose error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      ...(isDevelopment && { error: err.message, stack: err.stack })
    });
  }
}

module.exports = SecurityMiddleware;
