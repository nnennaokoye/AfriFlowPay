const logger = require('./logger');

class ValidationUtils {
  /**
   * Validate Hedera account ID format
   */
  static isValidAccountId(accountId) {
    if (!accountId || typeof accountId !== 'string') {
      return false;
    }
    return /^0\.0\.\d+$/.test(accountId);
  }

  /**
   * Validate token type
   */
  static isValidTokenType(tokenType) {
    const validTypes = ['HBAR', 'USDC', 'USDT'];
    return validTypes.includes(tokenType);
  }

  /**
   * Validate amount
   */
  static isValidAmount(amount) {
    if (amount === null || amount === undefined) {
      return true; // Allow null/undefined for flexible payments
    }
    return typeof amount === 'number' && amount > 0;
  }

  /**
   * Validate user ID
   */
  static isValidUserId(userId) {
    return userId && typeof userId === 'string' && userId.trim().length > 0;
  }

  /**
   * Validate payment nonce
   */
  static isValidNonce(nonce) {
    return nonce && typeof nonce === 'string' && /^[a-f0-9]{32}$/.test(nonce);
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate request body against schema
   */
  static validateRequest(req, res, schema) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
        }
        
        if (rules.validator && !rules.validator(value)) {
          errors.push(`${field} is invalid`);
        }
        
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be no more than ${rules.maxLength} characters`);
        }
      }
    }
    
    if (errors.length > 0) {
      logger.warn(`Validation failed for ${req.method} ${req.path}:`, errors);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
      return false;
    }
    
    return true;
  }
}

module.exports = ValidationUtils;
