import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { 
  ApiResponse, 
  ApiError,
  CustodialAccount,
  AccountBalance,
  CustodialBalanceResponse,
  TransactionHistory,
  PaymentQR,
  PaymentRequest,
  PaymentProcess,
  PaymentStatus,
  PaymentValidation,
  WithdrawalRequest,
  WithdrawalStatus,
  WithdrawalHistory,
  Country,
  PaymentMethod,
  CryptoPurchase,
  CryptoPurchaseResult,
  InvoiceCreate,
  Invoice,
  TokenizedInvoiceCreate,
  InvestmentOpportunity,
  Investment,
  InvestmentResult,
  InvestmentPortfolio,
  DirectDepositRequest,
  DirectDepositResult,
  DirectDepositHistory,
  AccountBalanceV1,
  TokenInfo,
  TokensOverview,
  TransactionDetails,
  PaymentTransactionHistory,
  TransactionStats,
  HealthStatus,
  PaginationParams,
  TransactionQueryParams,
  StatsQueryParams
} from '../types/api';

// Configuration
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheEnabled: true,
  cacheDuration: 30000, // 30 seconds
};

// Request cache for GET requests
interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry>();

  private getCacheKey(config: AxiosRequestConfig): string {
    const params = config.params ? JSON.stringify(config.params) : '';
    return `${config.method}:${config.url}${params}`;
  }

  get(config: AxiosRequestConfig): any | null {
    if (!API_CONFIG.cacheEnabled || config.method?.toLowerCase() !== 'get') {
      return null;
    }

    const key = this.getCacheKey(config);
    const entry = this.cache.get(key);

    if (entry && Date.now() < entry.expiresAt) {
      console.log(`🔄 Cache hit for: ${key}`);
      return entry.data;
    }

    if (entry) {
      this.cache.delete(key);
    }

    return null;
  }

  set(config: AxiosRequestConfig, data: any): void {
    if (!API_CONFIG.cacheEnabled || config.method?.toLowerCase() !== 'get') {
      return;
    }

    const key = this.getCacheKey(config);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + API_CONFIG.cacheDuration,
    };

    this.cache.set(key, entry);
    console.log(`💾 Cached response for: ${key}`);
  }

  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  size(): number {
    return this.cache.size;
  }
}

class ApiClient {
  private client: AxiosInstance;
  private cache = new RequestCache();
  private pendingRequests = new Map<string, Promise<any>>();

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data) {
          console.log('📦 Request data:', config.data);
        }

        // Check cache for GET requests
        const cached = this.cache.get(config);
        if (cached) {
          // Simulate successful response
          return Promise.reject({ 
            isFromCache: true, 
            data: cached,
            config
          });
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`📥 ${response.status} ${response.config.url}`);
        
        // Cache successful GET responses
        this.cache.set(response.config, response.data);
        
        // Clean up pending requests
        const key = this.getPendingKey(response.config);
        this.pendingRequests.delete(key);

        return response;
      },
      async (error: any) => {
        // Handle cached responses
        if (error.isFromCache) {
          console.log('📋 Returning cached response');
          return Promise.resolve({ data: error.data });
        }

        console.error(`❌ ${error.response?.status || 'Network Error'} ${error.config?.url}`);
        
        // Clean up pending requests
        if (error.config) {
          const key = this.getPendingKey(error.config);
          this.pendingRequests.delete(key);
        }

        // Handle retry logic
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private getPendingKey(config: AxiosRequestConfig): string {
    const params = config.params ? JSON.stringify(config.params) : '';
    return `${config.method}:${config.url}${params}`;
  }

  private shouldRetry(error: AxiosError): boolean {
    const config = error.config as any;
    
    // Don't retry if we've already retried too many times
    if (config._retryCount >= API_CONFIG.retryAttempts) {
      return false;
    }

    // Retry on network errors or rate limiting
    return (
      !error.response || // Network error
      error.response.status === 429 || // Rate limited
      error.response.status >= 500 // Server error
    );
  }

  private async retryRequest(error: AxiosError): Promise<any> {
    const config = error.config as any;
    config._retryCount = config._retryCount || 0;
    config._retryCount++;

    let delay = API_CONFIG.retryDelay * Math.pow(2, config._retryCount - 1);

    // Check for Retry-After header
    const retryAfter = error.response?.headers['retry-after'];
    if (retryAfter) {
      delay = parseInt(retryAfter) * 1000;
    }

    console.log(`🔄 Retrying request in ${delay}ms (attempt ${config._retryCount}/${API_CONFIG.retryAttempts})`);

    await new Promise(resolve => setTimeout(resolve, delay));

    return this.client.request(config);
  }

  private formatError(error: AxiosError): ApiError {
    const response = error.response;
    
    if (response?.data) {
      // API returned structured error
      return response.data as ApiError;
    }

    // Network or other errors
    return {
      success: false,
      message: error.message || 'Network error occurred',
      error: error.code || 'NETWORK_ERROR',
      timestamp: new Date().toISOString(),
    };
  }

  // Generic request method with deduplication
  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const key = this.getPendingKey(config);

    // Check if there's already a pending request
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Deduplicating request: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Make the request and store the promise
    const promise = this.client.request<ApiResponse<T>>(config)
      .then(response => response.data)
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  // Account Management APIs
  async createCustodialAccount(userId?: string): Promise<ApiResponse<CustodialAccount>> {
    return this.request({
      method: 'POST',
      url: '/api/accounts/create',
      data: { userId },
    });
  }

  async getCustodialBalance(userId: string): Promise<ApiResponse<CustodialBalanceResponse>> {
    return this.request({
      method: 'GET',
      url: `/api/accounts/custodial/${userId}/balance`,
    });
  }

  async getCustodialTransactions(userId: string, params?: PaginationParams): Promise<ApiResponse<TransactionHistory>> {
    return this.request({
      method: 'GET',
      url: `/api/accounts/custodial/${userId}/transactions`,
      params,
    });
  }

  async getWalletBalance(walletAddress: string): Promise<ApiResponse<{ accountId: string; balances: AccountBalance }>> {
    return this.request({
      method: 'GET',
      url: `/api/accounts/${walletAddress}/balance`,
    });
  }

  async getWalletTransactions(walletAddress: string, params?: PaginationParams): Promise<ApiResponse<TransactionHistory>> {
    return this.request({
      method: 'GET',
      url: `/api/accounts/${walletAddress}/transactions`,
      params,
    });
  }

  async getAccountInfo(walletAddress: string): Promise<ApiResponse<{ accountId: string; balance: AccountBalance }>> {
    return this.request({
      method: 'GET',
      url: `/api/accounts/${walletAddress}/info`,
    });
  }

  async listCustodialAccounts(): Promise<ApiResponse<{ accounts: CustodialAccount[]; total: number }>> {
    return this.request({
      method: 'GET',
      url: '/api/accounts/debug/list',
    });
  }

  // Payment APIs
  async generatePaymentQR(data: PaymentRequest): Promise<ApiResponse<PaymentQR>> {
    return this.request({
      method: 'POST',
      url: '/api/payments/generate-qr',
      data,
    });
  }

  async processPayment(data: PaymentProcess): Promise<ApiResponse<{ transactionId: string; status: string; amount: number; tokenType: string; customerUserId: string; merchantUserId: string; timestamp: string }>> {
    return this.request({
      method: 'POST',
      url: '/api/payments/process',
      data,
    });
  }

  async getPaymentStatus(nonce: string): Promise<ApiResponse<PaymentStatus>> {
    return this.request({
      method: 'GET',
      url: `/api/payments/status/${nonce}`,
    });
  }

  async validatePaymentRequest(nonce: string): Promise<ApiResponse<PaymentValidation>> {
    return this.request({
      method: 'POST',
      url: '/api/payments/validate',
      data: { paymentData: nonce },
    });
  }

  async getMerchantPaymentRequests(merchantUserId: string, params?: { status?: string; limit?: number }): Promise<ApiResponse<{ payments: any[]; total: number }>> {
    return this.request({
      method: 'GET',
      url: '/api/payments/history',
      params: { merchantUserId, ...(params || {}) },
    });
  }

  // Withdrawal APIs
  async requestWithdrawal(data: WithdrawalRequest): Promise<ApiResponse<WithdrawalStatus>> {
    return this.request({
      method: 'POST',
      url: '/api/withdrawals/request',
      data,
    });
  }

  async getWithdrawalStatus(withdrawalId: string): Promise<ApiResponse<WithdrawalStatus>> {
    return this.request({
      method: 'GET',
      url: `/api/withdrawals/status/${withdrawalId}`,
    });
  }

  async getWithdrawalHistory(userId: string): Promise<ApiResponse<WithdrawalHistory>> {
    return this.request({
      method: 'GET',
      url: `/api/withdrawals/history/${userId}`,
    });
  }

  // YellowCard APIs
  async getCountries(): Promise<ApiResponse<{ countries: Country[] }>> {
    return this.request({
      method: 'GET',
      url: '/api/yellowcard/countries',
    });
  }

  async getPaymentMethods(countryCode: string): Promise<ApiResponse<{ countryCode: string; paymentMethods: PaymentMethod[] }>> {
    return this.request({
      method: 'GET',
      url: `/api/yellowcard/payment-methods/${countryCode}`,
    });
  }

  async purchaseCrypto(data: CryptoPurchase): Promise<ApiResponse<CryptoPurchaseResult>> {
    return this.request({
      method: 'POST',
      url: '/api/yellowcard/purchase',
      data,
    });
  }

  async getPurchaseHistory(userId: string, params?: { limit?: number }): Promise<ApiResponse<{ purchases: CryptoPurchaseResult[] }>> {
    return this.request({
      method: 'GET',
      url: `/api/yellowcard/history/${userId}`,
      params,
    });
  }

  // Invoice APIs
  async createInvoice(data: InvoiceCreate): Promise<ApiResponse<Invoice>> {
    return this.request({
      method: 'POST',
      url: '/api/invoices/create',
      data,
    });
  }

  async createTokenizedInvoice(data: TokenizedInvoiceCreate): Promise<ApiResponse<Invoice & { tokenIdFT?: string }>> {
    return this.request({
      method: 'POST',
      url: '/api/invoices/create-tokenized',
      data,
    });
  }

  async getInvoice(invoiceId: string): Promise<ApiResponse<Invoice>> {
    return this.request({
      method: 'GET',
      url: `/api/invoices/${invoiceId}`,
    });
  }

  async getMerchantInvoices(merchantId: string, params?: { limit?: number; status?: string }): Promise<ApiResponse<{ merchantId: string; invoices: Invoice[]; total: number; limit: number }>> {
    return this.request({
      method: 'GET',
      url: `/api/invoices/merchant/${merchantId}`,
      params,
    });
  }

  async getInvestmentOpportunities(params?: { limit?: number; minAmount?: number; maxAmount?: number }): Promise<ApiResponse<{ opportunities: InvestmentOpportunity[]; total: number; filters: any }>> {
    return this.request({
      method: 'GET',
      url: '/api/invoices/investments/opportunities',
      params,
    });
  }

  // Investment APIs
  async makeInvestment(data: Investment): Promise<ApiResponse<InvestmentResult>> {
    return this.request({
      method: 'POST',
      url: '/api/investments/invest',
      data,
    });
  }

  async getInvestmentPortfolio(userId: string): Promise<ApiResponse<{ portfolio: InvestmentPortfolio }>> {
    return this.request({
      method: 'GET',
      url: `/api/investments/portfolio/${userId}`,
    });
  }

  // Direct Deposit APIs
  async initiateDirectDeposit(data: DirectDepositRequest): Promise<ApiResponse<DirectDepositResult>> {
    return this.request({
      method: 'POST',
      url: '/api/direct-deposit/initiate',
      data,
    });
  }

  async getDepositStatus(depositId: string): Promise<ApiResponse<DirectDepositResult>> {
    return this.request({
      method: 'GET',
      url: `/api/direct-deposit/status/${depositId}`,
    });
  }

  async getDepositHistory(userId: string, params?: { limit?: number }): Promise<ApiResponse<DirectDepositHistory>> {
    return this.request({
      method: 'GET',
      url: `/api/direct-deposit/history/${userId}`,
      params,
    });
  }

  // Balance APIs v1
  async getAccountBalances(accountId: string): Promise<ApiResponse<AccountBalanceV1>> {
    return this.request({
      method: 'GET',
      url: `/api/v1/balances/${accountId}`,
    });
  }

  async getCustodialAccountBalances(userId: string): Promise<ApiResponse<AccountBalanceV1>> {
    return this.request({
      method: 'GET',
      url: `/api/v1/balances/custodial/${userId}`,
    });
  }

  async getTokenInfo(tokenId: string): Promise<ApiResponse<TokenInfo>> {
    return this.request({
      method: 'GET',
      url: `/api/v1/balances/token/${tokenId}/info`,
    });
  }

  async getTokensOverview(): Promise<ApiResponse<TokensOverview>> {
    return this.request({
      method: 'GET',
      url: '/api/v1/balances/tokens/overview',
    });
  }

  // Transaction APIs v1
  async getAccountTransactions(accountId: string, params?: PaginationParams): Promise<ApiResponse<TransactionHistory>> {
    return this.request({
      method: 'GET',
      url: `/api/v1/transactions/${accountId}`,
      params,
    });
  }

  async getCustodialAccountTransactions(userId: string, params?: PaginationParams): Promise<ApiResponse<TransactionHistory>> {
    return this.request({
      method: 'GET',
      url: `/api/v1/transactions/custodial/${userId}`,
      params,
    });
  }

  async getTransactionDetails(transactionId: string): Promise<ApiResponse<TransactionDetails>> {
    return this.request({
      method: 'GET',
      url: `/api/v1/transactions/details/${transactionId}`,
    });
  }

  async getPaymentTransactionHistory(params?: TransactionQueryParams): Promise<ApiResponse<PaymentTransactionHistory>> {
    return this.request({
      method: 'GET',
      url: '/api/v1/transactions/payments/history',
      params,
    });
  }

  async getTransactionStats(params?: StatsQueryParams): Promise<ApiResponse<TransactionStats>> {
    return this.request({
      method: 'GET',
      url: '/api/v1/transactions/stats/overview',
      params,
    });
  }

  // Health Check
  async getHealthStatus(): Promise<HealthStatus> {
    const response = await this.client.get<HealthStatus>('/health');
    return response.data;
  }

  // Utility methods
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size();
  }

  getBaseURL(): string {
    return API_CONFIG.baseURL;
  }

  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
