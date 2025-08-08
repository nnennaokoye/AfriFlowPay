import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  CreditCard,
  Loader,
  CheckCircle,
  AlertCircle,
  Globe,
  DollarSign,
  Coins,
  Clock,
  Shield,
  TrendingUp,
  Smartphone,
  Building,
  Info
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useSession, useUserData } from '../contexts/SessionContext';
import { Country, PaymentMethod, CryptoPurchaseResult } from '../types/api';

interface BuyCryptoProps {
  onBack: () => void;
  onPurchaseComplete?: (purchaseData: CryptoPurchaseResult) => void;
}

const BuyCrypto: React.FC<BuyCryptoProps> = ({ onBack, onPurchaseComplete }) => {
  const { user, refreshBalances } = useSession();
  const { balances } = useUserData();
  const [step, setStep] = useState<'country' | 'method' | 'amount' | 'confirm' | 'process' | 'complete'>('amount');
  
  // Data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<CryptoPurchaseResult[]>([]);
  
  // Form state
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [fiatAmount, setFiatAmount] = useState('');
  const [cryptoToken, setCryptoToken] = useState('HBAR');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [purchaseResult, setPurchaseResult] = useState<CryptoPurchaseResult | null>(null);

  // Available crypto tokens
  const availableTokens = [
    { value: 'HBAR', label: 'HBAR', description: 'Hedera Native Token' },
    { value: 'USDC', label: 'USDC', description: 'USD Coin' },
    { value: 'USDT', label: 'USDT', description: 'Tether USD' },
  ];

  // Load initial data
  useEffect(() => {
    loadCountries();
    if (user) {
      loadPurchaseHistory();
    }
  }, [user]);

  const loadCountries = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getCountries();
      if (response.success && response.data) {
        setCountries(response.data.countries || []);
      }
    } catch (error) {
      console.error('Failed to load countries:', error);
      setError('Failed to load supported countries');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPaymentMethods = useCallback(async (countryCode: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.getPaymentMethods(countryCode);
      if (response.success && response.data) {
        setPaymentMethods(response.data.paymentMethods || []);
        setStep('method');
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      setError('Failed to load payment methods for this country');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPurchaseHistory = useCallback(async () => {
    if (!user) return;

    try {
      const response = await apiClient.getPurchaseHistory(user.userId, { limit: 5 });
      if (response.success && response.data) {
        setPurchaseHistory(response.data.purchases || []);
      }
    } catch (error) {
      console.error('Failed to load purchase history:', error);
    }
  }, [user]);

  const selectCountry = (country: Country) => {
    setSelectedCountry(country);
    setError('');
    loadPaymentMethods(country.code);
  };

  const selectPaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setStep('amount');
  };

  const calculateCryptoAmount = (): number => {
    if (!fiatAmount || !selectedCountry) return 0;
    
    // Mock exchange rates - in a real app, these would come from an API
    const exchangeRates: Record<string, Record<string, number>> = {
      'HBAR': {
        'NGN': 332.11,
        'KES': 13.25,
        'ZAR': 5.85,
        'GHS': 12.15
      },
      'USDC': {
        'NGN': 1580.50,
        'KES': 129.25,
        'ZAR': 18.85,
        'GHS': 14.85
      },
      'USDT': {
        'NGN': 1579.75,
        'KES': 129.15,
        'ZAR': 18.83,
        'GHS': 14.82
      }
    };

    const rate = exchangeRates[cryptoToken]?.[selectedCountry.currency] || 1;
    return parseFloat(fiatAmount) / rate;
  };

  const getFees = (): { yellowCard: number; network: number } => {
    const amount = parseFloat(fiatAmount) || 0;
    return {
      yellowCard: amount * 0.02, // 2% YellowCard fee
      network: cryptoToken === 'HBAR' ? 0.001 : 0.01 // Network fee
    };
  };

  const processPurchase = useCallback(async () => {
    if (!user || !selectedCountry || !selectedPaymentMethod) return;

    setIsLoading(true);
    setError('');
    setStep('process');

    try {
      const response = await apiClient.purchaseCrypto({
        userId: user.userId,
        countryCode: selectedCountry.code,
        paymentMethod: selectedPaymentMethod.id,
        fiatAmount: parseFloat(fiatAmount),
        cryptoToken,
      });

      if (response.success && response.data) {
        setPurchaseResult(response.data);
        setStep('complete');
        
        // Refresh balances after successful purchase
        setTimeout(() => {
          refreshBalances();
          loadPurchaseHistory();
        }, 1000);
        
        if (onPurchaseComplete) {
          onPurchaseComplete(response.data);
        }
      } else {
        setError(response.message || 'Purchase failed');
        setStep('confirm');
      }
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
      setStep('confirm');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedCountry, selectedPaymentMethod, fiatAmount, cryptoToken, refreshBalances, loadPurchaseHistory, onPurchaseComplete]);

  const resetForm = () => {
    setStep('country');
    setSelectedCountry(null);
    setSelectedPaymentMethod(null);
    setFiatAmount('');
    setError('');
    setPurchaseResult(null);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Buy Crypto
            </h1>
            <p className="text-gray-600">
              Purchase cryptocurrency with local payment methods
            </p>
          </div>
        </motion.div>

        {/* Main content with step components */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
          <AnimatePresence mode="wait">
            {step === 'country' && (
              <motion.div
                key="country"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="text-center">
                  <Globe className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Select Your Country
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Choose your country to see available payment methods
                  </p>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader className="w-8 h-8 animate-spin text-green-500 mx-auto mb-2" />
                    <p className="text-gray-500">Loading countries...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {countries.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => selectCountry(country)}
                        disabled={!country.supported}
                        className={`p-4 border-2 rounded-xl text-left transition-all ${
                          country.supported
                            ? 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                            : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-800">{country.name}</h4>
                            <p className="text-sm text-gray-600">{country.currency}</p>
                          </div>
                          {country.supported ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'amount' && (
              <motion.div key="amount" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Country</label>
                    <select
                      value={selectedCountry?.code || ''}
                      onChange={(e) => {
                        const c = countries.find((x) => x.code === e.target.value);
                        if (c) selectCountry(c);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="" disabled>Select a country</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code} disabled={!country.supported}>
                          {country.name} ({country.currency}){!country.supported ? ' - coming soon' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCountry && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                      {paymentMethods.length === 0 ? (
                        <button
                          onClick={() => loadPaymentMethods(selectedCountry.code)}
                          className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold"
                        >
                          Load Payment Methods
                        </button>
                      ) : (
                        <select
                          value={selectedPaymentMethod?.id || ''}
                          onChange={(e) => {
                            const m = paymentMethods.find((x) => x.id === e.target.value);
                            if (m) selectPaymentMethod(m);
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="" disabled>Select a method</option>
                          {paymentMethods.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Fiat Amount</label>
                    <input
                      type="number"
                      value={fiatAmount}
                      onChange={(e) => setFiatAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Crypto Token</label>
                    <select
                      value={cryptoToken}
                      onChange={(e) => setCryptoToken(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {availableTokens.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {selectedCountry && selectedPaymentMethod && fiatAmount && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Estimated Crypto</span>
                        <span className="font-semibold">{calculateCryptoAmount().toFixed(6)} {cryptoToken}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Fees</span>
                        <span className="font-semibold">
                          YC: {getFees().yellowCard.toFixed(2)} • Network: {getFees().network}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep('country')} className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold">Back</button>
                  <button
                    onClick={() => setStep('confirm')}
                    disabled={!user || !selectedCountry || !selectedPaymentMethod || !fiatAmount}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold text-white ${!user || !selectedCountry || !selectedPaymentMethod || !fiatAmount ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div key="confirm" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">Confirm Purchase</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Country</span><span className="font-medium">{selectedCountry?.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Method</span><span className="font-medium">{selectedPaymentMethod?.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Fiat Amount</span><span className="font-medium">{fiatAmount} {selectedCountry?.currency}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Crypto</span><span className="font-medium">{calculateCryptoAmount().toFixed(6)} {cryptoToken}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Fees</span><span className="font-medium">YC {getFees().yellowCard.toFixed(2)} + Net {getFees().network}</span></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('amount')} className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold">Back</button>
                  <button onClick={processPurchase} className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold" disabled={isLoading}>
                    {isLoading ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default BuyCrypto;