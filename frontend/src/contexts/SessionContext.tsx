import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '../services/apiClient';
import { AccountBalance, TransactionHistory, ApiError, CustodialBalanceResponse } from '../types/api';

// User Types
export interface User {
  userId: string;
  accountId: string;
  accountType: 'customer' | 'merchant';
  network: string;
  createdAt: string;
  balances?: AccountBalance;
}

// Session State Types
interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  balances: AccountBalance | null;
  lastBalanceUpdate: Date | null;
  recentTransactions: TransactionHistory | null;
  lastTransactionUpdate: Date | null;
}

// Session Actions
interface SessionActions {
  // Authentication
  createAccount: (accountType: 'customer' | 'merchant', userId?: string) => Promise<void>;
  createAccountWithPassword: (accountType: 'customer' | 'merchant', password: string) => Promise<any>;
  loginWithUserId: (userId: string, accountType: 'customer' | 'merchant') => Promise<void>;
  loginWithPassword: (accountType: 'customer' | 'merchant', password: string) => Promise<any>;
  logout: () => void;
  
  // Data refresh
  refreshBalances: () => Promise<void>;
  refreshTransactions: (params?: { limit?: number; order?: 'asc' | 'desc' }) => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  
  // State management
  clearError: () => void;
  setError: (error: string) => void;
}

// Context Type
interface SessionContextType extends SessionState, SessionActions {}

// Default State
const defaultState: SessionState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  balances: null,
  lastBalanceUpdate: null,
  recentTransactions: null,
  lastTransactionUpdate: null,
};

// Create Context
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Local Storage Keys
const STORAGE_KEYS = {
  USER: 'afriPayFlow_user',
  SESSION: 'afriPayFlow_session',
  BALANCES: 'afriPayFlow_balances',
  TRANSACTIONS: 'afriPayFlow_transactions',
} as const;

// Auto-refresh intervals (in milliseconds)
const REFRESH_INTERVALS = {
  BALANCES: 120000, // 2 minutes
  TRANSACTIONS: 180000, // 3 minutes
} as const;

// Provider Props
interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [state, setState] = useState<SessionState>(defaultState);

  // Load session from localStorage on mount
  useEffect(() => {
    loadSessionFromStorage();
  }, []);

  // Auto-refresh balances and transactions when authenticated
  useEffect(() => {
    if (!state.isAuthenticated || !state.user) return;

    console.log('🔄 Setting up auto-refresh for authenticated user');

    // Immediately load fresh data
    const loadInitialData = async () => {
      try {
        await Promise.all([
          refreshBalances(),
          refreshTransactions()
        ]);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();

    // Setup auto-refresh intervals
    const balanceInterval = setInterval(() => {
      refreshBalances();
    }, REFRESH_INTERVALS.BALANCES);

    const transactionInterval = setInterval(() => {
      refreshTransactions();
    }, REFRESH_INTERVALS.TRANSACTIONS);

    return () => {
      clearInterval(balanceInterval);
      clearInterval(transactionInterval);
    };
  }, [state.isAuthenticated, state.user]);

  // Helper: Load session data from localStorage
  const loadSessionFromStorage = useCallback(() => {
    try {
      const userData = localStorage.getItem(STORAGE_KEYS.USER);
      const sessionData = localStorage.getItem(STORAGE_KEYS.SESSION);
      const balancesData = localStorage.getItem(STORAGE_KEYS.BALANCES);
      const transactionsData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);

      if (userData && sessionData) {
        const user: User = JSON.parse(userData);
        const session = JSON.parse(sessionData);
        
        let balances = null;
        let lastBalanceUpdate = null;
        let recentTransactions = null;
        let lastTransactionUpdate = null;

        // Load cached balances if recent
        if (balancesData) {
          const balanceCache = JSON.parse(balancesData);
          const cacheAge = Date.now() - new Date(balanceCache.timestamp).getTime();
          if (cacheAge < REFRESH_INTERVALS.BALANCES) {
            balances = balanceCache.data;
            lastBalanceUpdate = new Date(balanceCache.timestamp);
          }
        }

        // Load cached transactions if recent
        if (transactionsData) {
          const transactionCache = JSON.parse(transactionsData);
          const cacheAge = Date.now() - new Date(transactionCache.timestamp).getTime();
          if (cacheAge < REFRESH_INTERVALS.TRANSACTIONS) {
            recentTransactions = transactionCache.data;
            lastTransactionUpdate = new Date(transactionCache.timestamp);
          }
        }

        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          balances,
          lastBalanceUpdate,
          recentTransactions,
          lastTransactionUpdate,
        });

        console.log('📱 Session restored from storage:', user.userId);
      } else {
        
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to load session from storage:', error);
      clearSessionStorage();
      setState(prev => ({ ...prev, isLoading: false }));
    }
    // Ensure loading state is cleared in all cases
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  // Helper: Save session data to localStorage
  const saveSessionToStorage = useCallback((user: User) => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      }));
      console.log('Session saved to storage');
    } catch (error) {
      console.error('Failed to save session to storage:', error);
    }
  }, []);

  // Helper: Clear session storage
  const clearSessionStorage = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log(' Session storage cleared');
  }, []);

  // Helper: Save data cache to storage
  const saveCacheToStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error(`Failed to save ${key} to storage:`, error);
    }
  }, []);

  // Helper: Handle API errors
  const handleApiError = useCallback((error: any, context: string) => {
    console.error(`${context} error:`, error);
    
    let errorMessage = 'An unexpected error occurred';
    
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    setState(prev => ({
      ...prev,
      error: errorMessage,
      isLoading: false,
    }));
  }, []);

  // Create Account
  const createAccount = useCallback(async (accountType: 'customer' | 'merchant', userId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`Creating ${accountType} account...`);
      
      const response = await apiClient.createCustodialAccount(userId);
      
      if (response.success && response.data) {
        const user: User = {
          userId: response.data.userId,
          accountId: response.data.accountId,
          accountType,
          network: response.data.network,
          createdAt: response.data.createdAt,
        };

        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));

        saveSessionToStorage(user);
        console.log(`${accountType} account created:`, user.userId);
      } else {
        throw new Error(response.message || 'Failed to create account');
      }
    } catch (error) {
      handleApiError(error, 'Account creation');
    }
  }, [saveSessionToStorage, handleApiError]);

  // Login with User ID
  const loginWithUserId = useCallback(async (userId: string, accountType: 'customer' | 'merchant') => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`Logging in user: ${userId}`);
      
      // Try to get user's balance to verify account exists
      const balanceResponse = await apiClient.getCustodialBalance(userId);
      
      if (balanceResponse.success && balanceResponse.data) {
        const user: User = {
          userId,
          accountId: balanceResponse.data.accountId,
          accountType,
          network: 'Hedera Testnet',
          createdAt: new Date().toISOString(), 
          balances: balanceResponse.data.balance,
        };

        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          balances: balanceResponse.data.balance,
          lastBalanceUpdate: new Date(),
        }));

        saveSessionToStorage(user);
        saveCacheToStorage(STORAGE_KEYS.BALANCES, balanceResponse.data.balance);
        console.log(`User logged in:`, userId);
      } else {
        throw new Error('User account not found');
      }
    } catch (error) {
      handleApiError(error, 'Login');
    }
  }, [saveSessionToStorage, saveCacheToStorage, handleApiError]);

  // Create Account with Password
  const createAccountWithPassword = useCallback(async (accountType: 'customer' | 'merchant', password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`Creating ${accountType} account with password...`);
      
      // Generate a userId based on password (you might want to use a hash function in production)
      const userId = `${accountType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await apiClient.createCustodialAccount(userId);

      if (response.success && response.data) {
        const user: User = {
          userId: response.data.userId,
          accountId: response.data.accountId,
          accountType,
          network: response.data.network,
          createdAt: response.data.createdAt,
        };

        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));

        saveSessionToStorage(user);
        
        // Save password mapping to localStorage for login
        const passwordMap = JSON.parse(localStorage.getItem('afripayflow_passwords') || '{}');
        passwordMap[password] = { userId: user.userId, accountType };
        localStorage.setItem('afripayflow_passwords', JSON.stringify(passwordMap));
        
        console.log(`${accountType} account created:`, user.userId);
        return { user, accountType, userId: user.userId };
      } else {
        throw new Error(response.message || 'Failed to create account');
      }
    } catch (error) {
      handleApiError(error, 'Account creation');
      throw error;
    }
  }, [saveSessionToStorage, handleApiError]);

  // Login with Password
  const loginWithPassword = useCallback(async (accountType: 'customer' | 'merchant', password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`Logging in with password...`);
      
      // Get userId from password mapping
      const passwordMap = JSON.parse(localStorage.getItem('afripayflow_passwords') || '{}');
      const userInfo = passwordMap[password];
      
      if (!userInfo || userInfo.accountType !== accountType) {
        throw new Error('Invalid password or account type');
      }
      
      // Try to get user's balance to verify account exists
      const balanceResponse = await apiClient.getCustodialBalance(userInfo.userId);
      
      if (balanceResponse.success && balanceResponse.data) {
        const user: User = {
          userId: userInfo.userId,
          accountId: balanceResponse.data.accountId,
          accountType,
          network: 'Hedera Testnet',
          createdAt: new Date().toISOString(),
          balances: balanceResponse.data.balance,
        };

        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          balances: balanceResponse.data.balance,
          lastBalanceUpdate: new Date(),
        }));

        saveSessionToStorage(user);
        saveCacheToStorage(STORAGE_KEYS.BALANCES, balanceResponse.data.balance);
        console.log(`User logged in:`, userInfo.userId);
        return { user, accountType, userId: userInfo.userId };
      } else {
        throw new Error('User account not found');
      }
    } catch (error) {
      handleApiError(error, 'Login');
      throw error;
    }
  }, [saveSessionToStorage, saveCacheToStorage, handleApiError]);

  // Logout
  const logout = useCallback(() => {
    setState(defaultState);
    clearSessionStorage();
    apiClient.clearCache();
    console.log('User logged out');
  }, [clearSessionStorage]);

  // Refresh Balances
  const refreshBalances = useCallback(async () => {
    if (!state.user) return;

    try {
      console.log('Refreshing balances...');
      
      const response = await apiClient.getCustodialBalance(state.user.userId);
      
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          balances: response.data.balance,
          lastBalanceUpdate: new Date(),
        }));

        saveCacheToStorage(STORAGE_KEYS.BALANCES, response.data.balance);
        console.log('Balances refreshed');
      }
    } catch (error) {
      console.error('Failed to refresh balances:', error);
      // Don't show error for background refresh failures
    }
  }, [state.user, saveCacheToStorage]);

  // Refresh Transactions
  const refreshTransactions = useCallback(async (params?: { limit?: number; order?: 'asc' | 'desc' }, forceRefresh = false) => {
    if (!state.user) return;

    try {
      console.log('Refreshing transactions...', forceRefresh ? '(forced)' : '');
      
      // Clear API cache for transaction requests to ensure fresh data
      if (forceRefresh) {
        apiClient.clearCache();
        console.log('Cleared API cache for fresh transaction data');
      }
      
      const response = await apiClient.getCustodialTransactions(state.user.userId, params);
      
    
      
      if (response.success && response.data) {
        // Handle nested transaction structure from backend
        const responseData = response.data as any; // Backend response structure
        const transactionData: TransactionHistory = {
          userId: responseData.userId,
          accountId: responseData.accountId,
          transactions: responseData.transactions?.transactions || responseData.transactions || [],
          count: responseData.pagination?.count || responseData.count || 0,
          limit: responseData.pagination?.limit || responseData.limit || 50,
          order: responseData.pagination?.order || responseData.order || 'desc'
        };
        
        // If no transactions found and this is the first attempt, retry once after a short delay
        if (transactionData.transactions.length === 0 && !forceRefresh) {
          console.log('⏳ No transactions found, retrying in 2 seconds...');
          setTimeout(() => {
            refreshTransactions(params, true);
          }, 2000);
          return;
        }
        
        setState(prev => ({
          ...prev,
          recentTransactions: transactionData,
          lastTransactionUpdate: new Date(),
        }));

        saveCacheToStorage(STORAGE_KEYS.TRANSACTIONS, transactionData);
        console.log(' Transactions refreshed:', transactionData.transactions.length, 'transactions');
      }
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
      // Don't show error for background refresh failures
    }
  }, [state.user, saveCacheToStorage]);

  // Refresh User Data
  const refreshUserData = useCallback(async () => {
    if (!state.user) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await Promise.all([
        refreshBalances(),
        refreshTransactions(),
      ]);
    } catch (error) {
      handleApiError(error, 'Data refresh');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.user, refreshBalances, refreshTransactions, handleApiError]);

  // Refresh All Data (force refresh without loading state for background updates)
  const refreshAllData = useCallback(async () => {
    if (!state.user) return;

    try {
      console.log(' Force refreshing all data...');
      
      await Promise.all([
        refreshBalances(),
        refreshTransactions(),
      ]);
      
      console.log(' All data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh all data:', error);
      // Don't show error for background refresh failures
    }
  }, [state.user, refreshBalances, refreshTransactions]);

  // Clear Error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Set Error
  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  // Context Value
  const contextValue: SessionContextType = {
    // State
    ...state,
    
    // Actions
    createAccount,
    createAccountWithPassword,
    loginWithUserId,
    loginWithPassword,
    logout,
    refreshBalances,
    refreshTransactions,
    refreshUserData,
    refreshAllData,
    clearError,
    setError,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

// Hook to use session context
export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  
  return context;
};

// Helper hook for authentication status
export const useAuth = () => {
  const { isAuthenticated, user, isLoading } = useSession();
  
  return {
    isAuthenticated,
    user,
    isLoading,
    isCustomer: user?.accountType === 'customer',
    isMerchant: user?.accountType === 'merchant',
  };
};

// Helper hook for user data with auto-refresh
export const useUserData = () => {
  const { 
    user, 
    balances, 
    recentTransactions, 
    lastBalanceUpdate, 
    lastTransactionUpdate,
    refreshBalances,
    refreshTransactions,
    refreshUserData,
    isLoading 
  } = useSession();

  return {
    user,
    balances,
    recentTransactions,
    lastBalanceUpdate,
    lastTransactionUpdate,
    refreshBalances,
    refreshTransactions,
    refreshUserData,
    isLoading,
    hasBalances: !!balances,
    hasTransactions: !!recentTransactions?.transactions?.length,
  };
};

export default SessionContext;