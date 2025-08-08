import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User,
  Store,
  CreditCard,
  Send,
  Download,
  LogOut,
  Settings,
  Bell,
  Eye,
  EyeOff,
  Wallet,
  Activity,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useSession, useUserData } from '../contexts/SessionContext';
import BalanceCard from './BalanceCard';
import TransactionHistory from './TransactionHistory';
import CreatePaymentRequest from './CreatePaymentRequest';
import PaymentPage from './PaymentPage';
import WithdrawFunds from './WithdrawFunds';
import BuyCrypto from './BuyCrypto';
// Removed tokenization/investment UI
import ViewPaymentRequests from './ViewPaymentRequests';

type DashboardView = 
  | 'overview'
  | 'create-payment' 
  | 'pay'
  | 'withdraw'
  | 'buy-crypto'
  | 'view-payment-requests'
  | 'transactions'
  | 'settings';

const Dashboard: React.FC = () => {
  const { logout, user } = useSession();
  const { balances, refreshUserData } = useUserData();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [showBalance, setShowBalance] = useState(true);

  const handleViewChange = (view: DashboardView) => {
    setCurrentView(view);
  };

  const handleBack = () => {
    setCurrentView('overview');
  };

  const [copiedField, setCopiedField] = useState<'accountId' | 'userId' | null>(null);

  const copyToClipboard = async (text: string, field: 'accountId' | 'userId') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatBalance = (amount: number): string => {
    if (!showBalance) return '••••••';
    
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    } else {
      return amount.toFixed(2);
    }
  };

  const isCustomer = user?.accountType === 'customer';
  const isMerchant = user?.accountType === 'merchant';

  const quickActions = [
    ...(isMerchant ? [
      {
        id: 'create-payment',
        title: 'Create Payment Request',
        description: 'Generate QR code for payments',
        icon: CreditCard,
        color: 'blue',
        view: 'create-payment' as DashboardView
      },
      {
        id: 'view-payment-requests',
        title: 'Payment Requests',
        description: 'Active QR links you created',
        icon: Send,
        color: 'blue',
        view: 'view-payment-requests' as DashboardView
      }
    ] : []),
    ...(isCustomer ? [
      {
        id: 'pay',
        title: 'Make Payment',
        description: 'Scan QR or enter payment code',
        icon: Send,
        color: 'green',
        view: 'pay' as DashboardView
      },
    ] : []),
    {
      id: 'withdraw',
      title: 'Withdraw Funds',
      description: 'Transfer to external wallet',
      icon: Download,
      color: 'red',
      view: 'withdraw' as DashboardView
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Render different views
  if (currentView === 'create-payment') {
    return <CreatePaymentRequest onBack={handleBack} />;
  }

  if (currentView === 'pay') {
    return <PaymentPage onBack={handleBack} />;
  }

  if (currentView === 'withdraw') {
    return <WithdrawFunds onBack={handleBack} />;
  }

  if (currentView === 'buy-crypto') {
    return <BuyCrypto onBack={handleBack} />;
  }

  if (currentView === 'view-payment-requests') {
    return <ViewPaymentRequests onBack={handleBack} />;
  }

  // Main dashboard overview
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Modern Navigation Bar */}
      <div className="bg-white/90 backdrop-blur-md shadow-sm border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AfriPayFlow</h1>
                <p className="text-xs text-gray-600">Gasless Crypto Payments</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title={showBalance ? "Hide balance" : "Show balance"}
              >
                {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              <button 
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </button>
              <button 
                onClick={() => handleViewChange('settings')}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg text-sm font-medium"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8"
      >
        {/* Hero Welcome Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 rounded-3xl p-8 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-white/5 rounded-full"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className={`p-4 rounded-2xl bg-white/20 backdrop-blur-sm ${
                    isMerchant ? 'ring-2 ring-purple-300' : 'ring-2 ring-white/30'
                  }`}>
                    {isMerchant ? (
                      <Store className="w-10 h-10 text-white" />
                    ) : (
                      <User className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">
                      {user?.userId || 'User'}
                    </h1>
                    <p className="text-white/90 text-lg font-medium">
                      Welcome to your {user?.accountType} dashboard
                    </p>
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center text-white/80">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                        <span className="text-sm">Online</span>
                      </div>
                      <div className="flex items-center text-white/80">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                        <span className="text-sm">{user?.network}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-sm mb-1">Account ID</p>
                  <code className="bg-white/20 px-3 py-1 rounded-lg text-sm font-mono">
                    {user?.accountId?.slice(0, 12)}...
                  </code>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Modern Stats Grid */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* HBAR Balance */}
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-green-100 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl" />
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">HBAR</div>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {formatBalance(balances?.hbar || 0)} ℏ
                </p>
                <p className="text-sm text-gray-600">Main Balance</p>
              </div>
            </motion.div>

            {/* Token Count */}
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-green-100 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl" />
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">TOKENS</div>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {balances?.tokens?.length || 0}
                </p>
                <p className="text-sm text-gray-600">Token Types</p>
              </div>
            </motion.div>

            {/* Account Status */}
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-green-100 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  isMerchant 
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                    : 'bg-gradient-to-br from-blue-500 to-blue-600'
                }`}>
                  {isMerchant ? (
                    <Store className="w-6 h-6 text-white" />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">TYPE</div>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1 capitalize">
                  {user?.accountType}
                </p>
                <p className="text-sm text-gray-600">Account</p>
              </div>
            </motion.div>

            {/* Network Status */}
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-green-100 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">NETWORK</div>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {user?.network}
                </p>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <p className="text-sm text-gray-600">Online</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Modern Action Cards */}
        <motion.div variants={itemVariants} className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Quick Actions</h2>
              <p className="text-gray-600">Choose an action to get started</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <div className="w-2 h-2 bg-secondary-500 rounded-full"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              const colorMap = {
                blue: 'from-primary-500 via-primary-600 to-primary-700',
                purple: 'from-purple-500 via-purple-600 to-purple-700',
                green: 'from-primary-500 via-primary-600 to-primary-700',
                emerald: 'from-secondary-500 via-secondary-600 to-secondary-700',
                red: 'from-red-500 via-red-600 to-red-700'
              };
              
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  className="group cursor-pointer"
                  onClick={() => handleViewChange(action.view)}
                >
                  <div className="relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-green-100 hover:shadow-2xl transition-all duration-500 hover:border-primary-200">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary-500 rounded-full"></div>
                      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-secondary-500 rounded-full"></div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorMap[action.color as keyof typeof colorMap]} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-300 rounded-full group-hover:bg-primary-500 transition-colors"></div>
                          <div className="w-2 h-2 bg-gray-300 rounded-full group-hover:bg-secondary-500 transition-colors delay-75"></div>
                          <div className="w-2 h-2 bg-gray-300 rounded-full group-hover:bg-purple-500 transition-colors delay-150"></div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                          {action.description}
                        </p>
                      </div>
                      
                      {/* Action Indicator */}
                      <div className="mt-6 flex items-center text-primary-600 font-medium group-hover:translate-x-2 transition-transform duration-300">
                        <span className="text-sm">Get Started</span>
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Balance and Transactions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Detailed Balance Card */}
            <motion.div variants={itemVariants}>
              <BalanceCard showTokens={true} showRefresh={true} />
            </motion.div>

            {/* Recent Transactions */}
            <motion.div variants={itemVariants}>
              <TransactionHistory limit={5} showFilters={false} />
            </motion.div>
          </div>

          {/* Right Column - Additional Info */}
          <div className="space-y-6">
            {/* Modern Account Info */}
            <motion.div variants={itemVariants}>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-green-100 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center mr-3">
                    <Wallet className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Account Details</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-primary-50 rounded-lg">
                    <span className="text-gray-700 font-medium">User ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-white px-3 py-1 rounded-lg font-mono text-primary-700 border border-primary-200">
                        {user?.userId}
                      </code>
                      <button
                        onClick={() => user?.userId && copyToClipboard(user.userId, 'userId')}
                        className="p-1 text-gray-500 hover:text-primary-600"
                        title="Copy User ID"
                      >
                        {copiedField === 'userId' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-primary-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Account ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-white px-3 py-1 rounded-lg font-mono text-primary-700 border border-primary-200">
                        {user?.accountId}
                      </code>
                      <button
                        onClick={() => user?.accountId && copyToClipboard(user.accountId, 'accountId')}
                        className="p-1 text-gray-500 hover:text-primary-600"
                        title="Copy Account ID"
                      >
                        {copiedField === 'accountId' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-primary-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Network:</span>
                    <span className="text-sm font-bold text-primary-600">{user?.network}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-primary-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Type:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isMerchant 
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                        : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                    }`}>
                      {user?.accountType}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Modern Quick Stats */}
            <motion.div variants={itemVariants}>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-green-100 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-xl flex items-center justify-center mr-3">
                    <Activity className="w-5 h-5 text-secondary-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Quick Stats</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-secondary-50 to-yellow-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Total Tokens</span>
                    <span className="font-bold text-secondary-600">{balances?.tokens?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50 to-green-50 rounded-lg">
                    <span className="text-gray-700 font-medium">HBAR Balance</span>
                    <span className="font-bold text-primary-600">{formatBalance(balances?.hbar || 0)} ℏ</span>
                  </div>
                  <button
                    onClick={refreshUserData}
                    className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-200 text-sm font-bold shadow-lg hover:shadow-xl"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Modern Feature Info */}
            <motion.div variants={itemVariants}>
              <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 rounded-2xl p-6 border border-primary-200 shadow-xl">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mr-3">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">AfriPayFlow Features</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-white/60 rounded-lg border border-primary-100">
                    <div className="w-3 h-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full mr-3"></div>
                    <span className="text-gray-800 font-medium">Gasless transactions</span>
                  </div>
                  <div className="flex items-center p-3 bg-white/60 rounded-lg border border-primary-100">
                    <div className="w-3 h-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full mr-3"></div>
                    <span className="text-gray-800 font-medium">Invoice tokenization</span>
                  </div>
                  <div className="flex items-center p-3 bg-white/60 rounded-lg border border-primary-100">
                    <div className="w-3 h-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full mr-3"></div>
                    <span className="text-gray-800 font-medium">Multi-token support</span>
                  </div>
                  <div className="flex items-center p-3 bg-white/60 rounded-lg border border-primary-100">
                    <div className="w-3 h-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full mr-3"></div>
                    <span className="text-gray-800 font-medium">Real-time balances</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;

