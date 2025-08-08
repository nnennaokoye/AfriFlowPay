import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  Send,
  Loader,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  Shield,
  AlertTriangle,
  ExternalLink,
  Wallet,
  DollarSign,
  User
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useSession, useUserData } from '../contexts/SessionContext';
import { WithdrawalStatus } from '../types/api';

interface WithdrawFundsProps {
  onBack: () => void;
  onWithdrawalComplete?: (withdrawalData: any) => void;
}

const WithdrawFunds: React.FC<WithdrawFundsProps> = ({ onBack, onWithdrawalComplete }) => {
  const { user, refreshBalances } = useSession();
  const { balances } = useUserData();
  const [step, setStep] = useState<'form' | 'confirm' | 'process' | 'complete'>('form');
  
  // Form state
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('HBAR');
  const [destinationAddress, setDestinationAddress] = useState('');
  
  // UI state
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [withdrawalResult, setWithdrawalResult] = useState<WithdrawalStatus | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalStatus[]>([]);

  // Available tokens for withdrawal (normalize both array and object shapes)
  const availableTokens = useMemo(() => {
    const base = [{ value: 'HBAR', label: 'HBAR', balance: balances?.hbar || 0 }];

    const tokensField: any = balances?.tokens;
    if (!tokensField) return base;

    // Case 1: tokens is an array of TokenBalance
    if (Array.isArray(tokensField)) {
      const arr = tokensField.map((t: any) => ({
        value: t.symbol || t.tokenId,
        label: t.symbol || t.tokenId || 'Token',
        balance: typeof t.balance === 'string' ? parseFloat(t.balance) : (t.balance || 0)
      }));
      return [...base, ...arr];
    }

    // Case 2: tokens is an object map { tokenId: balance }
    if (typeof tokensField === 'object') {
      const arr = Object.entries(tokensField).map(([tokenId, bal]) => ({
        value: tokenId,
        label: tokenId,
        balance: typeof bal === 'string' ? parseFloat(bal as string) : (bal as number) || 0
      }));
      return [...base, ...arr];
    }

    return base;
  }, [balances]);

  // Load withdrawal history on mount
  const loadWithdrawalHistory = useCallback(async () => {
    if (!user) return;

    try {
      const response = await apiClient.getWithdrawalHistory(user.userId);
      if (response.success && response.data) {
        setWithdrawalHistory(response.data.withdrawals || []);
      }
    } catch (error) {
      console.error('Failed to load withdrawal history:', error);
    }
  }, [user]);

  const validateForm = (): string | null => {
    if (!amount || parseFloat(amount) <= 0) {
      return 'Please enter a valid amount';
    }

    if (!destinationAddress.trim()) {
      return 'Please enter a destination address';
    }

    // Basic Hedera account ID validation
    const hederaAccountPattern = /^0\.0\.\d+$/;
    if (!hederaAccountPattern.test(destinationAddress.trim())) {
      return 'Please enter a valid Hedera account ID (format: 0.0.123456)';
    }

    const selectedToken = availableTokens.find(t => t.value === token);
    if (!selectedToken) {
      return 'Selected token not available';
    }

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount > selectedToken.balance) {
      return `Insufficient ${token} balance. Available: ${selectedToken.balance}`;
    }

    // Minimum withdrawal amounts
    const minimums: Record<string, number> = {
      'HBAR': 1,
      'USDC': 1,
      'USDT': 1
    };

    const minimum = minimums[token] || 0.01;
    if (withdrawalAmount < minimum) {
      return `Minimum withdrawal amount for ${token} is ${minimum}`;
    }

    return null;
  };

  const handleFormSubmit = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setStep('confirm');
  };

  const resetForm = () => {
    setAmount('');
    setToken('HBAR');
    setDestinationAddress('');
    setError('');
    setWithdrawalResult(null);
    setStep('form');
  };

  const processWithdrawal = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError('');
    setStep('process');

    try {
      // Ensure proper request body format
      const withdrawalRequest = {
        userId: user.userId,
        amount: parseFloat(amount),
        token: token || 'HBAR', // Default to HBAR if not specified
        destinationAddress: destinationAddress.trim(),
      };
      
      console.log('🔄 Sending withdrawal request:', withdrawalRequest);
      const response = await apiClient.requestWithdrawal(withdrawalRequest);

      console.log('📥 Withdrawal response:', response);
      
      if (response.success && response.data) {
        const withdrawalId = response.data.withdrawalId;
        if (!withdrawalId) {
          throw new Error('No withdrawal ID received from server');
        }
        setWithdrawalResult(response.data);
        
        // Poll for withdrawal status updates
        const pollStatus = async () => {
          try {
            const statusResponse = await apiClient.getWithdrawalStatus(withdrawalId);
            if (statusResponse.success && statusResponse.data) {
              const updatedStatus = statusResponse.data;
              setWithdrawalResult(updatedStatus);
              
              if (updatedStatus.status === 'completed') {
                console.log('✅ Withdrawal completed, refreshing balances and transactions...');
                // Refresh balances and transaction history
                await refreshBalances();
                await loadWithdrawalHistory();
                setStep('complete');
                
                if (onWithdrawalComplete) {
                  onWithdrawalComplete(updatedStatus);
                }
              } else if (updatedStatus.status === 'failed') {
                setError(updatedStatus.message || 'Withdrawal failed');
                setStep('confirm');
              } else {
                // Still pending, poll again
                setTimeout(pollStatus, 3000);
              }
            }
          } catch (pollError) {
            console.error('❌ Status polling error:', pollError);
            // More robust error handling
            if ((pollError as any)?.message?.includes('404') || (pollError as any)?.message?.includes('not found')) {
              // Withdrawal ID not found, likely a backend issue
              setError('Withdrawal status not found. Please check your transaction history.');
              setStep('confirm');
            } else {
              // Network or other error, fallback to success assumption
              console.log('⚠️ Polling failed, assuming success and refreshing...');
              setTimeout(async () => {
                await refreshBalances();
                await loadWithdrawalHistory();
                setStep('complete');
              }, 2000);
            }
          }
        };
        
        // Start polling after 2 seconds to allow backend processing
        setTimeout(pollStatus, 2000);
        
      } else {
        setError(response.message || 'Withdrawal failed');
        setStep('confirm');
      }
    } catch (err: any) {
      console.error('❌ Withdrawal error:', err);
      
      // Enhanced error handling
      let errorMessage = 'Withdrawal failed';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Check for specific validation errors
      if (errorMessage.includes('Invalid destination address')) {
        errorMessage = 'Please enter a valid Hedera account ID (format: 0.0.123456)';
      } else if (errorMessage.includes('Invalid token type')) {
        errorMessage = 'Invalid token type. Please select HBAR, USDC, or USDT.';
      } else if (errorMessage.includes('Insufficient balance')) {
        errorMessage = 'Insufficient balance for this withdrawal.';
      }
      
      setError(errorMessage);
      setStep('confirm');
    } finally {
      setIsLoading(false);
    }
  }, [user, amount, token, destinationAddress, refreshBalances, loadWithdrawalHistory, onWithdrawalComplete]);

  useEffect(() => {
    if (user) {
      loadWithdrawalHistory();
    }
  }, [user, loadWithdrawalHistory]);

  const formatBalance = (balance: number): string => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(2)}M`;
    } else if (balance >= 1000) {
      return `${(balance / 1000).toFixed(2)}K`;
    } else {
      return balance.toFixed(2);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Modern Header */}
      <div className="bg-white/90 backdrop-blur-md shadow-sm border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-primary-600 transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:transform group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back to Dashboard</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-700">Secured by Hedera</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="text-center py-12 px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-3xl mb-6 shadow-xl"
        >
          <Send className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Withdraw Funds
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
          Send your cryptocurrency to external wallets securely. 
          Fast, reliable transfers powered by the Hedera network.
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-3">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="wait">
                {step === 'form' && (
                  <motion.div
                    key="form"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-green-100 p-8"
                  >
                    <div className="space-y-8">
                      {/* Available Balance Display */}
                      <motion.div variants={itemVariants} className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 rounded-3xl p-6 border border-primary-100 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mr-3">
                              <Wallet className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Available Balances</h3>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowBalance(!showBalance)}
                            className="p-3 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-all"
                          >
                            {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </motion.button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {availableTokens.map((tokenItem) => (
                            <motion.div 
                              key={tokenItem.value} 
                              whileHover={{ scale: 1.02, y: -2 }}
                              className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{tokenItem.label}</p>
                                  <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {showBalance ? formatBalance(tokenItem.balance) : '••••••'}
                                  </p>
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl flex items-center justify-center">
                                  <DollarSign className="w-6 h-6 text-primary-600" />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Token Selection */}
                      <motion.div variants={itemVariants}>
                        <label className="block text-lg font-bold text-gray-900 mb-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mr-3">
                              <Wallet className="w-4 h-4 text-white" />
                            </div>
                            Select Token to Withdraw
                          </div>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {availableTokens.map((tokenItem) => (
                            <motion.button
                              key={tokenItem.value}
                              whileHover={{ scale: tokenItem.balance > 0 ? 1.02 : 1, y: tokenItem.balance > 0 ? -2 : 0 }}
                              whileTap={{ scale: tokenItem.balance > 0 ? 0.98 : 1 }}
                              onClick={() => setToken(tokenItem.value)}
                              disabled={tokenItem.balance <= 0}
                              className={`p-5 border-2 rounded-3xl text-left transition-all ${
                                token === tokenItem.value
                                  ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-secondary-50 shadow-xl ring-4 ring-primary-100'
                                  : tokenItem.balance <= 0
                                  ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                  : 'border-gray-200 hover:border-primary-300 hover:shadow-lg bg-white/90 backdrop-blur-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-bold text-gray-900 text-lg">{tokenItem.label}</div>
                                  <div className="text-sm text-gray-600 mt-1 font-medium">
                                    {showBalance ? `${formatBalance(tokenItem.balance)} available` : '••••••'}
                                  </div>
                                </div>
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                                  token === tokenItem.value 
                                    ? 'border-primary-500 bg-primary-500' 
                                    : 'border-gray-300'
                                }`}>
                                  {token === tokenItem.value && (
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  )}
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>

                      {/* Amount Input */}
                      <motion.div variants={itemVariants}>
                        <label className="block text-lg font-bold text-gray-900 mb-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mr-3">
                              <DollarSign className="w-4 h-4 text-white" />
                            </div>
                            Withdrawal Amount
                          </div>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount to withdraw"
                            min="0"
                            step="0.01"
                            className="w-full px-6 py-5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 text-xl font-bold bg-white/90 backdrop-blur-sm hover:bg-white hover:shadow-lg transition-all placeholder-gray-400"
                          />
                          <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                            <span className="bg-gradient-to-br from-primary-100 to-secondary-100 text-primary-700 px-4 py-2 rounded-xl text-sm font-bold">
                              {token}
                            </span>
                          </div>
                        </div>
                        
                        {amount && parseFloat(amount) > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 bg-gradient-to-r from-primary-50 via-white to-secondary-50 rounded-3xl p-6 border border-primary-200 shadow-lg"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Shield className="w-5 h-5 text-primary-600 mr-3" />
                                  <span className="text-sm font-bold text-gray-700">Network fees:</span>
                                </div>
                                <span className="text-sm font-bold text-primary-700 bg-primary-100 px-3 py-1 rounded-full">
                                  Covered by AfriPayFlow ✨
                                </span>
                              </div>
                              
                              <div className="border-t border-primary-200 pt-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-lg font-bold text-gray-900">You will receive:</span>
                                  <div className="text-right">
                                    <div className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                                      {parseFloat(amount).toFixed(2)} {token}
                                    </div>
                                    <div className="text-sm text-gray-600 font-medium">Full amount - no deductions</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>

                      {/* Destination Address */}
                      <motion.div variants={itemVariants}>
                        <label className="block text-lg font-bold text-gray-900 mb-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mr-3">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            Destination Hedera Account
                          </div>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={destinationAddress}
                            onChange={(e) => setDestinationAddress(e.target.value)}
                            placeholder="0.0.123456"
                            className="w-full px-6 py-5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 font-mono text-lg bg-white/90 backdrop-blur-sm hover:bg-white hover:shadow-lg transition-all placeholder-gray-400"
                          />
                          <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                            <ExternalLink className="w-5 h-5 text-primary-400" />
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-3 flex items-center font-medium">
                          <Shield className="w-4 h-4 mr-2 text-primary-500" />
                          Enter a valid Hedera account ID (format: 0.0.123456)
                        </p>
                      </motion.div>

                      {/* Security Notice */}
                      <motion.div variants={itemVariants} className="bg-gradient-to-r from-primary-50 via-white to-secondary-50 border border-primary-200 rounded-3xl p-6 shadow-lg">
                        <div className="flex items-start">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0">
                            <Shield className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 mb-4">Security & Processing Info</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                              <div className="flex items-center">
                                <CheckCircle className="w-4 h-4 mr-3 text-primary-600" />
                                <span className="font-medium">Network fees covered by AfriPayFlow</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-3 text-primary-600" />
                                <span className="font-medium">Processing takes 1-2 minutes</span>
                              </div>
                              <div className="flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-3 text-secondary-600" />
                                <span className="font-medium">Double-check destination address</span>
                              </div>
                              <div className="flex items-center">
                                <ExternalLink className="w-4 h-4 mr-3 text-primary-600" />
                                <span className="font-medium">Transaction will appear on HashScan</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Error Display */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-5 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-3xl flex items-center shadow-lg"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0">
                              <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm font-bold text-red-700">{error}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Submit Button */}
                      <motion.div variants={itemVariants} className="pt-4">
                        <motion.button
                          whileHover={{ scale: isLoading || !amount || !destinationAddress ? 1 : 1.02 }}
                          whileTap={{ scale: isLoading || !amount || !destinationAddress ? 1 : 0.98 }}
                          onClick={handleFormSubmit}
                          disabled={isLoading || !amount || !destinationAddress}
                          className={`w-full py-6 px-8 rounded-3xl font-bold text-lg transition-all shadow-xl ${
                            isLoading || !amount || !destinationAddress
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                              : 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white hover:shadow-2xl'
                          }`}
                        >
                          {isLoading ? (
                            <div className="flex items-center justify-center">
                              <Loader className="w-6 h-6 animate-spin mr-3" />
                              <span>Processing withdrawal...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Send className="w-6 h-6 mr-3" />
                              <span>Review Withdrawal Details</span>
                            </div>
                          )}
                        </motion.button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Confirmation */}
                {step === 'confirm' && (
                  <motion.div
                    key="confirm"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8"
                  >
                    <div className="space-y-8">
                      {/* Header */}
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Shield className="w-10 h-10 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">
                          Confirm Withdrawal
                        </h3>
                        <p className="text-gray-600 text-lg">
                          Please review your withdrawal details carefully
                        </p>
                      </div>

                      {/* Withdrawal Summary Card */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-200 shadow-lg">
                        <div className="space-y-6">
                          {/* Amount Section */}
                          <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  <DollarSign className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="text-gray-700 font-medium">Withdrawal Amount</span>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-gray-800">{amount} {token}</div>
                                <div className="text-sm text-gray-500">Requested amount</div>
                              </div>
                            </div>
                          </div>

                          {/* Fee Information */}
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                  <Shield className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800">Network Fees</div>
                                  <div className="text-sm text-gray-600">Covered by AfriPayFlow</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-green-600">FREE ✨</div>
                                <div className="text-sm text-gray-500">No deductions</div>
                              </div>
                            </div>
                          </div>

                          {/* Final Amount */}
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800">You Will Receive</div>
                                  <div className="text-sm text-gray-600">Final amount in your wallet</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-4xl font-bold text-indigo-600">
                                  {parseFloat(amount).toFixed(2)} {token}
                                </div>
                                <div className="text-sm text-gray-500">Full amount - no fees</div>
                              </div>
                            </div>
                          </div>

                          {/* Destination */}
                          <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                  <ExternalLink className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800">Destination Account</div>
                                  <div className="text-sm text-gray-600">Hedera testnet address</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <code className="text-lg font-mono bg-gray-100 px-4 py-2 rounded-xl border">
                                  {destinationAddress}
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Error Display */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center"
                          >
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-red-800 mb-1">Withdrawal Error</h4>
                              <p className="text-sm text-red-700">{error}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setStep('form')}
                          className="flex-1 py-4 px-6 border-2 border-gray-300 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center"
                        >
                          <ArrowLeft className="w-5 h-5 mr-2" />
                          Back to Edit
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: isLoading ? 1 : 1.02 }}
                          whileTap={{ scale: isLoading ? 1 : 0.98 }}
                          onClick={processWithdrawal}
                          disabled={isLoading}
                          className={`flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all flex items-center justify-center ${
                            isLoading
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl hover:shadow-2xl'
                          }`}
                        >
                          {isLoading ? (
                            <div className="flex items-center">
                              <Loader className="w-6 h-6 animate-spin mr-3" />
                              <span>Processing Withdrawal...</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <CheckCircle className="w-6 h-6 mr-3" />
                              <span>Confirm & Send</span>
                            </div>
                          )}
                        </motion.button>
                      </div>

                      {/* Security Footer */}
                      <div className="bg-gray-50 rounded-2xl p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Shield className="w-4 h-4 text-gray-500 mr-2" />
                          <span className="text-sm font-medium text-gray-600">Secured by Hedera Network</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Your withdrawal will be processed on the Hedera testnet with enterprise-grade security
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Processing */}
                {step === 'process' && (
                  <motion.div
                    key="process"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8"
                  >
                    <div className="text-center py-12">
                      <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Processing Withdrawal
                      </h3>
                      <p className="text-gray-600">
                        Please wait while we process your withdrawal on the blockchain...
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Complete */}
                {step === 'complete' && withdrawalResult && (
                  <motion.div
                    key="complete"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-8"
                  >
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          Withdrawal Initiated!
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Your withdrawal request has been submitted successfully
                        </p>
                      </div>

                      {/* Withdrawal Details */}
                      <div className="bg-green-50 rounded-xl p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Withdrawal ID</span>
                          <code className="text-xs bg-white px-2 py-1 rounded border font-mono">
                            {withdrawalResult.withdrawalId.slice(0, 16)}...
                          </code>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Amount</span>
                          <span className="font-semibold text-green-800">
                            {withdrawalResult.amount} {withdrawalResult.token}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Destination</span>
                          <code className="text-xs bg-white px-2 py-1 rounded border font-mono">
                            {withdrawalResult.destinationAddress}
                          </code>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Status</span>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                            {withdrawalResult.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Estimated Completion</span>
                          <span className="text-sm">
                            {(withdrawalResult as any).estimatedCompletion 
                              ? new Date((withdrawalResult as any).estimatedCompletion).toLocaleString()
                              : 'Processing...'
                            }
                          </span>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <Clock className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">Processing Information</p>
                            <p className="text-xs text-blue-600 mt-1">
                              Your withdrawal is being processed. You can check the status in your transaction history.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={async () => {
                            await refreshBalances();
                            resetForm();
                          }}
                          className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                        >
                          Refresh & New Withdrawal
                        </button>
                        <button
                          onClick={async () => {
                            await refreshBalances();
                            // optional: could navigate user to transactions view if present
                          }}
                          className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
                        >
                          Refresh Balances
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Withdrawal History Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Recent Withdrawals</h3>
              
              {withdrawalHistory.length > 0 ? (
                <div className="space-y-3">
                  {withdrawalHistory.slice(0, 5).map((withdrawal, index) => (
                    <div key={withdrawal.withdrawalId || index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {withdrawal.amount} {withdrawal.token}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          withdrawal.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : withdrawal.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {withdrawal.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        To: {withdrawal.destinationAddress}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(withdrawal.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {withdrawalHistory.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{withdrawalHistory.length - 5} more withdrawals
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Send className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No withdrawals yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawFunds;