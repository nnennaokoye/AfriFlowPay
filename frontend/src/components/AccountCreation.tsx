import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Store, 
  Loader, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  Shield,
  Coins,
  Globe
} from 'lucide-react';
import { useSession } from '../contexts/SessionContext';

interface AccountCreationProps {
  onAccountCreated?: (user: any) => void;
  onBack?: () => void;
}

const AccountCreation: React.FC<AccountCreationProps> = ({ onAccountCreated, onBack }) => {
  const { createAccount, loginWithUserId, isLoading, error, clearError } = useSession();
  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [accountType, setAccountType] = useState<'customer' | 'merchant' | null>(null);
  const [customUserId, setCustomUserId] = useState('');
  const [loginUserId, setLoginUserId] = useState('');
  const [loginAccountType, setLoginAccountType] = useState<'customer' | 'merchant'>('customer');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleCreateAccount = useCallback(async () => {
    if (!accountType) return;

    clearError();
    
    try {
      const userId = customUserId.trim() || undefined;
      await createAccount(accountType, userId);
      
      // Account creation successful - the session context will handle state updates
      if (onAccountCreated) {
        onAccountCreated({ accountType, userId });
      }
    } catch (err) {
      // Error is handled by session context
      console.error('Account creation failed:', err);
    }
  }, [accountType, customUserId, createAccount, clearError, onAccountCreated]);

  const handleLogin = useCallback(async () => {
    if (!loginUserId.trim()) return;

    clearError();
    
    try {
      await loginWithUserId(loginUserId.trim(), loginAccountType);
      
      if (onAccountCreated) {
        onAccountCreated({ accountType: loginAccountType, userId: loginUserId });
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  }, [loginUserId, loginAccountType, loginWithUserId, clearError, onAccountCreated]);

  const resetForm = () => {
    setAccountType(null);
    setCustomUserId('');
    setLoginUserId('');
    setShowAdvanced(false);
    clearError();
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <motion.div variants={itemVariants} className="text-center">
            <div className="flex items-center justify-center mb-3">
              <Globe className="w-8 h-8 mr-2" />
              <h1 className="text-2xl font-bold">AfriPayFlow</h1>
            </div>
            <p className="text-blue-100">
              {mode === 'create' ? 'Create Your Account' : 'Access Your Account'}
            </p>
          </motion.div>
        </div>

        <div className="p-6">
          {/* Mode Toggle */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => { setMode('create'); resetForm(); }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  mode === 'create'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Create Account
              </button>
              <button
                onClick={() => { setMode('login'); resetForm(); }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Login
              </button>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {mode === 'create' ? (
              <motion.div
                key="create"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                {/* Account Type Selection */}
                {!accountType ? (
                  <motion.div variants={itemVariants} className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
                      Choose Account Type
                    </h3>
                    
                    <button
                      onClick={() => setAccountType('customer')}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-3 rounded-full mr-4 group-hover:bg-blue-200">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-800">Customer</h4>
                          <p className="text-sm text-gray-600">Send payments, buy crypto, manage funds</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                      </div>
                    </button>

                    <button
                      onClick={() => setAccountType('merchant')}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all group"
                    >
                      <div className="flex items-center">
                        <div className="bg-purple-100 p-3 rounded-full mr-4 group-hover:bg-purple-200">
                          <Store className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-800">Merchant</h4>
                          <p className="text-sm text-gray-600">Receive payments, create invoices, manage business</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
                      </div>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div variants={itemVariants} className="space-y-4">
                    {/* Selected Account Type */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        {accountType === 'customer' ? (
                          <User className="w-5 h-5 text-blue-600 mr-2" />
                        ) : (
                          <Store className="w-5 h-5 text-purple-600 mr-2" />
                        )}
                        <span className="font-medium text-gray-800">
                          {accountType === 'customer' ? 'Customer Account' : 'Merchant Account'}
                        </span>
                      </div>
                      <button
                        onClick={() => setAccountType(null)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Change
                      </button>
                    </div>

                    {/* Advanced Options */}
                    <div>
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm text-gray-600 hover:text-gray-800 mb-2"
                      >
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                      </button>
                      
                      <AnimatePresence>
                        {showAdvanced && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                              <label className="block">
                                <span className="text-sm font-medium text-gray-700">Custom User ID (Optional)</span>
                                <input
                                  type="text"
                                  value={customUserId}
                                  onChange={(e) => setCustomUserId(e.target.value)}
                                  placeholder="Leave blank for auto-generated ID"
                                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </label>
                              <p className="text-xs text-gray-500">
                                If not specified, a unique ID will be generated automatically
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Create Button */}
                    <button
                      onClick={handleCreateAccount}
                      disabled={isLoading}
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
                        isLoading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : accountType === 'customer'
                          ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                          : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <Loader className="w-5 h-5 animate-spin mr-2" />
                          Creating Account...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Shield className="w-5 h-5 mr-2" />
                          Create {accountType === 'customer' ? 'Customer' : 'Merchant'} Account
                        </div>
                      )}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="login"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                {/* Account Type for Login */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setLoginAccountType('customer')}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        loginAccountType === 'customer'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Customer
                    </button>
                    <button
                      onClick={() => setLoginAccountType('merchant')}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        loginAccountType === 'merchant'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Merchant
                    </button>
                  </div>
                </div>

                {/* User ID Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={loginUserId}
                    onChange={(e) => setLoginUserId(e.target.value)}
                    placeholder="Enter your user ID"
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Login Button */}
                <button
                  onClick={handleLogin}
                  disabled={isLoading || !loginUserId.trim()}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
                    isLoading || !loginUserId.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Logging In...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Access Account
                    </div>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center"
              >
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Features */}
          <motion.div variants={itemVariants} className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">What you get:</h4>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Coins className="w-4 h-4 mr-2 text-green-500" />
                Gasless crypto transactions
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="w-4 h-4 mr-2 text-blue-500" />
                Secure custodial wallet
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Globe className="w-4 h-4 mr-2 text-purple-500" />
                Hedera blockchain integration
              </div>
            </div>
          </motion.div>

          {/* Back Button */}
          {onBack && (
            <motion.button
              variants={itemVariants}
              onClick={onBack}
              className="w-full mt-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Home
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AccountCreation;