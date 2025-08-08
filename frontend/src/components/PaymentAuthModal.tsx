import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader, Eye, EyeOff, CreditCard } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';

interface PaymentAuthModalProps {
  isOpen: boolean;
  nonce?: string;
  onClose: () => void;
  onSuccess: (accountData: any) => void;
}

const PaymentAuthModal: React.FC<PaymentAuthModalProps> = ({ isOpen, nonce, onClose, onSuccess }) => {
  const { loginWithPassword, createAccountWithPassword } = useSession();
  const [isLogin, setIsLogin] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        console.log(' Payment login attempt...');
        result = await loginWithPassword('customer', password);
      } else {
        console.log(' Payment account creation attempt...');
        result = await createAccountWithPassword('customer', password);
      }
      
      console.log('Payment authentication successful:', result);
      
      
      try {
        sessionStorage.setItem('justAuthenticated', '1');
        sessionStorage.setItem('lastPage', 'dashboard');
      } catch {}

      // Call onSuccess with the result data
      onSuccess(result);
      
      // Reset form but don't close modal - let parent handle it
      resetForm();
    } catch (err: any) {
      console.error(' Payment authentication failed:', err);
      setError(err.message || (isLogin ? 'Login failed' : 'Account creation failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsLogin(null);
    setPassword('');
    setShowPassword(false);
    setError('');
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg mr-3 bg-blue-100 text-blue-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Payment Authentication
                </h2>
                <p className="text-sm text-gray-600">
                  {isLogin === null ? 'Choose an action' : isLogin ? 'Sign in to pay' : 'Create account to pay'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Payment Info */}
          {nonce && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-center mb-2">
                <CreditCard className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">Payment Request</span>
              </div>
              <p className="text-xs text-blue-600 font-mono">{nonce}</p>
            </div>
          )}

          {/* Mode Selection */}
          {isLogin === null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <button
                onClick={() => setIsLogin(false)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
              >
                <h3 className="font-semibold text-gray-800">Create New Account</h3>
                <p className="text-sm text-gray-600">Start using AfriPayFlow with a new account</p>
              </button>

              <button
                onClick={() => setIsLogin(true)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all text-left"
              >
                <h3 className="font-semibold text-gray-800">Sign In</h3>
                <p className="text-sm text-gray-600">Access your existing account</p>
              </button>
            </motion.div>
          )}

          {/* Auth Form */}
          {isLogin !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isLogin ? 'Password' : 'Create Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? 'Enter your password' : 'Create a secure password'}
                    className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                    onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 6 characters long
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setIsLogin(null)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  onClick={handleAuth}
                  disabled={isLoading || !password.trim()}
                  className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-all ${
                    isLoading || !password.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      {isLogin ? 'Signing In...' : 'Creating...'}
                    </div>
                  ) : (
                    isLogin ? 'Sign In' : 'Create Account'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentAuthModal;
