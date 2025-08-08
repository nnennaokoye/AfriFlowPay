# AfriPayFlow Backend API Documentation

## Base URL
`http://localhost:3001`

## Authentication
Currently no authentication required (custodial account system)

## Rate Limiting
- Account Creation: 5 requests per 15 minutes
- Payments: 30 requests per minute
- Balance Queries: 50 requests per minute
- Withdrawals: 5 requests per 10 minutes
- General: 100 requests per 15 minutes

---

## Account Management APIs

### 1. Create Custodial Account
**POST** `/api/accounts/create`

**Request Body:**
```json
{
  "userId": "string (optional)" 
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custodial account created successfully",
  "data": {
    "userId": "user_1234567890",
    "accountId": "0.0.123456",
    "createdAt": "2025-01-05T14:20:00.000Z",
    "initialBalance": "1 HBAR",
    "network": "Hedera Testnet"
  }
}
```

### 2. Get Custodial Account Balance
**GET** `/api/accounts/custodial/:userId/balance`

**Response:**
```json
{
  "success": true,
  "message": "Balance retrieved successfully",
  "data": {
    "userId": "user_1234567890",
    "accountId": "0.0.123456",
    "balances": {
      "hbar": 10.5,
      "tokens": []
    },
    "timestamp": "2025-01-05T14:20:00.000Z"
  }
}
```

### 3. Get Custodial Account Transactions
**GET** `/api/accounts/custodial/:userId/transactions`

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 10)
- `order` (optional): "asc" or "desc" (default: "desc")

**Response:**
```json
{
  "success": true,
  "message": "Transaction history retrieved",
  "data": {
    "userId": "user_1234567890",
    "accountId": "0.0.123456",
    "transactions": [],
    "count": 0,
    "limit": 10
  }
}
```

### 4. Get Wallet Balance (Decentralized)
**GET** `/api/accounts/:walletAddress/balance`

**Response:**
```json
{
  "success": true,
  "message": "Balance retrieved successfully",
  "data": {
    "accountId": "0.0.123456",
    "balances": {
      "hbar": 10.5,
      "tokens": []
    }
  }
}
```

### 5. Get Wallet Transactions (Decentralized)
**GET** `/api/accounts/:walletAddress/transactions`

**Query Parameters:**
- `limit` (optional): Number of transactions (default: 10)
- `order` (optional): "asc" or "desc" (default: "desc")

**Response:**
```json
{
  "success": true,
  "message": "Transaction history retrieved",
  "data": {
    "accountId": "0.0.123456",
    "transactions": [],
    "count": 0
  }
}
```

### 6. Get Account Info
**GET** `/api/accounts/:walletAddress/info`

**Response:**
```json
{
  "success": true,
  "message": "Account info retrieved successfully",
  "data": {
    "accountId": "0.0.123456",
    "balance": {
      "hbar": 10.5,
      "tokens": []
    }
  }
}
```

### 7. Debug: List All Custodial Accounts
**GET** `/api/accounts/debug/list`

**Response:**
```json
{
  "success": true,
  "message": "Custodial accounts retrieved",
  "data": {
    "accounts": [],
    "total": 0
  }
}
```

---

## Payment APIs

### 1. Generate Payment QR Code
**POST** `/api/payments/generate-qr`

**Request Body:**
```json
{
  "merchantUserId": "merchant_123",
  "amount": 10.5,
  "tokenType": "HBAR", // Optional, defaults to "HBAR"
  "description": "Payment for services" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "nonce": "abc123def456...",
    "qrData": "afriPayFlow://pay?nonce=abc123def456...",
    "amount": 10.5,
    "tokenType": "HBAR",
    "merchantUserId": "merchant_123",
    "expiresAt": "2025-01-05T14:25:00.000Z"
  }
}
```

### 2. Process Payment
**POST** `/api/payments/process`

**Request Body:**
```json
{
  "nonce": "abc123def456...",
  "customerUserId": "customer_123",
  "amount": 10.5 // Optional, uses QR amount if not provided
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionId": "tx-1234567890-abc123",
    "status": "completed",
    "amount": 10.5,
    "tokenType": "HBAR",
    "customerUserId": "customer_123",
    "merchantUserId": "merchant_123",
    "timestamp": "2025-01-05T14:20:00.000Z"
  }
}
```

### 3. Get Payment Status
**GET** `/api/payments/status/:nonce`

**Response:**
```json
{
  "success": true,
  "message": "Payment status retrieved",
  "data": {
    "status": "completed", // or "pending_payment", "failed"
    "nonce": "abc123def456...",
    "transactionId": "tx-1234567890-abc123",
    "amount": 10.5,
    "tokenType": "HBAR",
    "timestamp": "2025-01-05T14:20:00.000Z"
  }
}
```

### 4. Validate Payment Request
**POST** `/api/payments/validate`

**Request Body:**
```json
{
  "nonce": "abc123def456..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment request is valid",
  "data": {
    "valid": true,
    "nonce": "abc123def456...",
    "merchantUserId": "merchant_123",
    "amount": 10.5,
    "tokenType": "HBAR"
  }
}
```

---

## Withdrawal APIs

### 1. Request Withdrawal
**POST** `/api/withdrawals/request`

**Request Body:**
```json
{
  "userId": "user_123",
  "amount": 5.0,
  "token": "HBAR", // Optional, defaults to "HBAR"
  "destinationAddress": "0.0.654321"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal requested",
  "data": {
    "withdrawalId": "abc123def456...",
    "status": "pending",
    "amount": 5.0,
    "token": "HBAR",
    "destinationAddress": "0.0.654321",
    "message": "Withdrawal requested successfully"
  }
}
```

### 2. Get Withdrawal Status
**GET** `/api/withdrawals/status/:withdrawalId`

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal status retrieved",
  "data": {
    "withdrawalId": "abc123def456...",
    "status": "completed", // or "pending", "failed"
    "amount": 5.0,
    "token": "HBAR",
    "destinationAddress": "0.0.654321",
    "requestedAt": "2025-01-05T14:20:00.000Z",
    "completedAt": "2025-01-05T14:21:00.000Z"
  }
}
```

### 3. Get Withdrawal History
**GET** `/api/withdrawals/history/:userId`

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal history retrieved",
  "data": {
    "userId": "user_123",
    "withdrawals": [
      {
        "withdrawalId": "abc123def456...",
        "amount": 5.0,
        "token": "HBAR",
        "destinationAddress": "0.0.654321",
        "status": "completed",
        "requestedAt": "2025-01-05T14:20:00.000Z",
        "completedAt": "2025-01-05T14:21:00.000Z"
      }
    ],
    "total": 1
  }
}
```

---

## YellowCard Integration APIs

### 1. Get Supported Countries
**GET** `/api/yellowcard/countries`

**Response:**
```json
{
  "success": true,
  "message": "Countries retrieved successfully",
  "data": {
    "countries": [
      {
        "code": "NG",
        "name": "Nigeria",
        "currency": "NGN",
        "supported": true
      },
      {
        "code": "KE",
        "name": "Kenya",
        "currency": "KES",
        "supported": true
      }
    ]
  }
}
```

### 2. Get Payment Methods
**GET** `/api/yellowcard/payment-methods/:countryCode`

**Response:**
```json
{
  "success": true,
  "message": "Payment methods retrieved successfully",
  "data": {
    "countryCode": "NG",
    "paymentMethods": [
      {
        "id": "bank_transfer",
        "name": "Bank Transfer",
        "description": "Direct bank transfer",
        "processingTime": "5-10 minutes",
        "fees": "1.5%"
      },
      {
        "id": "mobile_money",
        "name": "Mobile Money",
        "description": "Mobile money transfer",
        "processingTime": "Instant",
        "fees": "2%"
      }
    ]
  }
}
```

### 3. Purchase Crypto
**POST** `/api/yellowcard/purchase`

**Request Body:**
```json
{
  "userId": "user_123",
  "countryCode": "NG",
  "paymentMethod": "bank_transfer",
  "fiatAmount": 100,
  "cryptoToken": "HBAR"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Crypto purchase initiated successfully",
  "data": {
    "purchaseId": "yc_purchase_123",
    "userId": "user_123",
    "status": "completed",
    "fiatAmount": 100,
    "fiatCurrency": "NGN",
    "cryptoAmount": 250,
    "cryptoToken": "HBAR",
    "exchangeRate": 2.5,
    "fees": {
      "yellowCard": 2,
      "network": 0.001
    },
    "timestamp": "2025-01-05T14:20:00.000Z"
  }
}
```

### 4. Get Purchase History
**GET** `/api/yellowcard/history/:userId`

**Query Parameters:**
- `limit` (optional): Number of records (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Purchase history retrieved successfully",
  "data": {
    "purchases": [],
    "message": "Purchase history retrieved successfully"
  }
}
```

---

## Invoice APIs

### 1. Create and Tokenize Invoice
**POST** `/api/invoices/create`

**Request Body:**
```json
{
  "merchantUserId": "merchant_123",
  "amount": 100,
  "currency": "USD",
  "description": "Invoice for services",
  "dueDate": "2025-02-01",
  "customerInfo": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice created and tokenized successfully",
  "data": {
    "invoiceId": "inv_123",
    "tokenId": "0.0.789012",
    "amount": 100,
    "currency": "USD",
    "status": "pending",
    "merchantInfo": {
      "userId": "merchant_123",
      "accountId": "0.0.123456"
    },
    "tokenInfo": {
      "tokenId": "0.0.789012",
      "name": "AfriPayFlow Invoice #inv_123",
      "symbol": "APFI",
      "totalSupply": 1,
      "metadata": "Invoice tokenized on Hedera"
    },
    "createdAt": "2025-01-05T14:20:00.000Z"
  }
}
```

### 2. Get Invoice Details
**GET** `/api/invoices/:invoiceId`

**Response:**
```json
{
  "success": true,
  "message": "Invoice retrieved successfully",
  "data": {
    "invoiceId": "inv_123",
    "tokenId": "0.0.789012",
    "amount": 100,
    "currency": "USD",
    "status": "pending",
    "description": "Invoice for services",
    "dueDate": "2025-02-01",
    "createdAt": "2025-01-05T14:20:00.000Z"
  }
}
```

### 3. Get Merchant Invoices
**GET** `/api/invoices/merchant/:merchantId`

**Query Parameters:**
- `limit` (optional): Number of invoices (default: 10)
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "message": "Merchant invoices retrieved successfully",
  "data": {
    "merchantId": "merchant_123",
    "invoices": [],
    "total": 0,
    "limit": 10
  }
}
```

### 4. Get Investment Opportunities
**GET** `/api/invoices/investments/opportunities`

**Query Parameters:**
- `limit` (optional): Number of opportunities (default: 10)
- `minAmount` (optional): Minimum investment amount
- `maxAmount` (optional): Maximum investment amount

**Response:**
```json
{
  "success": true,
  "message": "Investment opportunities retrieved successfully",
  "data": {
    "opportunities": [],
    "total": 0,
    "filters": {
      "limit": 10
    }
  }
}
```

---

## Direct Deposit APIs

### 1. Initiate Direct Deposit
**POST** `/api/direct-deposit/initiate`

**Request Body:**
```json
{
  "userId": "user_123",
  "amount": 50,
  "tokenType": "HBAR", // Optional, defaults to "HBAR"
  "bankDetails": {
    "accountNumber": "1234567890",
    "routingNumber": "123456789",
    "bankName": "Example Bank"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Direct deposit initiated successfully",
  "data": {
    "depositId": "dd_123456",
    "userId": "user_123",
    "amount": 50,
    "tokenType": "HBAR",
    "status": "pending",
    "estimatedCompletion": "2025-01-06T14:20:00.000Z",
    "bankDetails": {
      "accountNumber": "****7890",
      "bankName": "Example Bank"
    },
    "initiatedAt": "2025-01-05T14:20:00.000Z"
  }
}
```

### 2. Get Deposit Status
**GET** `/api/direct-deposit/status/:depositId`

**Response:**
```json
{
  "success": true,
  "message": "Deposit status retrieved successfully",
  "data": {
    "depositId": "dd_123456",
    "status": "completed", // or "pending", "failed"
    "amount": 50,
    "tokenType": "HBAR",
    "initiatedAt": "2025-01-05T14:20:00.000Z",
    "completedAt": "2025-01-06T14:20:00.000Z"
  }
}
```

### 3. Get Deposit History
**GET** `/api/direct-deposit/history/:userId`

**Query Parameters:**
- `limit` (optional): Number of records (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Deposit history retrieved successfully",
  "data": {
    "userId": "user_123",
    "deposits": [],
    "total": 0,
    "limit": 10
  }
}
```

---

## Investment APIs

### 1. Make Investment
**POST** `/api/investments/invest`

**Request Body:**
```json
{
  "investorUserId": "investor_123",
  "invoiceId": "inv_123",
  "investmentAmount": 25
}
```

**Response:**
```json
{
  "success": true,
  "message": "Investment completed successfully",
  "data": {
    "investmentId": "investment_123",
    "investorUserId": "investor_123",
    "invoiceId": "inv_123",
    "amount": 25,
    "status": "completed",
    "expectedReturn": 27.5,
    "returnRate": 0.1,
    "maturityDate": "2025-04-05T14:20:00.000Z",
    "createdAt": "2025-01-05T14:20:00.000Z"
  }
}
```

### 2. Get Investment Portfolio
**GET** `/api/investments/portfolio/:userId`

**Response:**
```json
{
  "success": true,
  "message": "Investment portfolio retrieved successfully",
  "data": {
    "portfolio": {
      "userId": "investor_123",
      "accountId": "0.0.123456",
      "totalInvested": 0,
      "totalValue": 0,
      "totalReturns": 0,
      "investments": [],
      "summary": {
        "activeInvestments": 0,
        "completedInvestments": 0,
        "averageReturn": 0
      }
    }
  }
}
```

---

## Balance APIs (v1)

### 1. Get Account Balances
**GET** `/api/v1/balances/:accountId`

**Response:**
```json
{
  "success": true,
  "message": "Account balances retrieved successfully",
  "data": {
    "accountId": "0.0.123456",
    "balances": {
      "hbar": 10.5,
      "tokens": []
    },
    "timestamp": "2025-01-05T14:20:00.000Z"
  }
}
```

### 2. Get Custodial Account Balances
**GET** `/api/v1/balances/custodial/:userId`

**Response:**
```json
{
  "success": true,
  "message": "Custodial account balances retrieved successfully",
  "data": {
    "userId": "user_123",
    "accountId": "0.0.123456",
    "balances": {
      "hbar": 10.5,
      "tokens": []
    },
    "timestamp": "2025-01-05T14:20:00.000Z"
  }
}
```

### 3. Get Token Info
**GET** `/api/v1/balances/token/:tokenId/info`

**Response:**
```json
{
  "success": true,
  "message": "Token info retrieved successfully",
  "data": {
    "tokenId": "0.0.789012",
    "name": "USD Coin",
    "symbol": "USDC",
    "decimals": 6,
    "totalSupply": 1000000,
    "treasuryAccountId": "0.0.123456"
  }
}
```

### 4. Get Tokens Overview
**GET** `/api/v1/balances/tokens/overview`

**Response:**
```json
{
  "success": true,
  "message": "Tokens overview retrieved successfully",
  "data": {
    "tokens": {
      "USDC": {
        "tokenId": "0.0.789012",
        "name": "USD Coin",
        "symbol": "USDC",
        "status": "active"
      },
      "USDT": {
        "tokenId": "0.0.789013",
        "name": "Tether USD",
        "symbol": "USDT",
        "status": "active"
      }
    },
    "totalTokens": 2
  }
}
```

---

## Transaction APIs (v1)

### 1. Get Account Transactions
**GET** `/api/v1/transactions/:accountId`

**Query Parameters:**
- `limit` (optional): Number of transactions (default: 10)
- `order` (optional): "asc" or "desc" (default: "desc")

**Response:**
```json
{
  "success": true,
  "message": "Account transactions retrieved successfully",
  "data": {
    "accountId": "0.0.123456",
    "transactions": [],
    "count": 0,
    "limit": 10
  }
}
```

### 2. Get Custodial Account Transactions
**GET** `/api/v1/transactions/custodial/:userId`

**Query Parameters:**
- `limit` (optional): Number of transactions (default: 10)
- `order` (optional): "asc" or "desc" (default: "desc")

**Response:**
```json
{
  "success": true,
  "message": "Custodial account transactions retrieved successfully",
  "data": {
    "userId": "user_123",
    "accountId": "0.0.123456",
    "transactions": [],
    "count": 0,
    "limit": 10
  }
}
```

### 3. Get Transaction Details
**GET** `/api/v1/transactions/details/:transactionId`

**Response:**
```json
{
  "success": true,
  "message": "Transaction details retrieved successfully",
  "data": {
    "transactionId": "0.0.123456@1641234567.123456789",
    "type": "CRYPTOTRANSFER",
    "status": "SUCCESS",
    "timestamp": "2025-01-05T14:20:00.000Z",
    "transfers": []
  }
}
```

### 4. Get Payment System Transactions
**GET** `/api/v1/transactions/payments/history`

**Query Parameters:**
- `limit` (optional): Number of transactions (default: 10)
- `status` (optional): Filter by status
- `fromDate` (optional): Start date filter
- `toDate` (optional): End date filter

**Response:**
```json
{
  "success": true,
  "message": "Payment transactions retrieved successfully",
  "data": {
    "transactions": [],
    "summary": {
      "total": 0,
      "completed": 0,
      "pending": 0,
      "failed": 0
    },
    "filters": {
      "limit": 10
    }
  }
}
```

### 5. Get Transaction Statistics
**GET** `/api/v1/transactions/stats/overview`

**Query Parameters:**
- `accountId` (optional): Filter by account
- `userId` (optional): Filter by user
- `period` (optional): Time period (default: "24h")

**Response:**
```json
{
  "success": true,
  "message": "Transaction statistics retrieved successfully",
  "data": {
    "period": "24h",
    "stats": {
      "totalTransactions": 0,
      "totalVolume": 0,
      "averageAmount": 0,
      "successRate": 100
    },
    "timestamp": "2025-01-05T14:20:00.000Z"
  }
}
```

---

## Health Check

### Health Status
**GET** `/health`

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-05T14:20:00.000Z",
  "environment": "development",
  "project": "AfriPayFlow",
  "features": {
    "hederaIntegration": true,
    "custodialAccounts": true,
    "tokenSupport": true,
    "balanceAPI": true,
    "transactionAPI": true
  }
}
```

---

## Error Responses

All APIs return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "timestamp": "2025-01-05T14:20:00.000Z"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Notes

1. **Custodial vs Decentralized**: The system supports both custodial accounts (using `userId`) and direct wallet interactions (using `walletAddress`).

2. **Rate Limiting**: Different endpoints have different rate limits based on their criticality.

3. **Token Support**: Currently supports HBAR, USDC, and USDT tokens.

4. **Mock Implementations**: Some services (like YellowCard integration) are mock implementations for demo purposes.

5. **Hedera Integration**: All blockchain operations use Hedera Testnet.
