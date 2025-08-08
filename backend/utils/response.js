const logger = require('./logger');

class ResponseUtils {
  /**
   * Send success response
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };
    
    if (details && process.env.NODE_ENV !== 'production') {
      response.details = details;
    }
    
    logger.error(`API Error ${statusCode}: ${message}`, details);
    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(res, errors) {
    return this.error(res, 'Validation failed', 400, { errors });
  }

  /**
   * Send not found response
   */
  static notFound(res, resource = 'Resource') {
    return this.error(res, `${resource} not found`, 404);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401);
  }

  /**
   * Send forbidden response
   */
  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, message, 403);
  }

  /**
   * Handle async controller errors
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        logger.error(`Async handler error in ${req.method} ${req.path}:`, error);
        this.error(res, 'Internal server error', 500, error.message);
      });
    };
  }
}

module.exports = ResponseUtils;
