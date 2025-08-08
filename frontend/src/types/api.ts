// TypeScript interfaces for AfriPayFlow API
// Based on backend API documentation

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error: string;
  errorCode?: string;
  timestamp?: string;
}

// Account Types
export interface CustodialAccount {
  userId: string;
  accountId: string;
  createdAt: string;
  initialBalance?: string;
  network: string;
  publicKey?: string;
}

export interface AccountBalance {
  hbar: number;
  tokens: TokenBalance[];
}

// Custodial balance API response structure
export interface CustodialBalanceResponse {
  userId: string;
  accountId: string;
  balance: AccountBalance;
  timestamp: string;
  network: string;
}

export interface TokenBalance {
  tokenId: string;
  balance: number;
  symbol?: string;
  name?: string;
}

export interface Transaction {
  transactionId: string;
  timestamp: string;
  type: string;
  amount: string | number;
  currency: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface TransactionHistory {
  userId?: string;
  accountId: string;
  transactions: Transaction[];
  count: number;
  limit: number;
  order?: 'asc' | 'desc';
}

// Payment Types
export interface PaymentQR {
  nonce: string;
  qrData: string;
  amount: number;
  tokenType: string;
  merchantUserId: string;
  expiresAt: string;
  paymentLink?: string;
}

export interface PaymentRequest {
  merchantId: string;
  amount?: number;
  tokenType?: string;
  description?: string;
}

export interface PaymentProcess {
  paymentData: string;
  customerUserId: string;
  amount?: number;
}

export interface PaymentStatus {
  status: 'pending_payment' | 'completed' | 'failed';
  nonce: string;
  merchantUserId: string;
  amount: number;
  tokenType: string;
  transactionId?: string;
  timestamp?: string;
  createdAt?: string;
  expiresAt?: string;
  message?: string;
}

export interface PaymentValidation {
  isValid: boolean;
  message: string;
  nonce: string;
}

// Withdrawal Types
export interface WithdrawalRequest {
  userId: string;
  amount: number;
  token?: string;
  destinationAddress: string;
}

export interface WithdrawalStatus {
  withdrawalId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  token: string;
  destinationAddress: string;
  requestedAt: string;
  completedAt?: string;
  message?: string;
}

export interface WithdrawalHistory {
  userId: string;
  withdrawals: WithdrawalStatus[];
  total: number;
}

// YellowCard Types
export interface Country {
  code: string;
  name: string;
  currency: string;
  supported: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  processingTime: string;
  fees: string;
}

export interface CryptoPurchase {
  userId: string;
  countryCode: string;
  paymentMethod: string;
  fiatAmount: number;
  cryptoToken: string;
}

export interface CryptoPurchaseResult {
  purchaseId: string;
  userId: string;
  status: string;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: number;
  cryptoToken: string;
  exchangeRate: number;
  fees: {
    yellowCard: number;
    network: number;
  };
  timestamp: string;
}

// Invoice Types - Fixed to match backend expectations
export interface InvoiceCreate {
  merchantId: string; // Backend expects 'merchantId', not 'merchantUserId'
  amount: number;
  currency?: string; // Optional, defaults to 'USD' in backend
  description: string;
  dueDate: string;
  serviceType?: string; // Optional, defaults to 'General Services' in backend
  // Removed customerInfo - not required by backend
}

// Optional: fractionalized/tokenized invoice create payload (frontend convenience)
export interface TokenizedInvoiceCreate {
  merchantId: string;
  invoiceId?: string;
  faceValue: number;
  currency?: string;
  description: string;
  dueDate: string;
  decimals?: number;
  isFractional?: boolean;
  metadata?: Record<string, any>;
}

export interface Invoice {
  invoiceId: string;
  tokenId: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  dueDate: string;
  createdAt: string;
  merchantInfo?: {
    userId: string;
    accountId: string;
  };
  tokenInfo?: {
    tokenId: string;
    name: string;
    symbol: string;
    totalSupply: number;
    metadata: string;
  };
  tokenIdFT?: string;
}

export interface InvestmentOpportunity {
  opportunityId: string;
  invoiceId: string;
  investmentPercentage: number;
  minimumInvestment: number;
  totalInvestmentNeeded: number;
  status: string;
}

// Investment Types - Fixed to match backend expectations
export interface Investment {
  opportunityId: string; // Backend expects 'opportunityId', not 'invoiceId'
  investorUserId: string;
  investmentAmount: number;
}

export interface InvestmentResult {
  investmentId: string;
  investorUserId: string;
  invoiceId: string;
  amount: number;
  status: string;
  expectedReturn: number;
  returnRate: number;
  maturityDate: string;
  createdAt: string;
}

export interface InvestmentPortfolio {
  userId: string;
  accountId: string;
  totalInvested: number;
  totalValue: number;
  totalReturns: number;
  investments: InvestmentResult[];
  summary: {
    activeInvestments: number;
    completedInvestments: number;
    averageReturn: number;
  };
}

// Direct Deposit Types
export interface DirectDepositRequest {
  userId: string;
  amount: number;
  tokenType?: string;
  bankDetails: {
    accountNumber: string;
    routingNumber: string;
    accountType: string; // Fixed: Backend expects 'accountType', not 'bankName'
  };
}

export interface DirectDepositResult {
  depositId: string;
  userId: string;
  amount: number;
  tokenType: string;
  status: 'pending' | 'completed' | 'failed';
  estimatedCompletion: string;
  bankDetails: {
    accountNumber: string; // masked
    bankName: string;
  };
  initiatedAt: string;
  completedAt?: string;
}

export interface DirectDepositHistory {
  userId: string;
  deposits: DirectDepositResult[];
  total: number;
  limit: number;
}

// Balance API v1 Types
export interface AccountBalanceV1 {
  accountId: string;
  balances: {
    hbar: number;
    tokens: TokenBalance[];
  };
  timestamp: string;
}

export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  treasuryAccountId: string;
}

export interface TokensOverview {
  tokens: Record<string, {
    tokenId: string;
    name: string;
    symbol: string;
    status: string;
  }>;
  totalTokens: number;
}

// Transaction API v1 Types
export interface TransactionDetails {
  transactionId: string;
  type: string;
  status: string;
  timestamp: string;
  transfers: any[];
}

export interface PaymentTransactionHistory {
  transactions: Transaction[];
  summary: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
  };
  filters: {
    limit: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
  };
}

export interface TransactionStats {
  period: string;
  stats: {
    totalTransactions: number;
    totalVolume: number;
    averageAmount: number;
    successRate: number;
  };
  timestamp: string;
}

// Health Check Types
export interface HealthStatus {
  status: string;
  timestamp: string;
  environment: string;
  project: string;
  features: {
    hederaIntegration: boolean;
    custodialAccounts: boolean;
    tokenSupport: boolean;
    balanceAPI: boolean;
    transactionAPI: boolean;
  };
}

// Query Parameters
export interface PaginationParams {
  limit?: number;
  order?: 'asc' | 'desc';
}

export interface TransactionQueryParams extends PaginationParams {
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface StatsQueryParams {
  accountId?: string;
  userId?: string;
  period?: string;
}
