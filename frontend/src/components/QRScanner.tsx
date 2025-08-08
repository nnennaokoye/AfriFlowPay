import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, QrCode, Camera, Type, AlertCircle, ExternalLink, Play, Pause } from 'lucide-react';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onBack: () => void;
  onScan: (nonce: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack, onScan }) => {
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  // Check camera support on mount
  useEffect(() => {
    QrScanner.hasCamera().then(setCameraSupported);
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, []);

  const extractNonce = (input: string): string | null => {
    let nonce = input.trim();
    if (nonce.includes('nonce=')) {
      const urlParams = new URLSearchParams(nonce.split('?')[1]);
      nonce = urlParams.get('nonce') || '';
    } else if (nonce.startsWith('afriPayFlow://pay?nonce=')) {
      nonce = nonce.replace('afriPayFlow://pay?nonce=', '');
    }
    return nonce || null;
  };

  const handleScanResult = (result: string) => {
    setScannedResult(result);
    setIsScanning(false);
    
    const nonce = extractNonce(result);
    if (nonce) {
      onScan(nonce);
    } else {
      setError('Invalid QR code - does not contain a valid payment nonce');
    }
  };

  const startScanning = async () => {
    if (!videoRef.current || !cameraSupported) return;

    try {
      setError('');
      setIsScanning(true);
      
      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result.data),
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      
      scannerRef.current = scanner;
      await scanner.start();
    } catch (err: any) {
      setError('Failed to start camera: ' + err.message);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualSubmit = () => {
    const input = manualInput.trim() || scannedResult?.trim();
    if (!input) {
      setError('Please enter a payment link or nonce');
      return;
    }

    const nonce = extractNonce(input);
    if (nonce) {
      onScan(nonce);
    } else {
      setError('Invalid payment link or nonce');
    }
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleLinkClick = (url: string) => {
    if (isValidUrl(url)) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          className="flex items-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-all mr-4"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Scan QR Code</h1>
            <p className="text-gray-600">Scan or enter payment details</p>
          </div>
        </motion.div>

        {/* QR Scanner */}
        <motion.div 
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-center mb-6">
            <div className="w-64 h-64 mx-auto bg-gray-100 rounded-2xl overflow-hidden relative">
              {cameraSupported ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ display: isScanning ? 'block' : 'none' }}
                  />
                  {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Camera Ready</p>
                        <p className="text-sm text-gray-400">Tap to start scanning</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center border-4 border-dashed border-gray-300">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Camera Not Available</p>
                    <p className="text-sm text-gray-400">Use manual input below</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {cameraSupported && (
            <div className="flex gap-3">
              <button
                onClick={isScanning ? stopScanning : startScanning}
                className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-colors ${
                  isScanning
                    ? 'bg-red-100 hover:bg-red-200 text-red-700'
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                }`}
              >
                {isScanning ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Stop Scanning
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Scanning
                  </>
                )}
              </button>
            </div>
          )}
          
          {!cameraSupported && (
            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-yellow-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Camera Not Available</span>
              </div>
              <p className="text-yellow-600 text-sm mt-1">
                Please use manual input or enable camera permissions
              </p>
            </div>
          )}
        </motion.div>

        {/* Scanned Result Display */}
        {scannedResult && (
          <motion.div 
            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="flex items-center space-x-2 mb-4">
              <QrCode className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Scanned Result</h3>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              {isValidUrl(scannedResult) ? (
                <button
                  onClick={() => handleLinkClick(scannedResult)}
                  className="flex items-center justify-between w-full p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                >
                  <span className="text-blue-700 font-medium truncate mr-2">
                    {scannedResult}
                  </span>
                  <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0" />
                </button>
              ) : (
                <p className="text-gray-700 font-mono text-sm break-all">
                  {scannedResult}
                </p>
              )}
            </div>

            <button
              onClick={handleManualSubmit}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Process This QR Code
            </button>
          </motion.div>
        )}

        {/* Manual Input */}
        <motion.div 
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center space-x-2 mb-4">
            <Type className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Manual Entry</h3>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Payment Link or Nonce
              </label>
              <textarea
                value={manualInput}
                onChange={(e) => {
                  setManualInput(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Paste payment link or enter nonce..."
              />
              
              {/* Show clickable link preview if valid URL */}
              {manualInput.trim() && isValidUrl(manualInput.trim()) && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Detected Link:</p>
                  <button
                    onClick={() => handleLinkClick(manualInput.trim())}
                    className="flex items-center justify-between w-full p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  >
                    <span className="text-blue-700 font-medium truncate mr-2">
                      {manualInput.trim()}
                    </span>
                    <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  </button>
                </div>
              )}
            </div>

            <motion.button
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <QrCode className="w-5 h-5" />
              <span>Process Payment</span>
            </motion.button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-gray-900 mb-2">Supported Formats:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Payment links: https://domain.com/pay?nonce=...</li>
              <li>• QR data: afriPayFlow://pay?nonce=...</li>
              <li>• Direct nonce: abc123def456...</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QRScanner;
