import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowDownLeft, CheckCircle, AlertCircle, Loader, Copy, Building, DollarSign } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useSession } from '../contexts/SessionContext';

interface DirectDepositProps {
  onBack: () => void;
  onSuccess?: () => void;
}

const DirectDeposit: React.FC<DirectDepositProps> = ({ onBack, onSuccess }) => {
  const { user, refreshBalances } = useSession();
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState('HBAR');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking' // Fixed: Backend expects 'accountType', not 'bankName'
  });
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [depositData, setDepositData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const initiateDeposit = async () => {
    if (!user || !amount || !bankDetails.accountNumber || !bankDetails.routingNumber || !bankDetails.accountType) return;

    setIsDepositing(true);
    setError('');

    try {
      const response = await apiClient.initiateDirectDeposit({
        userId: user.userId,
        amount: parseFloat(amount),
        tokenType,
        bankDetails
      });

      if (response.success) {
        setDepositData(response.data);
        setSuccess(true);
        refreshBalances();
        if (onSuccess) onSuccess();
      } else {
        setError(response.message || 'Failed to initiate deposit');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate deposit');
    } finally {
      setIsDepositing(false);
    }
  };

  const copyDepositId = async () => {
    if (depositData?.depositId) {
      try {
        await navigator.clipboard.writeText(depositData.depositId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const resetForm = () => {
    setAmount('');
    setBankDetails({
      accountNumber: '',
      routingNumber: '',
      accountType: ''
    });
    setError('');
    setSuccess(false);
    setDepositData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Direct Deposit
            </h1>
            <p className="text-gray-600">
              Transfer funds from your bank account to your AfriPayFlow wallet
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {!success ? (
            <div className="p-8">
              <div className="space-y-6">
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Deposit Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  />
                </div>

                {/* Token Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Token Type
                  </label>
                  <select
                    value={tokenType}
                    onChange={(e) => setTokenType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="HBAR">HBAR</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>

                {/* Bank Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Bank Account Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="Account number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Routing Number
                      </label>
                      <input
                        type="text"
                        value={bankDetails.routingNumber}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, routingNumber: e.target.value }))}
                        placeholder="Routing number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountType}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountType: e.target.value })}
                      placeholder="Select account type"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={initiateDeposit}
                  disabled={isDepositing || !amount || !bankDetails.accountNumber || !bankDetails.routingNumber || !bankDetails.accountType}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all ${
                    isDepositing || !amount || !bankDetails.accountNumber || !bankDetails.routingNumber || !bankDetails.accountType
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isDepositing ? (
                    <div className="flex items-center justify-center">
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Initiating Deposit...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <ArrowDownLeft className="w-5 h-5 mr-2" />
                      Initiate Direct Deposit
                    </div>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Deposit Initiated Successfully!
                </h3>
                <p className="text-gray-600 text-sm">
                  Your direct deposit request has been submitted
                </p>
              </div>

              {/* Deposit Details */}
              <div className="bg-green-50 rounded-xl p-6 space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Deposit ID</span>
                  <div className="flex items-center">
                    <code className="text-sm bg-white px-2 py-1 rounded border font-mono mr-2">
                      {depositData?.depositId}
                    </code>
                    <button
                      onClick={copyDepositId}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-semibold">{depositData?.amount} {depositData?.tokenType}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    {depositData?.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Estimated Completion</span>
                  <span className="text-sm">{depositData?.estimatedCompletion}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={resetForm}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Make Another Deposit
                </button>
                
                <button
                  onClick={onBack}
                  className="w-full py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectDeposit;