class YellowCardService {
    constructor() {
      this.mockEnabled = process.env.MOCK_YELLOWCARD_ENABLED === 'true';
      this.supportedCountries = [
        'KE', 'NG', 'UG', 'TZ', 'RW', 'GH', 'ZA', 'CI', 'SN', 'CM'
      ];
      this.paymentMethods = {
        'KE': ['M-Pesa', 'Airtel Money', 'Bank Transfer'],
        'NG': ['Bank Transfer', 'USSD', 'Paystack'],
        'UG': ['MTN Mobile Money', 'Airtel Money'],
        'TZ': ['Vodacom M-Pesa', 'Tigo Pesa', 'Airtel Money'],
        'RW': ['MTN MoMo', 'Airtel Money'],
        'GH': ['MTN Mobile Money', 'Vodafone Cash', 'AirtelTigo Money'],
        'ZA': ['Bank Transfer', 'EFT'],
        'default': ['Bank Transfer', 'Mobile Money']
      };
    }
  
    /**
     * Get supported countries
     */
    getSupportedCountries() {
      return this.supportedCountries.map(code => ({
        code,
        name: this.getCountryName(code)
      }));
    }
  
    /**
     * Get payment methods for country
     */
    getPaymentMethods(countryCode) {
      return this.paymentMethods[countryCode] || this.paymentMethods.default;
    }
  
    /**
     * Mock crypto purchase
     */
    async purchaseCrypto(purchaseData) {
      try {
        const {
          countryCode,
          paymentMethod,
          fiatAmount,
          fiatCurrency,
          cryptoToken,
          userPhoneNumber,
          userId
        } = purchaseData;
  
        // Validate input
        if (!this.supportedCountries.includes(countryCode)) {
          throw new Error(`Country ${countryCode} not supported`);
        }
  
        // Mock exchange rates (in production, fetch real rates)
        const exchangeRates = {
          'KES': { USDC: 0.0067, USDT: 0.0067, HBAR: 0.8 },
          'NGN': { USDC: 0.0016, USDT: 0.0016, HBAR: 0.19 },
          'USD': { USDC: 1.0, USDT: 1.0, HBAR: 120 }
        };
  
        const rate = exchangeRates[fiatCurrency] || exchangeRates.USD;
        const cryptoAmount = fiatAmount * rate[cryptoToken];
  
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
  
        // Mock successful transaction
        const mockTransaction = {
          id: `YC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'completed',
          fiatAmount,
          fiatCurrency,
          cryptoAmount: parseFloat(cryptoAmount.toFixed(6)),
          cryptoToken,
          exchangeRate: rate[cryptoToken],
          paymentMethod,
          countryCode,
          timestamp: new Date().toISOString(),
          userId,
          fees: {
            yellowCard: fiatAmount * 0.02, // 2% fee
            network: 0.001 // Network fee
          }
        };
  
        console.log('Mock crypto purchase completed:', mockTransaction.id);
  
        return {
          success: true,
          transaction: mockTransaction,
          message: `Successfully purchased ${cryptoAmount} ${cryptoToken}`
        };
  
      } catch (error) {
        console.error('Error in mock crypto purchase:', error);
        throw error;
      }
    }
  
    /**
     * Get purchase history for user
     */
    async getPurchaseHistory(userId, limit = 10) {
      // In production, fetch from database
      // For now, return empty array since we're not persisting data
      return {
        success: true,
        purchases: [],
        message: 'Purchase history retrieved successfully'
      };
    }
  
    /**
     * Get country name from code
     */
    getCountryName(code) {
      const countries = {
        'KE': 'Kenya',
        'NG': 'Nigeria', 
        'UG': 'Uganda',
        'TZ': 'Tanzania',
        'RW': 'Rwanda',
        'GH': 'Ghana',
        'ZA': 'South Africa',
        'CI': 'Côte d\'Ivoire',
        'SN': 'Senegal',
        'CM': 'Cameroon'
      };
      return countries[code] || code;
    }
  
    /**
     * Validate phone number format by country
     */
    validatePhoneNumber(phoneNumber, countryCode) {
      const patterns = {
        'KE': /^(\+254|254|0)[17]\d{8}$/, // Kenya
        'NG': /^(\+234|234|0)[789]\d{9}$/, // Nigeria
        'UG': /^(\+256|256|0)[37]\d{8}$/, // Uganda
        'default': /^(\+?\d{10,15})$/ // Generic
      };
  
      const pattern = patterns[countryCode] || patterns.default;
      return pattern.test(phoneNumber);
    }
  }
  
  module.exports = new YellowCardService();