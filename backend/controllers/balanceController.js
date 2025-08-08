const accountService = require('../services/accountService');
const tokenService = require('../services/tokenService');
const mirrorNodeService = require('../services/mirrorNodeService');

class BalanceController {
  /**
   * Get HBAR and token balances for account
   * GET /api/v1/balances/:accountId
   */
  async getAccountBalances(req, res) {
    try {
      const { accountId } = req.params;
      const { includeTokenInfo = false } = req.query;

      // Validate account ID format
      if (!accountId || !accountId.match(/^0\.0\.\d+$/)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_ACCOUNT_ID',
          message: 'Invalid account ID format. Expected format: 0.0.123456',
          details: {
            canRetry: true,
            suggestedAction: 'Provide a valid Hedera account ID'
          }
        });
      }

      console.log(` Getting balances for account: ${accountId}`);

      // Get account balances using token service
      const balances = await tokenService.getAccountTokenBalances(accountId);

      let detailedTokenBalances = {};
      
      // If requested, get detailed token information
      if (includeTokenInfo === 'true' && balances.tokens) {
        for (const [tokenId, balance] of Object.entries(balances.tokens)) {
          try {
            const detailedBalance = await tokenService.getDetailedTokenBalance(accountId, tokenId);
            detailedTokenBalances[tokenId] = detailedBalance;
          } catch (error) {
            console.warn(`Could not get detailed info for token ${tokenId}:`, error.message);
            detailedTokenBalances[tokenId] = {
              tokenId,
              balance,
              error: 'Could not fetch token details'
            };
          }
        }
      }

      const response = {
        accountId,
        hbar: {
          balance: balances.hbar,
          formatted: `${balances.hbar}`
        },
        tokens: includeTokenInfo === 'true' ? detailedTokenBalances : balances.tokens,
        totalTokenTypes: Object.keys(balances.tokens || {}).length,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: response
      });

    } catch (error) {
      console.error(' Error getting account balances:', error);
      
      const errorResponse = this.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get custodial account balances by userId
   * GET /api/v1/balances/custodial/:userId
   */
  async getCustodialAccountBalances(req, res) {
    try {
      const { userId } = req.params;
      const { includeTokenInfo = false } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          errorCode: 'USER_ID_REQUIRED',
          message: 'User ID is required'
        });
      }

      // Get custodial account
      const custodialAccount = accountService.getCustodialAccount(userId);
      if (!custodialAccount) {
        return res.status(404).json({
          success: false,
          errorCode: 'CUSTODIAL_ACCOUNT_NOT_FOUND',
          message: 'Custodial account not found for this user',
          details: {
            canRetry: false,
            suggestedAction: 'Create a custodial account first'
          }
        });
      }

      console.log(` Getting custodial balances for user: ${userId} (${custodialAccount.accountId})`);

      // Get balances for the custodial account
      const balances = await tokenService.getAccountTokenBalances(custodialAccount.accountId);

      let detailedTokenBalances = {};
      
      if (includeTokenInfo === 'true' && balances.tokens) {
        for (const [tokenId, balance] of Object.entries(balances.tokens)) {
          try {
            const detailedBalance = await tokenService.getDetailedTokenBalance(custodialAccount.accountId, tokenId);
            detailedTokenBalances[tokenId] = detailedBalance;
          } catch (error) {
            console.warn(`Could not get detailed info for token ${tokenId}:`, error.message);
            detailedTokenBalances[tokenId] = {
              tokenId,
              balance,
              error: 'Could not fetch token details'
            };
          }
        }
      }

      const response = {
        userId,
        custodialAccount: {
          accountId: custodialAccount.accountId,
          createdAt: custodialAccount.createdAt
        },
        hbar: {
          balance: balances.hbar,
          formatted: `${balances.hbar}`
        },
        tokens: includeTokenInfo === 'true' ? detailedTokenBalances : balances.tokens,
        totalTokenTypes: Object.keys(balances.tokens || {}).length,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: response
      });

    } catch (error) {
      console.error(' Error getting custodial account balances:', error);
      
      const errorResponse = this.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get token information
   * GET /api/v1/balances/token/:tokenId/info
   */
  async getTokenInfo(req, res) {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        return res.status(400).json({
          success: false,
          errorCode: 'TOKEN_ID_REQUIRED',
          message: 'Token ID is required'
        });
      }

      console.log(` Getting token info for: ${tokenId}`);

      const tokenInfo = await tokenService.getTokenInfo(tokenId);

      res.json({
        success: true,
        data: tokenInfo
      });

    } catch (error) {
      console.error(' Error getting token info:', error);
      
      const errorResponse = this.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Get system token overview
   * GET /api/v1/balances/tokens/overview
   */
  async getTokensOverview(req, res) {
    try {
      const tokens = tokenService.getTokenIds();
      const overview = {
        systemTokens: {},
        tokenCount: 0,
        tokensCreated: tokenService.areTokensCreated()
      };

      if (tokens.USDC) {
        try {
          const usdcInfo = await tokenService.getTokenInfo(tokens.USDC);
          overview.systemTokens.USDC = usdcInfo;
          overview.tokenCount++;
        } catch (error) {
          console.warn('Could not get USDC info:', error.message);
        }
      }

      if (tokens.USDT) {
        try {
          const usdtInfo = await tokenService.getTokenInfo(tokens.USDT);
          overview.systemTokens.USDT = usdtInfo;
          overview.tokenCount++;
        } catch (error) {
          console.warn('Could not get USDT info:', error.message);
        }
      }

      res.json({
        success: true,
        data: overview,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(' Error getting tokens overview:', error);
      
      const errorResponse = this.getErrorResponse(error);
      res.status(errorResponse.statusCode).json({
        success: false,
        errorCode: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      });
    }
  }

  /**
   * Map error codes to appropriate HTTP responses
   */
  getErrorResponse(error) {
    const errorMappings = {
      'INVALID_ACCOUNT_ID': {
        statusCode: 400,
        code: 'INVALID_ACCOUNT_ID',
        message: 'Invalid account ID format',
        details: { canRetry: true, suggestedAction: 'Provide a valid Hedera account ID' }
      },
      'CUSTODIAL_ACCOUNT_NOT_FOUND': {
        statusCode: 404,
        code: 'CUSTODIAL_ACCOUNT_NOT_FOUND',
        message: 'Custodial account not found',
        details: { canRetry: false, suggestedAction: 'Create a custodial account first' }
      },
      'TOKEN_NOT_FOUND': {
        statusCode: 404,
        code: 'TOKEN_NOT_FOUND',
        message: 'Token not found',
        details: { canRetry: false, suggestedAction: 'Verify the token ID is correct' }
      }
    };

    const errorCode = error.code || error.message;
    return errorMappings[errorCode] || {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while fetching balances',
      details: { canRetry: true, suggestedAction: 'Please try again or contact support' }
    };
  }
}

module.exports = new BalanceController();