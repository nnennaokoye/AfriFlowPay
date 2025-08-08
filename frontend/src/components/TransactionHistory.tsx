import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Search,
  Calendar,
  TrendingUp,
  Loader,
  Copy,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { useUserData } from '../contexts/SessionContext';
import { Transaction } from '../types/api';

interface TransactionHistoryProps {
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
  className?: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
  limit = 10,
  showFilters = true,
  compact = false,
  className = ''
}) => {
  const { 
    user,
    recentTransactions, 
    lastTransactionUpdate, 
    refreshTransactions, 
    isLoading
  } = useUserData();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshTransactions({ limit: limit * 2, order: sortOrder });
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshTransactions, limit, sortOrder]);

  const copyTransactionId = async (txId: string) => {
    try {
      await navigator.clipboard.writeText(txId);
      setCopiedTxId(txId);
      setTimeout(() => setCopiedTxId(null), 2000);
    } catch (error) {
      console.error('Failed to copy transaction ID:', error);
    }
  };

  const getTransactionType = (tx: any): 'incoming' | 'outgoing' | 'unknown' => {
    const accountId = user?.accountId;
    if (!accountId) return 'unknown';
    if (tx.transfers && Array.isArray(tx.transfers)) {
      const self = tx.transfers.find((t: any) => String(t.account) === String(accountId));
      if (self) {
        const tinybars = Number(self.amount) || 0;
        if (tinybars < 0) return 'outgoing';
        if (tinybars > 0) return 'incoming';
      }
    }

    // HTS token transfers
    const tokenTransfers = (tx.tokenTransfers || tx.token_transfers) as any[] | undefined;
    if (tokenTransfers && Array.isArray(tokenTransfers)) {
      const self = tokenTransfers.find((t: any) => String(t.account) === String(accountId));
      if (self) {
        const units = Number(self.amount) || 0;
        if (units < 0) return 'outgoing';
        if (units > 0) return 'incoming';
      }
    }
    if ((tx.type || tx.name) === 'CRYPTOCREATEACCOUNT') return 'outgoing';
    return 'unknown';
  };

  const getTransactionIcon = (tx: Transaction) => {
    const type = getTransactionType(tx);
    switch (type) {
      case 'incoming':
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />;
      case 'outgoing':
        return <ArrowUpRight className="w-5 h-5 text-red-600" />;
      default:
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
    }
  };

  const getTransactionColor = (tx: Transaction) => {
    const type = getTransactionType(tx);
    switch (type) {
      case 'incoming':
        return 'text-green-600';
      case 'outgoing':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const parseTransactionAmount = (tx: any): number => {
    console.log('🔍 parseTransactionAmount called with transaction:', {
      transactionId: tx.transactionId || tx.transaction_id,
      type: tx.type || tx.name,
      amount: tx.amount,
      transfers: tx.transfers,
      charged_tx_fee: tx.charged_tx_fee
    });
    
    // First, try the processed amount from backend
    if (tx.amount !== undefined && tx.amount !== null && !isNaN(tx.amount)) {
      console.log('✅ Using processed amount from backend:', tx.amount);
      return parseFloat(tx.amount);
    }
    
    // Prefer explicit processed amount from backend (covers token payments/deposits when provided)
    if (tx.amount !== undefined && tx.amount !== null && !isNaN(tx.amount)) {
      return Math.abs(parseFloat(tx.amount));
    }

    // Prefer calculating based on the user's own transfer row (HBAR tinybars)
    const accountId = user?.accountId;
    if (accountId && tx.transfers && Array.isArray(tx.transfers)) {
      const selfRows = tx.transfers.filter((t: any) => String(t.account) === String(accountId));
      if (selfRows.length > 0) {
        // Sum tinybars for user's account; negative => outgoing
        const totalTinybars = selfRows.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const amountHbar = Math.abs(totalTinybars) / 100000000;
        if (amountHbar > 0) {
          console.log('💰 Amount from user transfer rows:', amountHbar);
          return amountHbar;
        }
      }
    }

    // HTS token transfers (USDC/USDT etc.)
    const tokenTransfers = (tx.tokenTransfers || tx.token_transfers) as any[] | undefined;
    if (accountId && tokenTransfers && Array.isArray(tokenTransfers)) {
      const selfRows = tokenTransfers.filter((t: any) => String(t.account) === String(accountId));
      if (selfRows.length > 0) {
        const totalUnits = selfRows.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const currency = (tx.currency || '').toUpperCase();
        const decimals = (typeof tx.tokenDecimals === 'number' && tx.tokenDecimals >= 0)
          ? tx.tokenDecimals
          : (typeof tx.decimals === 'number' && tx.decimals >= 0)
            ? tx.decimals
            : (currency === 'USDC' || currency === 'USDT')
              ? 6
              : 0;
        const divisor = Math.pow(10, decimals);
        const amountToken = Math.abs(totalUnits) / divisor;
        if (amountToken > 0) {
          console.log('💰 Amount from token transfer rows:', amountToken, 'decimals:', decimals);
          return amountToken;
        }
      }
    }

    // Fallback: Calculate from all transfers if available
    if (tx.transfers && Array.isArray(tx.transfers) && tx.transfers.length > 0) {
      console.log('🔄 Calculating amount from transfers:', tx.transfers);
      
      // For account creation, use 1 HBAR
      if (tx.type === 'CRYPTOCREATEACCOUNT' || tx.name === 'CRYPTOCREATEACCOUNT') {
        console.log('🏗️ Account creation transaction, using 1 HBAR');
        return 1.0;
      }
      
      // For transfers, find meaningful amounts (exclude fee collector/treasury)
      const meaningfulTransfers = tx.transfers.filter((t: any) => 
        t.account && 
        !String(t.account).startsWith('0.0.98') && // Exclude fee collector
        !String(t.account).startsWith('0.0.3') // Exclude treasury
      );

      if (meaningfulTransfers.length > 0) {
        // Use the largest absolute transfer value (in tinybars) as the transaction amount
        const maxTinybars = meaningfulTransfers.reduce((max: number, t: any) => {
          const val = Math.abs(Number(t.amount) || 0);
          return val > max ? val : max;
        }, 0);

        const amount = maxTinybars / 100000000; // convert tinybars → HBAR
        console.log('💰 Calculated amount from transfers:', amount);
        return amount;
      }
    }
    
    // Last resort: use transaction fee
    if (tx.charged_tx_fee) {
      const feeAmount = Math.abs(tx.charged_tx_fee) / 100000000;
      console.log('💸 Using transaction fee as amount:', feeAmount);
      return feeAmount;
    }
    
    console.log('❌ Could not determine transaction amount, defaulting to 0');
    return 0;
  };

  const formatAmount = (amount: string | number): string => {
    console.log('🔢 formatAmount called with:', { amount, type: typeof amount });
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num) || num === null || num === undefined) {
      console.log('⚠️ formatAmount returning 0 for invalid number:', num);
      return '0.00';
    }
    
    // Handle zero
    if (num === 0) {
      console.log('⚠️ formatAmount: amount is exactly 0');
      return '0.00';
    }
    
    // Improve precision for very small amounts
    if (num < 0.000001) {
      return num.toFixed(8);
    }
    if (num < 0.001) {
      return num.toFixed(6);
    }
    if (num < 0.01) {
      return num.toFixed(4);
    }

    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    } else {
      const formatted = num.toFixed(2);
      console.log('💰 formatAmount result:', formatted);
      return formatted;
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getHederaScanUrl = (txId: string): string => {
    if (!txId) return '#';
    // Remove timestamp portion if present
    const cleanTxId = txId.split('@')[0];
    return `https://hashscan.io/testnet/transaction/${cleanTxId}`;
  };

  useEffect(() => {
    if (recentTransactions?.transactions && Array.isArray(recentTransactions.transactions) && recentTransactions.transactions.length > 0) {
      console.log('Transaction data structure:', recentTransactions.transactions[0]);
      console.log('Amount data:', {
        rawAmount: (recentTransactions.transactions[0] as any).amount,
        formattedAmount: formatAmount((recentTransactions.transactions[0] as any).amount || 0),
        currency: (recentTransactions.transactions[0] as any).currency
      });
    }
  }, [recentTransactions]);

  // Filter and search transactions
  const filteredTransactions = React.useMemo(() => {
    if (!recentTransactions?.transactions || !Array.isArray(recentTransactions.transactions)) {
      return [];
    }

    let filtered = recentTransactions.transactions.filter(tx => tx && typeof tx === 'object');
    
    // Debug transaction amounts
    console.log('🔍 TransactionHistory - Debugging transaction amounts:');
    filtered.forEach((tx, index) => {
      console.log(`Transaction ${index}:`, {
        transactionId: (tx as any).transactionId || (tx as any).transaction_id,
        type: (tx as any).type || (tx as any).name,
        amount: (tx as any).amount,
        rawAmount: (tx as any).rawAmount,
        transfers: (tx as any).transfers,
        currency: (tx as any).currency,
        fullTransaction: tx
      });
    });

    // Apply search filter
    if (searchTerm && filtered.length > 0) {
      filtered = filtered.filter(tx => {
        const txId = (tx as any).transactionId || (tx as any).transaction_id || '';
        const txType = (tx as any).type || (tx as any).name || '';
        const txCurrency = (tx as any).currency || 'HBAR';
        
        return txId.toLowerCase().includes(searchTerm.toLowerCase()) ||
               txType.toLowerCase().includes(searchTerm.toLowerCase()) ||
               txCurrency.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Apply type filter
    if (filterType !== 'all' && filtered.length > 0) {
      filtered = filtered.filter(tx => {
        try {
          return getTransactionType(tx) === filterType;
        } catch (error) {
          console.warn('Error filtering transaction:', error, tx);
          return false;
        }
      });
    }

    // Ensure we return valid transactions only
    return filtered.slice(0, limit);
  }, [recentTransactions?.transactions, searchTerm, filterType, limit]);

  // Loading State
  if (isLoading && !recentTransactions) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-gray-500">Loading transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  // No transactions state
  if (!recentTransactions?.transactions || recentTransactions.transactions.length === 0) {
  return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Transaction History</h3>
          {showFilters && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 text-gray-400 hover:text-gray-600 transition-transform ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-2">No transactions yet</p>
          <p className="text-sm text-gray-400">
            Your transaction history will appear here
          </p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`bg-white rounded-xl shadow-md ${className}`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-800">Recent Activity</h4>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-1 text-gray-400 hover:text-gray-600 transition-transform ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {filteredTransactions.slice(0, 3).map((tx, index) => (
            <div key={tx.transactionId || index} className="flex items-center space-x-3">
              <div className="bg-gray-100 p-2 rounded-lg">
                {getTransactionIcon(tx)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {tx.type}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTimestamp(tx.timestamp)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${getTransactionColor(tx)}`}>
                  {formatAmount(tx.amount)} {tx.currency}
                </p>
              </div>
            </div>
          ))}
          {filteredTransactions.length > 3 && (
            <div className="text-center pt-2">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View all ({filteredTransactions.length})
              </button>
            </div>
          )}
            </div>
          </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Transaction History</h3>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 text-gray-400 hover:text-gray-600 transition-transform ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'incoming', label: 'Incoming' },
                  { key: 'outgoing', label: 'Outgoing' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterType(key as any)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                      filterType === key
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-4 h-4 mr-1" />
                <span className="text-sm">
                  {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction List */}
      <div className="divide-y divide-gray-100">
        <AnimatePresence>
          {filteredTransactions.map((tx, index) => (
            <motion.div
              key={tx.transactionId || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-100 p-3 rounded-full">
                    {getTransactionIcon(tx)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-800">{(tx as any).type || (tx as any).name || 'Transfer'}</p>
                      {(tx as any).status && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (tx as any).status === 'SUCCESS' 
                            ? 'bg-green-100 text-green-800'
                            : (tx as any).status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {(tx as any).status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-gray-500">
                        {formatTimestamp((tx as any).timestamp || (tx as any).consensus_timestamp)}
                      </p>
                      <button
                        onClick={() => setShowDetails(showDetails === ((tx as any).transactionId || (tx as any).transaction_id) ? null : ((tx as any).transactionId || (tx as any).transaction_id))}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {showDetails === ((tx as any).transactionId || (tx as any).transaction_id) ? 'Hide details' : 'Show details'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`text-lg font-semibold ${getTransactionColor(tx)}`}>
                    {getTransactionType(tx) === 'incoming' ? '+' : '-'}
                    {formatAmount(parseTransactionAmount(tx))} {(tx as any).currency || 'HBAR'}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <AnimatePresence>
                {showDetails === ((tx as any).transactionId || (tx as any).transaction_id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden mt-4 pt-4 border-t border-gray-100"
                  >
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Transaction ID:</span>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-white px-2 py-1 rounded border font-mono">
                            {(tx as any).transactionId && (tx as any).transactionId.length > 20 
                              ? `${(tx as any).transactionId.slice(0, 20)}...`
                              : (tx as any).transactionId || 'N/A'
                            }
                          </code>
                          <button
                            onClick={() => copyTransactionId((tx as any).transactionId)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {copiedTxId === (tx as any).transactionId ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={getHederaScanUrl((tx as any).transactionId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                        </div>
                        
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Type:</span>
                        <span className="text-sm font-medium">{(tx as any).type}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="text-sm font-medium">
                          {(tx as any).amount} {(tx as any).currency}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Timestamp:</span>
                        <span className="text-sm font-medium">
                          {(tx as any).timestamp && !isNaN(new Date((tx as any).timestamp).getTime()) 
                            ? new Date((tx as any).timestamp).toLocaleString()
                            : 'Invalid date'
                          }
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
                  </motion.div>
                ))}
        </AnimatePresence>
              </div>

      {/* Footer */}
      {filteredTransactions.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {filteredTransactions.length} of {recentTransactions?.count || 0} transactions
            </span>
            <span>
              {lastTransactionUpdate 
                ? `Updated ${formatTimestamp(lastTransactionUpdate.toISOString())}`
                : 'Never updated'
              }
            </span>
          </div>
        </div>
      )}
        </motion.div>
  );
};

export default TransactionHistory;