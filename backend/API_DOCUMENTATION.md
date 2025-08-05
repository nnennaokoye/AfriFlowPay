# AfriPayFlow Backend API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, the API does not require authentication tokens. All endpoints are accessible for testing purposes.

---

## Account Management Endpoints

### 1. Create Custodial Account
**POST** `/accounts/create`

**Request Body:**
```json
{
  "userId": "string (optional)"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "userId": "user_1234567890",
    "accountId": "0.0.123456",
    "publicKey": "302a300506032b657003210000...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "initialBalance": "1 HBAR",
    "network": "Hedera Testnet"
  },
  "message": "Custodial account created successfully"
}
```

### 2. List All Custodial Accounts (Debug)
**GET** `/accounts/debug/list`

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "user_123": {
      "userId": "user_123",
      "accountId": "0.0.123456",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "count": 1,
  "network": "Hedera Testnet"
}
```

### 3. Get Custodial Account Balance
**GET** `/accounts/custodial/:userId/balance`

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "accountId": "0.0.123456",
    "balance": {
      "hbar": "1.0 ℏ",
      "tokens": {}
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Get Custodial Account Transaction History
**GET** `/accounts/custodial/:userId/transactions`

**Query Parameters:**
- `limit`: Number of transactions (default: 50)
- `order`: Order - 'asc' or 'desc' (default: 'desc')

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "accountId": "0.0.123456",
    "transactions": [
      {
        "transactionId": "0.0.123456@1234567890.123456789",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "type": "CRYPTOTRANSFER",
        "amount": "1.0",
        "currency": "HBAR"
      }
    ],
    "pagination": {
      "limit": 50,
      "order": "desc",
      "count": 1
    }
  }
}
```

### 5. Get Account Balance by Wallet Address
**GET** `/accounts/:walletAddress/balance`

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "walletAddress": "0.0.123456",
    "balance": {
      "hbar": "1.0 ℏ",
      "tokens": {}
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "network": "Hedera Testnet"
  }
}
```

---

## Payment Processing Endpoints

### 6. Generate QR Code for Payment
**POST** `/payments/generate-qr`

**Request Body:**
```json
{
  "merchantId": "merchant_123",
  "amount": 10.5,
  "currency": "HBAR",
  "description": "Payment for services"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "paymentLink": "https://afriPayFlow.com/pay?nonce=abc123",
    "nonce": "abc123",
    "expiresAt": "2024-01-01T01:00:00.000Z"
  }
}
```

### 7. Process Payment Transaction
**POST** `/payments/process`

**Request Body:**
```json
{
  "nonce": "abc123",
  "payerUserId": "user_456",
  "transactionId": "0.0.123456@1234567890.123456789"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "transactionId": "0.0.123456@1234567890.123456789",
    "status": "completed",
    "amount": 10.5,
    "currency": "HBAR",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 8. Get Payment Status
**GET** `/payments/status/:nonce`

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "nonce": "abc123",
    "status": "pending",
    "amount": 10.5,
    "currency": "HBAR",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Direct Deposit Endpoints

### 9. Initiate Direct Deposit
**POST** `/direct-deposit/initiate`

**Request Body:**
```json
{
  "userId": "user_123",
  "amount": 100.0,
  "tokenType": "HBAR",
  "bankDetails": {
    "accountNumber": "1234567890",
    "routingNumber": "123456789",
    "bankName": "Test Bank"
  }
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "depositId": "dep_abc123",
    "status": "pending",
    "amount": 100.0,
    "tokenType": "HBAR",
    "estimatedCompletion": "2024-01-02T00:00:00.000Z",
    "message": "Direct deposit initiated successfully"
  }
}
```

### 10. Get Deposit Status
**GET** `/direct-deposit/status/:depositId`

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "userId": "user_123",
    "amount": 100.0,
    "tokenType": "HBAR",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## YellowCard Integration Endpoints

### 11. Get Supported Countries
**GET** `/yellowcard/countries`

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "countries": [
      {
        "code": "NG",
        "name": "Nigeria",
        "currency": "NGN",
        "supported": true
      }
    ]
  }
}
```

### 12. Purchase Crypto
**POST** `/yellowcard/purchase`

**Request Body:**
```json
{
  "userId": "user_123",
  "amount": 50000,
  "currency": "NGN",
  "cryptoType": "HBAR",
  "paymentMethod": "bank_transfer"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "purchaseId": "yc_abc123",
    "status": "pending",
    "amount": 50000,
    "currency": "NGN",
    "cryptoAmount": 150.5,
    "cryptoType": "HBAR",
    "exchangeRate": 332.11,
    "paymentMethod": "bank_transfer"
  }
}
```

---

## Investment Endpoints

### 13. Create Investment Opportunity
**POST** `/investments/opportunities/create`

**Request Body:**
```json
{
  "invoiceId": "inv_abc123",
  "investmentPercentage": 75,
  "minimumInvestment": 10
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "opportunityId": "opp_abc123",
    "invoiceId": "inv_abc123",
    "investmentPercentage": 75,
    "minimumInvestment": 10,
    "totalInvestmentNeeded": 750.0,
    "status": "active"
  }
}
```

### 14. Process Investment
**POST** `/investments/invest`

**Request Body:**
```json
{
  "opportunityId": "opp_abc123",
  "investorUserId": "user_456",
  "investmentAmount": 100.0
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "investmentId": "inv_xyz789",
    "opportunityId": "opp_abc123",
    "investorUserId": "user_456",
    "amount": 100.0,
    "status": "completed"
  }
}
```

---

## Invoice Management Endpoints

### 15. Create and Tokenize Invoice
**POST** `/invoices/create`

**Request Body:**
```json
{
  "merchantId": "merchant_123",
  "amount": 1000.0,
  "currency": "USD",
  "description": "Consulting services",
  "dueDate": "2024-02-01T00:00:00.000Z"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "invoiceId": "inv_abc123",
    "tokenId": "0.0.789012",
    "merchantId": "merchant_123",
    "amount": 1000.0,
    "currency": "USD",
    "status": "active",
    "blockchain": {
      "network": "Hedera Testnet",
      "tokenSymbol": "INV123",
      "transactionId": "0.0.123456@1234567890.123456789"
    }
  }
}
```

---

## Balance Query Endpoints

### 16. Get Account Balances
**GET** `/balances/:accountId`

**Query Parameters:**
- `includeTokenInfo`: Include detailed token info (default: false)

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "accountId": "0.0.123456",
    "hbar": {
      "balance": "1.0",
      "formatted": "1.0 ℏ"
    },
    "tokens": {},
    "totalTokenTypes": 0,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Transaction History Endpoints

### 17. Get Account Transaction History
**GET** `/transactions/:accountId`

**Query Parameters:**
- `limit`: Number of transactions (default: 50)
- `order`: Order - 'asc' or 'desc' (default: 'desc')

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "transactionId": "0.0.123456@1234567890.123456789",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "type": "CRYPTOTRANSFER",
      "amount": "1.0",
      "currency": "HBAR"
    }
  ]
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "errorCode": "ERROR_CODE (when applicable)"
}
```

## Common HTTP Status Codes

- **200**: Success
- **400**: Bad Request (validation errors)
- **404**: Not Found (resource doesn't exist)
- **500**: Internal Server Error

## Notes

1. All timestamps are in ISO 8601 format
2. All amounts are numeric values (not strings unless specified)
3. Account IDs follow Hedera format: 0.0.123456
4. Transaction IDs follow Hedera format: 0.0.123456@1234567890.123456789
5. The API is designed for testing purposes with in-memory storage
6. Private keys are never returned in API responses for security
