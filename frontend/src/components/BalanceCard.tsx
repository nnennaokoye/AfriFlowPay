import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  Coins,
  Info,
  AlertTriangle,
  Loader
} from 'lucide-react';
import { useUserData } from '../contexts/SessionContext';
import { AccountBalance, TokenBalance } from '../types/api';

interface BalanceCardProps {
  showTokens?: boolean;
  showRefresh?: boolean;
  compact?: boolean;
  className?: string;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ 
  showTokens = true, 
  showRefresh = true,
  compact = false,
  className = ''
}) => {
  const { 
    balances, 
    lastBalanceUpdate, 
    refreshBalances, 
    isLoading,
    user 
  } = useUserData();
  
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshBalances();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh status
  const getUpdateStatus = () => {
    if (!lastBalanceUpdate) return 'Never updated';
    
    const now = new Date();
    const diffMs = now.getTime() - lastBalanceUpdate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 60) return `Updated ${diffSeconds}s ago`;
    if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
    return `Updated ${Math.floor(diffMinutes / 60)}h ago`;
  };

  const formatHbarAmount = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    } else {
      return amount.toFixed(2);
    }
  };

  const formatTokenAmount = (amount: number, decimals: number = 6): string => {
    const divisor = Math.pow(10, decimals);
    const formattedAmount = amount / divisor;
    
    if (formattedAmount >= 1000000) {
      return `${(formattedAmount / 1000000).toFixed(2)}M`;
    } else if (formattedAmount >= 1000) {
      return `${(formattedAmount / 1000).toFixed(2)}K`;
    } else {
      return formattedAmount.toFixed(2);
    }
  };

  // Loading State
  if (isLoading && !balances) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-gray-500">Loading balances...</p>
          </div>
        </div>
      </div>
    );
  }

  // No balances state
  if (!balances) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-gray-500">Unable to load balances</p>
            {showRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`bg-white rounded-xl shadow-md p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <Coins className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">HBAR Balance</p>
              <p className="font-semibold text-gray-800">
                {showBalance ? `${formatHbarAmount(balances.hbar)} ℏ` : '••••••'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {showRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-1 text-gray-400 hover:text-gray-600 transition-transform ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Account Balance</h3>
            <p className="text-blue-100 text-sm">
              {user?.accountId || 'Loading...'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            {showRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* HBAR Balance */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <Coins className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">HBAR</h4>
                <p className="text-sm text-gray-600">Hedera Native Token</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800">
                {showBalance ? formatHbarAmount(balances.hbar) : '••••••'}
              </p>
              <p className="text-sm text-gray-600">ℏ</p>
            </div>
          </div>
        </div>

        {/* Tokens Section */}
        {showTokens && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800">Tokens</h4>
              <span className="text-sm text-gray-500">
                {balances.tokens?.length || 0} tokens
              </span>
            </div>

            <AnimatePresence>
              {balances.tokens && balances.tokens.length > 0 ? (
                <div className="space-y-3">
                  {balances.tokens.map((token: TokenBalance, index: number) => (
                    <motion.div
                      key={token.tokenId || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center">
                        <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-2 rounded-lg mr-3">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {token.symbol || 'Unknown Token'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {token.tokenId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">
                          {showBalance ? formatTokenAmount(token.balance) : '••••••'}
                        </p>
                        <p className="text-xs text-gray-500">{token.symbol}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                    <Coins className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No tokens found</p>
                  <p className="text-sm text-gray-400">
                    Tokens will appear here when you receive them
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Update Status */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <Info className="w-4 h-4 mr-1" />
              {getUpdateStatus()}
            </div>
            {isRefreshing && (
              <div className="flex items-center">
                <Loader className="w-4 h-4 animate-spin mr-1" />
                Updating...
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BalanceCard;
