const crypto = require('crypto');

class WalletConnectionService {
  constructor() {
    // In-memory storage for sessions and wallet roles
    this.sessionStore = new Map();
    this.qrStore = new Map();
    
    // Pre-defined merchant wallets (as per user story)
    // In production, this could be loaded from a config file
    this.merchantWallets = new Set([
      '0.0.789012',  // Mama's Shop example from user story
      '0.0.456789',  // Additional merchant for testing
    ]);
  }

  /**
   * Connect wallet and determine role
   * @param {string} walletAddress - Hedera wallet address (e.g., 0.0.123456)
   * @returns {Object} Session info with role
   */
  connectWallet(walletAddress) {
    try {
      // Generate session ID
      const sessionId = crypto.randomBytes(16).toString('hex');
      
      // Determine role based on wallet address
      const role = this.merchantWallets.has(walletAddress) ? 'merchant' : 'customer';
      
      // Create session
      const sessionData = {
        walletAddress,
        role,
        sessionId,
        connectedAt: new Date(),
        lastActivity: new Date()
      };
      
      // Store session
      this.sessionStore.set(sessionId, sessionData);
      this.sessionStore.set(walletAddress, sessionData); // Also store by wallet for quick lookup
      
      console.log(`Wallet connected: ${walletAddress} as ${role}`);
      
      return {
        success: true,
        data: {
          sessionId,
          walletAddress,
          role,
          message: `Wallet connected! Address: ${walletAddress}. Role: ${role}`
        }
      };
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return {
        success: false,
        message: 'Failed to connect wallet',
        error: error.message
      };
    }
  }

  /**
   * Get session by session ID or wallet address
   */
  getSession(identifier) {
    return this.sessionStore.get(identifier);
  }

  /**
   * Validate session and check role
   */
  validateSession(sessionId, requiredRole = null) {
    const session = this.sessionStore.get(sessionId);
    
    if (!session) {
      return { valid: false, message: 'Invalid session' };
    }
    
    // Update last activity
    session.lastActivity = new Date();
    
    if (requiredRole && session.role !== requiredRole) {
      return { 
        valid: false, 
        message: `Access denied: ${requiredRole} role required` 
      };
    }
    
    return { valid: true, session };
  }

  /**
   * Add merchant wallet to the list
   */
  addMerchantWallet(walletAddress) {
    this.merchantWallets.add(walletAddress);
    console.log(`Added merchant wallet: ${walletAddress}`);
  }

  /**
   * Check if wallet is merchant
   */
  isMerchantWallet(walletAddress) {
    return this.merchantWallets.has(walletAddress);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    const sessions = [];
    for (const [key, value] of this.sessionStore.entries()) {
      if (typeof key === 'string' && key.length === 32) { // Session IDs are 32 chars
        sessions.push(value);
      }
    }
    return sessions;
  }

  /**
   * Disconnect wallet/session
   */
  disconnectWallet(sessionId) {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      this.sessionStore.delete(sessionId);
      this.sessionStore.delete(session.walletAddress);
      return { success: true, message: 'Wallet disconnected' };
    }
    return { success: false, message: 'Session not found' };
  }

  /**
   * Store QR payment data with nonce
   */
  storeQRPayload(merchantWallet, amount = null, tokenType = 'HBAR') {
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = {
      merchantWallet,
      amount,
      tokenType,
      nonce,
      createdAt: new Date()
    };
    
    console.log('Storing QR payload with nonce:', nonce);
    this.qrStore.set(nonce, payload);
    console.log('QR Store size after storing:', this.qrStore.size);
    return { nonce, payload };
  }

  /**
   * Get QR payload by nonce
   */
  getQRPayload(nonce) {
    console.log('Looking for QR payload with nonce:', nonce);
    console.log('QR Store size:', this.qrStore.size);
    console.log('QR Store keys:', Array.from(this.qrStore.keys()));
    const payload = this.qrStore.get(nonce);
    console.log('Found payload:', !!payload);
    return payload;
  }

  /**
   * Clear expired sessions and QR codes (cleanup)
   */
  cleanup() {
    const now = new Date();
    const sessionTimeout = 60 * 60 * 1000; // 1 hour
    const qrTimeout = 15 * 60 * 1000; // 15 minutes
    
    // Clean expired sessions
    for (const [key, session] of this.sessionStore.entries()) {
      if (now - session.lastActivity > sessionTimeout) {
        this.sessionStore.delete(key);
        if (session.walletAddress) {
          this.sessionStore.delete(session.walletAddress);
        }
      }
    }
    
    // Clean expired QR codes
    for (const [nonce, payload] of this.qrStore.entries()) {
      if (now - payload.createdAt > qrTimeout) {
        this.qrStore.delete(nonce);
      }
    }
  }
}

module.exports = new WalletConnectionService();
