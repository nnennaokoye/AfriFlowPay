import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  DollarSign,
  QrCode,
  ExternalLink,
  Share2,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Download,
  Coins,
  Timer,
  Loader
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { apiClient } from '../services/apiClient';
import { useSession } from '../contexts/SessionContext';
import { PaymentQR } from '../types/api';

interface CreatePaymentRequestProps {
  onBack: () => void;
  onPaymentCreated?: (paymentData: PaymentQR) => void;
}

const CreatePaymentRequest: React.FC<CreatePaymentRequestProps> = ({ onBack, onPaymentCreated }) => {
  const { user } = useSession();
  const [step, setStep] = useState<'form' | 'qr'>('form');
  
  // Form state
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState('HBAR');
  const [description, setDescription] = useState('');
  const [expirationHours, setExpirationHours] = useState('24');
  
  // QR state
  const [qrData, setQrData] = useState<PaymentQR | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'qr' | 'link' | null>(null);

  // Available tokens
  const availableTokens = [
    { value: 'HBAR', label: 'HBAR', description: 'Hedera Native Token' },
    { value: 'USDC', label: 'USDC', description: 'USD Coin' },
    { value: 'USDT', label: 'USDT', description: 'Tether USD' },
  ];

  const generateQR = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(expirationHours));

      const response = await apiClient.generatePaymentQR({
        merchantId: user.userId,
        amount: amount ? parseFloat(amount) : undefined,
        tokenType,
        description: description || undefined,
      });

      if (response.success && response.data) {
        setQrData(response.data);
        setStep('qr');
        
        if (onPaymentCreated) {
          onPaymentCreated(response.data);
        }
      } else {
        setError(response.message || 'Failed to generate payment request');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate payment request');
    } finally {
      setIsGenerating(false);
    }
  }, [user, amount, tokenType, description, expirationHours, onPaymentCreated]);

  const copyToClipboard = useCallback(async (text: string, type: 'qr' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  }, []);

  const downloadQRCode = useCallback(async () => {
    if (!qrData) return;

    try {
      // Debug: Log all available elements
      console.log('🔍 Looking for QR code element...');
      console.log('All SVG elements:', document.querySelectorAll('svg'));
      console.log('Elements with qr in id:', document.querySelectorAll('[id*="qr"]'));
      console.log('Payment QR container:', document.querySelector('#payment-qr-code'));
      
      // Try different approaches to find the SVG
      let svgElement: SVGElement | null = null;
      
      // Method 1: Direct SVG child
      svgElement = document.querySelector('#payment-qr-code svg') as SVGElement;
      if (svgElement) console.log(' Found via #payment-qr-code svg');
      
      // Method 2: Container itself if it's SVG
      if (!svgElement) {
        const container = document.querySelector('#payment-qr-code');
        if (container && container.tagName === 'svg') {
          svgElement = container as SVGElement;
          console.log(' Found container as SVG');
        }
      }
      
      // Method 3: Any SVG in the QR container
      if (!svgElement) {
        const container = document.querySelector('#payment-qr-code');
        if (container) {
          svgElement = container.querySelector('svg') as SVGElement;
          if (svgElement) console.log(' Found SVG inside container');
        }
      }
      
      // Method 4: First SVG on page (fallback)
      if (!svgElement) {
        svgElement = document.querySelector('svg') as SVGElement;
        if (svgElement) console.log(' Using first SVG as fallback');
      }
      
      if (!svgElement) {
        console.error(' No SVG element found for download');
        alert('Could not find QR code to download. Please try again.');
        return;
      }

      // Create canvas with higher resolution
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }

      // Set canvas size
      const size = 512;
      canvas.width = size;
      canvas.height = size;

      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);

      // Convert SVG to image
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Draw the image on canvas
        ctx.drawImage(img, 0, 0, size, size);
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `afripayflow-payment-${qrData.nonce.slice(0, 8)}.png`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            console.log('QR code downloaded successfully');
          }
        }, 'image/png', 1.0);
        
        URL.revokeObjectURL(url);
      };
      
      img.onerror = (error) => {
        console.error('Failed to load SVG image:', error);
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  }, [qrData]);

  const sharePayment = useCallback(async () => {
    if (!qrData) return;

    const paymentLink = (qrData as any).paymentLink || `${window.location.origin}/pay?nonce=${qrData.nonce}`;
    const shareText = `Payment Request\n\nAmount: ${qrData.amount || 'Custom amount'} ${qrData.tokenType}\n${(qrData as any).description ? `Description: ${(qrData as any).description}\n` : ''}\nLink: ${paymentLink}`;
    
    // Function to create QR code blob
    const createQRBlob = (): Promise<Blob | null> => {
      return new Promise((resolve) => {
        try {
          // Use same robust SVG finding logic as download
          let svgElement: SVGElement | null = null;
          
          // Try different methods to find SVG
          svgElement = document.querySelector('#payment-qr-code svg') as SVGElement;
          if (!svgElement) {
            const container = document.querySelector('#payment-qr-code');
            if (container && container.tagName === 'svg') {
              svgElement = container as SVGElement;
            } else if (container) {
              svgElement = container.querySelector('svg') as SVGElement;
            }
          }
          if (!svgElement) {
            svgElement = document.querySelector('svg') as SVGElement;
          }
          
          if (!svgElement) {
            console.error(' QR code SVG not found for sharing');
            resolve(null);
            return;
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          const size = 512;
          canvas.width = size;
          canvas.height = size;
          
          // White background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, size, size);

          const svgData = new XMLSerializer().serializeToString(svgElement);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            ctx.drawImage(img, 0, 0, size, size);
            canvas.toBlob((blob) => {
              URL.revokeObjectURL(url);
              resolve(blob);
            }, 'image/png', 1.0);
          };
          
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          
          img.src = url;
        } catch (error) {
          console.error('Error creating QR blob:', error);
          resolve(null);
        }
      });
    };
    
    console.log('🚀 Starting share process...');
    console.log('Navigator.share available:', !!navigator.share);
    console.log('Navigator.canShare available:', !!navigator.canShare);
    
    if (navigator.share) {
      try {
        // Always try to create QR blob first
        const qrBlob = await createQRBlob();
        
        if (qrBlob) {
          // Check if file sharing is supported
          const file = new File([qrBlob], `afripayflow-payment-${qrData.nonce.slice(0, 8)}.png`, { type: 'image/png' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: 'AfriPayFlow Payment Request',
                text: shareText,
                files: [file]
              });
              console.log(' Successfully shared QR code + text');
              return; // 
            } catch (shareError) {
              console.log(' File sharing failed:', shareError);
            }
          } else {
            console.log(' File sharing not supported by device');
          }
        } else {
          console.log(' Failed to create QR blob');
        }
        
        // Fallback to text-only sharing
        await navigator.share({
          title: 'AfriPayFlow Payment Request',
          text: shareText,
        });
        console.log(' Successfully shared text');
      } catch (error) {
        console.log(' Share cancelled or failed:', error);
        // Fallback to copying
        copyToClipboard(shareText, 'link');
      }
    } else {
      copyToClipboard(shareText, 'link');
    }
  }, [qrData, copyToClipboard]);

  const resetForm = () => {
    setStep('form');
    setQrData(null);
    setError('');
    setCopied(null);
  };

  const getExpirationTime = () => {
    if (!qrData?.expiresAt) return 'No expiration';
    
    const expirationDate = new Date(qrData.expiresAt);
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs <= 0) return 'Expired';
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m remaining`;
    return `${diffMinutes}m remaining`;
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Modern Header */}
      <div className="bg-white/90 backdrop-blur-md shadow-sm border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-primary-600 transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:transform group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back to Dashboard</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-700">Payment Request</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8"
      >
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-3xl mb-6 shadow-xl"
          >
            <QrCode className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {step === 'form' ? 'Create Payment Request' : 'Payment Request Created'}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {step === 'form' 
              ? 'Generate a secure QR code to receive payments instantly. Share with customers for seamless crypto transactions.'
              : 'Your payment request is ready! Share this QR code or link with your customer for instant payments.'
            }
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-green-100 overflow-hidden max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div
                key="form"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-8 lg:p-12"
              >
                <div className="flex items-center mb-8">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl mr-4">
                    <DollarSign className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Payment Details</h2>
                    <p className="text-gray-600 text-lg">Configure your payment request settings</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Amount Input */}
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      <DollarSign className="w-4 h-4 inline mr-2" />
                      Amount (Optional)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Leave empty for custom amount"
                        min="0"
                        step="0.01"
                        className="w-full pl-12 pr-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-0 focus:border-primary-500 text-lg font-semibold text-gray-900 placeholder-gray-400 bg-white shadow-sm transition-colors"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2 ml-1">
                      💡 Leave empty to let customers enter their own amount
                    </p>
                  </motion.div>

                  {/* Token Type Selection */}
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      <Coins className="w-4 h-4 inline mr-2" />
                      Token Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {availableTokens.map((token) => (
                        <motion.button
                          key={token.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setTokenType(token.value)}
                          className={`p-6 border-2 rounded-2xl text-left transition-all duration-200 shadow-sm ${
                            tokenType === token.value
                              ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-primary-100 shadow-lg'
                              : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-gray-900 text-lg">{token.label}</div>
                            {tokenType === token.value && (
                              <CheckCircle className="w-5 h-5 text-primary-600" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{token.description}</div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Description */}
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      <MessageSquare className="w-4 h-4 inline mr-2" />
                      Description (Optional)
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What is this payment for? (e.g., Product purchase, Service payment, etc.)"
                        rows={4}
                        className="w-full pl-12 pr-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-0 focus:border-primary-500 resize-none text-gray-900 placeholder-gray-400 bg-white shadow-sm transition-colors"
                      />
                    </div>
                  </motion.div>

                  {/* Expiration */}
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      <Timer className="w-4 h-4 inline mr-2" />
                      Expiration Time
                    </label>
                    <div className="relative">
                      <Timer className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={expirationHours}
                        onChange={(e) => setExpirationHours(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-0 focus:border-primary-500 text-gray-900 bg-white shadow-sm transition-colors appearance-none font-medium"
                      >
                        <option value="1">1 Hour</option>
                        <option value="6">6 Hours</option>
                        <option value="24">24 Hours (Recommended)</option>
                        <option value="72">3 Days</option>
                        <option value="168">1 Week</option>
                      </select>
                    </div>
                  </motion.div>

                  {/* Payment Features Info */}
                  <div className="p-6 bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-200 rounded-2xl">
                    <div className="flex items-start">
                      <QrCode className="w-6 h-6 text-primary-600 mr-4 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-primary-800 mb-2">QR Payment Features</h4>
                        <ul className="text-sm text-primary-700 space-y-1">
                          <li>• Instant payment processing with real-time notifications</li>
                          <li>• Secure blockchain transactions on Hedera network</li>
                          <li>• Support for multiple cryptocurrencies (HBAR, USDC, USDT)</li>
                          <li>• Shareable payment links and downloadable QR codes</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Error Display */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-6 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-2xl flex items-center shadow-sm"
                      >
                        <AlertCircle className="w-6 h-6 text-red-500 mr-4 flex-shrink-0" />
                        <span className="text-red-700 font-medium">{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Generate Button */}
                  <motion.button
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={generateQR}
                    disabled={isGenerating}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl ${
                      isGenerating
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700'
                    }`}
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center">
                        <Loader className="w-5 h-5 animate-spin mr-3" />
                        Generating QR Code...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <QrCode className="w-5 h-5 mr-3" />
                        Generate Payment Request
                      </div>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="qr"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-8"
              >
                {qrData && (
                  <div className="space-y-6">
                    {/* QR Code Display */}
                    <motion.div variants={itemVariants} className="flex justify-center">
                      <div className="bg-white p-6 rounded-2xl shadow-inner">
                        <QRCode
                          id="payment-qr-code"
                          value={qrData.qrData}
                          size={200}
                          level="M"
                        />
                      </div>
                    </motion.div>

                    {/* Payment Details */}
                    <motion.div variants={itemVariants} className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-800 mb-4">Payment Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Amount</p>
                          <p className="font-semibold">
                            {qrData.amount ? `${qrData.amount} ${qrData.tokenType}` : 'Custom Amount'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Token</p>
                          <p className="font-semibold">{qrData.tokenType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Expires</p>
                          <p className="font-semibold text-sm">{getExpirationTime()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Request ID</p>
                          <p className="font-mono text-xs bg-white px-2 py-1 rounded border">
                            {qrData.nonce.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button
                        onClick={downloadQRCode}
                        className="flex items-center justify-center px-4 py-3 bg-green-100 hover:bg-green-200 text-green-800 rounded-xl transition-colors"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download QR
                      </button>

                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/pay?nonce=${qrData.nonce}`, 'link')}
                        className="flex items-center justify-center px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl transition-colors"
                      >
                        {copied === 'link' ? (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-5 h-5 mr-2" />
                            Copy Link
                          </>
                        )}
                      </button>

                      <button
                        onClick={sharePayment}
                        className="flex items-center justify-center px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl transition-colors"
                      >
                        <Share2 className="w-5 h-5 mr-2" />
                        Share All
                      </button>
                    </motion.div>

                    {/* Create Another Button */}
                    <motion.div variants={itemVariants} className="pt-4 border-t border-gray-200">
                      <button
                        onClick={resetForm}
                        className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                      >
                        Create Another Request
                      </button>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default CreatePaymentRequest;