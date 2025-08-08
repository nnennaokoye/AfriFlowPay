import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from '../contexts/SessionContext';
import { apiClient } from '../services/apiClient';
import { ArrowLeft, Clock, Link as LinkIcon, QrCode, Calendar, RefreshCw, Copy, CheckCircle } from 'lucide-react';

interface ViewPaymentRequestsProps {
  onBack: () => void;
}

const ViewPaymentRequests: React.FC<ViewPaymentRequestsProps> = ({ onBack }) => {
  const { user } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const formatDateTime = (val?: string) => {
    if (!val) return '—';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  };

  const load = async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const res = await apiClient.getMerchantPaymentRequests(user.userId, { status, limit: 100 });
      if (res.success && (res as any).data) {
        setItems((res as any).data.payments || []);
      } else if (res.success && (res as any).payments) {
        setItems((res as any).payments || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.userId, status]);

  const onCopy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1200); } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </button>
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Payment Requests</h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border mb-4 flex flex-wrap gap-3 items-center">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All</option>
            <option value="pending_payment">Pending</option>
            <option value="expired">Expired</option>
          </select>
          <button onClick={load} className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {items.map((it) => (
            <div key={it.nonce} className="bg-white rounded-xl p-4 border hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-gray-900">{it.amount ? `${it.amount} ${it.tokenType}` : 'Any Amount'}</span>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${it.status==='expired'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-800'}`}>{it.status}</span>
              </div>
              <div className="text-sm text-gray-700 flex flex-wrap gap-4">
                <div className="flex items-center"><Calendar className="w-4 h-4 mr-1 text-gray-500" />Created: {formatDateTime(it.createdAt)}</div>
                <div className="flex items-center"><Clock className="w-4 h-4 mr-1 text-gray-500" />Expires: {formatDateTime(it.expiresAt)}</div>
              </div>
              <div className="mt-3 flex items-center bg-gray-50 rounded-lg px-2 py-1">
                <code className="font-mono text-xs truncate" title={it.paymentLink}>{it.paymentLink}</code>
                <button onClick={() => onCopy(it.paymentLink, it.nonce)} className="ml-auto p-1 text-gray-400 hover:text-gray-600">
                  {copied===it.nonce ? <CheckCircle className="w-4 h-4 text-green-600"/> : <Copy className="w-4 h-4"/>}
                </button>
              </div>
            </div>
          ))}
          {!items.length && !loading && (
            <div className="bg-white rounded-xl p-8 border text-center text-gray-600">No payment requests found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewPaymentRequests;


