import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  ArrowLeft,
  Scan,
  CreditCard,
  User,
  Store,
  Clock,
  DollarSign,
  Shield
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import PaymentAuthModal from './PaymentAuthModal';
import { useSession } from '../contexts/SessionContext';
import { PaymentValidation, PaymentStatus } from '../types/api';

interface PaymentPageProps {
  nonce?: string;
  onBack?: () => void;
  onPaymentComplete?: (paymentData: any) => void;
}

const PaymentPage: React.FC<PaymentPageProps> = ({ nonce: initialNonce, onBack, onPaymentComplete }) => {
  const { user, refreshAllData } = useSession();
  const [step, setStep] = useState<'scan' | 'validate' | 'confirm' | 'process' | 'complete'>('scan');
  
  // Payment data
  const [nonce, setNonce] = useState(initialNonce || '');
  const [paymentData, setPaymentData] = useState<PaymentStatus | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Auto-advance if nonce is provided
  useEffect(() => {
    if (initialNonce) {
      validatePayment(initialNonce);
    }
  }, [initialNonce]);

  // Ensure authentication inside PaymentPage when accessed directly
  useEffect(() => {
    setShowAuthModal(!user);
  }, [user]);

  // Normalize user input: accept full URLs or raw codes
  const normalizeNonce = (input: string): string => {
    const trimmed = (input || '').trim();
    if (!trimmed) return '';
    try {
      const url = new URL(trimmed);
      const qp = url.searchParams.get('nonce') || url.searchParams.get('paymentData');
      if (qp) return qp.trim();
      // Try last path segment if it looks like a code
      const last = url.pathname.split('/').filter(Boolean).pop();
      if (last && last.length >= 16) return last;
    } catch {
      // not a URL; fall through
    }
    // Fallback: extract longest token-like substring
    const match = trimmed.match(/[A-Za-z0-9_-]{16,}/);
    return match ? match[0] : trimmed;
  };

  const validatePayment = useCallback(async (paymentNonce: string) => {
    const normalized = normalizeNonce(paymentNonce);
    if (!normalized) {
      setError('Please enter a valid payment code');
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('validate');

    try {
      console.log('💳 Validating payment with nonce:', normalized);
      
      const response = await apiClient.validatePaymentRequest(normalized);
      
      console.log('💳 Payment validation response:', response);
      console.log('💳 Payment validation data:', response.data);
      
      if (response.success && response.data) {
        if (response.data.isValid) {
          // After validation, fetch payment details
          const statusResponse = await apiClient.getPaymentStatus(normalized);
          if (statusResponse.success && statusResponse.data) {
            setPaymentData(statusResponse.data);
            setNonce(normalized);
            setStep('confirm');
          } else {
            setError('Failed to fetch payment details');
            setStep('scan');
          }
        } else {
          setError('Invalid or expired payment request');
          setStep('scan');
        }
      } else {
        setError(response.message || 'Failed to validate payment request');
        setStep('scan');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate payment request');
      setStep('scan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processPayment = useCallback(async () => {
    if (!user || !paymentData) {
      setError('Missing required information');
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('process');

    try {
      const amount = customAmount ? parseFloat(customAmount) : paymentData.amount;
      
      const response = await apiClient.processPayment({
        paymentData: nonce,
        customerUserId: user.userId,
        amount: customAmount ? amount : undefined,
      });

      if (response.success && response.data) {
        setPaymentResult(response.data);
        setStep('complete');
        
        // Refresh user data (balances + transactions)
        setTimeout(() => {
          refreshAllData();
        }, 1000);
        
        if (onPaymentComplete) {
          onPaymentComplete(response.data);
        }
      } else {
        setError(response.message || 'Payment failed');
        setStep('confirm');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setStep('confirm');
    } finally {
      setIsLoading(false);
    }
  }, [user, paymentData, nonce, customAmount, refreshAllData, onPaymentComplete]);

  const handleManualEntry = () => {
    validatePayment(nonce);
  };

  const resetPayment = () => {
    setStep('scan');
    setNonce('');
    setPaymentData(null);
    setCustomAmount('');
    setError('');
    setPaymentResult(null);
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

  const getStepIcon = () => {
    switch (step) {
      case 'scan':
        return <Scan className="w-8 h-8" />;
      case 'validate':
        return <Loader className="w-8 h-8 animate-spin" />;
      case 'confirm':
        return <CreditCard className="w-8 h-8" />;
      case 'process':
        return <Loader className="w-8 h-8 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      default:
        return <Scan className="w-8 h-8" />;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'scan':
        return 'Enter Payment Code';
      case 'validate':
        return 'Validating Payment';
      case 'confirm':
        return 'Confirm Payment';
      case 'process':
        return 'Processing Payment';
      case 'complete':
        return 'Payment Complete';
      default:
        return 'Make Payment';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
      {/* Auth modal for unauthenticated users */}
      {!user && (
        <PaymentAuthModal
          isOpen={showAuthModal}
          nonce={nonce || undefined}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-md mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
          )}
          
          <div className="text-center">
            <div className="bg-white p-4 rounded-full w-16 h-16 mx-auto mb-4 shadow-lg">
              {getStepIcon()}
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {getStepTitle()}
            </h1>
            {user && (
              <p className="text-gray-600 text-sm">
                Paying as: {user.userId} ({user.accountType})
              </p>
            )}
          </div>
        </motion.div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 1: Scan/Enter Payment Code */}
            {step === 'scan' && (
              <motion.div
                key="scan"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-8"
              >
                <div className="space-y-6">
                  <div className="text-center">
                    <Scan className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Enter Payment Code
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Enter the payment code from the QR code or link
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Code
                    </label>
                    <input
                      type="text"
                      value={nonce}
                      onChange={(e) => setNonce(e.target.value)}
                      placeholder="Paste payment code here"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleManualEntry}
                    disabled={!nonce.trim() || isLoading}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
                      !nonce.trim() || isLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader className="w-5 h-5 animate-spin mr-2" />
                        Validating...
                      </div>
                    ) : (
                      'Continue'
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Loading/Validation */}
            {step === 'validate' && (
              <motion.div
                key="validate"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-8"
              >
                <div className="text-center py-12">
                  <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Validating Payment Request
                  </h3>
                  <p className="text-gray-600">Please wait...</p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirm Payment */}
            {step === 'confirm' && paymentData && (
              <motion.div
                key="confirm"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-8"
              >
                <div className="space-y-6">
                  <div className="text-center">
                    <CreditCard className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Confirm Payment
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Review the payment details before proceeding
                    </p>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Merchant</span>
                      <div className="flex items-center">
                        <Store className="w-4 h-4 mr-1 text-gray-500" />
                        <span className="font-medium">{paymentData.merchantUserId}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Amount</span>
                      <div className="text-right">
                        {paymentData.amount && paymentData.amount > 0 ? (
                          <span className="font-semibold text-lg">
                            {paymentData.amount} {paymentData.tokenType}
                          </span>
                        ) : (
                          <div>
                            <input
                              type="number"
                              value={customAmount}
                              onChange={(e) => setCustomAmount(e.target.value)}
                              placeholder="Enter"
                              min="0"
                              step="0.01"
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                            />
                            <span className="ml-1 text-sm text-gray-600">
                              {paymentData.tokenType}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Token</span>
                      <span className="font-medium">{paymentData.tokenType}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Payment ID</span>
                      <code className="text-xs bg-white px-2 py-1 rounded border font-mono">
                        {(() => {
                          const id = (paymentData?.nonce || nonce || '').toString();
                          return id.length > 12 ? `${id.slice(0,12)}...` : id || 'N/A';
                        })()}
                      </code>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Secure Payment</p>
                        <p className="text-xs text-blue-600 mt-1">
                          This payment will be processed securely on the Hedera network
                        </p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={resetPayment}
                      className="py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={processPayment}
                      disabled={isLoading || (!paymentData.amount && !customAmount)}
                      className={`py-3 px-4 rounded-xl font-semibold text-white transition-all ${
                        isLoading || (!paymentData.amount && !customAmount)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <Loader className="w-4 h-4 animate-spin mr-2" />
                          Processing...
                        </div>
                      ) : (
                        'Pay Now'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Processing */}
            {step === 'process' && (
              <motion.div
                key="process"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-8"
              >
                <div className="text-center py-12">
                  <Loader className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Processing Payment
                  </h3>
                  <p className="text-gray-600">
                    Please wait while we process your payment on the blockchain...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 5: Complete */}
            {step === 'complete' && paymentResult && (
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
                      Payment Successful!
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Your payment has been processed successfully
                    </p>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-green-50 rounded-xl p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Amount Paid</span>
                      <span className="font-semibold text-green-800">
                        {paymentResult.amount} {paymentResult.tokenType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Transaction ID</span>
                      <code className="text-xs bg-white px-2 py-1 rounded border font-mono">
                        {paymentResult.transactionId?.slice(0, 16)}...
                      </code>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {paymentResult.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Timestamp</span>
                      <span className="text-sm">
                        {new Date(paymentResult.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={resetPayment}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    Make Another Payment
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

export default PaymentPage;