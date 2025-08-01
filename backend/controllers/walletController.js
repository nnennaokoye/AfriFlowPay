const walletConnectionService = require('../services/walletConnectionService');

class WalletController {
  /**
   * Connect wallet and determine role (customer vs merchant)
   */
  async connectWallet(req, res) {
    try {
      const { walletAddress } = req.body;

      // Validate wallet address format
      if (!walletAddress || !walletAddress.match(/^0\.0\.\d+$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet address format. Expected format: 0.0.123456'
        });
      }

      const result = walletConnectionService.connectWallet(walletAddress);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Error connecting wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to connect wallet',
        error: error.message
      });
    }
  }

  /**
   * Get session information
   */
  async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = walletConnectionService.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          walletAddress: session.walletAddress,
          role: session.role,
          connectedAt: session.connectedAt,
          lastActivity: session.lastActivity
        }
      });

    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session',
        error: error.message
      });
    }
  }

  /**
   * Validate session and role
   */
  async validateSession(req, res) {
    try {
      const { sessionId, requiredRole } = req.body;
      
      const validation = walletConnectionService.validateSession(sessionId, requiredRole);
      
      if (validation.valid) {
        res.json({
          success: true,
          data: {
            valid: true,
            session: validation.session
          }
        });
      } else {
        res.status(403).json({
          success: false,
          message: validation.message
        });
      }

    } catch (error) {
      console.error('Error validating session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate session',
        error: error.message
      });
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(req, res) {
    try {
      const { sessionId } = req.body;
      
      const result = walletConnectionService.disconnectWallet(sessionId);
      
      res.json(result);

    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect wallet',
        error: error.message
      });
    }
  }
}

module.exports = new WalletController();
