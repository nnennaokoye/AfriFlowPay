const yellowCardService = require('../services/yellowCardService');
const accountService = require('../services/accountService');
const tokenService = require('../services/tokenService');

class YellowCardController {
  /**
   * Get supported countries
   */
  async getSupportedCountries(req, res) {
    try {
      const countries = yellowCardService.getSupportedCountries();
      
      res.json({
        success: true,
        data: countries
      });
    } catch (error) {
      console.error('Error getting supported countries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get supported countries',
        error: error.message
      });
    }
  }

  /**
   * Get payment methods for country
   */
  async getPaymentMethods(req, res) {
    try {
      const { countryCode } = req.params;
      const paymentMethods = yellowCardService.getPaymentMethods(countryCode);
      
      res.json({
        success: true,
        data: {
          countryCode,
          paymentMethods
        }
      });
    } catch (error) {
      console.error('Error getting payment methods:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment methods',
        error: error.message
      });
    }
  }

  /**
   * Purchase crypto via mock Yellow Card
   */
  async purchaseCrypto(req, res) {
    try {
      const {
        userId,
        countryCode,
        paymentMethod,
        fiatAmount,
        fiatCurrency = 'USD',
        cryptoToken = 'USDC',
        userPhoneNumber
      } = req.body;

      // Validate required fields
      if (!userId || !countryCode || !paymentMethod || !fiatAmount || !cryptoToken) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Validate phone number
      if (userPhoneNumber && !yellowCardService.validatePhoneNumber(userPhoneNumber, countryCode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format for selected country'
        });
      }

      // Get user's custodial account
      let userAccount = accountService.getCustodialAccount(userId);
      if (!userAccount) {
        // Create account if doesn't exist
        userAccount = await accountService.createCustodialAccount(userId);
        
        // Associate tokens
        const tokenIds = tokenService.getTokenIds();
        if (tokenIds.USDC) {
          await tokenService.associateTokenWithAccount(
            userAccount.accountId,
            tokenIds.USDC,
            userAccount.privateKey
          );
        }
        if (tokenIds.USDT) {
          await tokenService.associateTokenWithAccount(
            userAccount.accountId,
            tokenIds.USDT,
            userAccount.privateKey
          );
        }
      }

      // Process purchase via Yellow Card service
      const purchaseResult = await yellowCardService.purchaseCrypto({
        userId,
        countryCode,
        paymentMethod,
        fiatAmount,
        fiatCurrency,
        cryptoToken,
        userPhoneNumber
      });

      if (purchaseResult.success) {
        // In a real implementation, credit the user's account with purchased crypto
        // For demo purposes, we'll simulate this
        console.log(`Would credit ${purchaseResult.transaction.cryptoAmount} ${cryptoToken} to account ${userAccount.accountId}`);
      }

      res.json(purchaseResult);

    } catch (error) {
      console.error('Error purchasing crypto:', error);
      res.status(500).json({
        success: false,
        message: 'Crypto purchase failed',
        error: error.message
      });
    }
  }

  /**
   * Get user's purchase history
   */
  async getPurchaseHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10 } = req.query;

      const history = await yellowCardService.getPurchaseHistory(userId, parseInt(limit));
      
      res.json(history);
    } catch (error) {
      console.error('Error getting purchase history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get purchase history',
        error: error.message
      });
    }
  }
}

module.exports = new YellowCardController();