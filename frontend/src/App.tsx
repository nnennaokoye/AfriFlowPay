import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { SessionProvider, useSession } from './contexts/SessionContext';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import PaymentAuthModal from './components/PaymentAuthModal';
import PaymentPage from './components/PaymentPage';
import AccountCreation from './components/AccountCreation';

const AppContent: React.FC = () => {
  const { user, isLoading } = useSession();
  const initialPage = (() => {
    try {
      if (sessionStorage.getItem('justAuthenticated') === '1') return 'dashboard' as const;
      const storedUser = localStorage.getItem('afriPayFlow_user');
      const storedSession = localStorage.getItem('afriPayFlow_session');
      if (storedUser && storedSession) return 'dashboard' as const;
      const last = sessionStorage.getItem('lastPage');
      if (last === 'dashboard' || last === 'account-creation') return 'dashboard' as const;
    } catch {}
    return 'landing' as const;
  })();
  const [currentPage, setCurrentPage] = useState<'landing' | 'dashboard' | 'account-creation'>(initialPage);

  console.log('App render - Current page:', currentPage, 'User:', user?.userId, 'Loading:', isLoading);

  // Persist last viewed page across refreshes
  useEffect(() => {
    // Avoid writing while auth state is still loading and only persist when authenticated
    if (isLoading) return;
    if (!user || !user.userId) return;
    try {
      sessionStorage.setItem('lastPage', currentPage);
    } catch {}
  }, [currentPage, isLoading, user]);

  useEffect(() => {
    console.log('App useEffect - User state changed:', user?.userId, 'Loading:', isLoading, 'Current page:', currentPage);
    if (isLoading) return;

    // Only redirect to dashboard immediately after an explicit auth flow
    let shouldGoToDashboard = false;
    try {
      shouldGoToDashboard = sessionStorage.getItem('justAuthenticated') === '1';
    } catch {}

    if (shouldGoToDashboard) {
      setCurrentPage('dashboard');
      try { sessionStorage.removeItem('justAuthenticated'); } catch {}
      try { sessionStorage.setItem('lastPage', 'dashboard'); } catch {}
      return;
    }

    // If not authenticated, ensure we're on landing (do not overwrite lastPage to preserve dashboard preference)
    if (!user || !user.userId) {
      setCurrentPage('landing');
      return;
    }

    // If authenticated, restore last viewed page (default to dashboard)
    try {
      const lastPage = sessionStorage.getItem('lastPage');
      if (lastPage === 'dashboard') {
        setCurrentPage('dashboard');
      } else if (lastPage === 'landing') {
        setCurrentPage('landing');
      } else {
        setCurrentPage('dashboard');
      }
    } catch {
      setCurrentPage('dashboard');
    }
  }, [user, isLoading]);

  const handleGetStarted = (_type: 'customer' | 'merchant') => {
    setCurrentPage('account-creation');
  };

  const handleAccountCreated = (accountData: any) => {
    console.log('Account created:', accountData);
    setCurrentPage('dashboard');
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
  };

  // Show loading spinner during authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }



  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onGetStarted={handleGetStarted} />;
      
      case 'account-creation':
        return (
          <AccountCreation 
            onAccountCreated={handleAccountCreated}
            onBack={handleBackToLanding}
          />
        );
      
      case 'dashboard':
        return <Dashboard />;
      
      default:
        console.log('Unknown page, falling back to landing:', currentPage);
        return <LandingPage onGetStarted={handleGetStarted} />;
    }
  };

  return renderPage();
};

// Payment route component for handling QR scans
const PaymentRoute: React.FC = () => {
  const [searchParams] = useSearchParams();
  const nonce = searchParams.get('nonce');
  const { user, isLoading } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(true); 

  console.log(' PaymentRoute render - nonce:', nonce, 'user:', user?.userId, 'isLoading:', isLoading);

  useEffect(() => {
    console.log(' PaymentRoute: checking auth state - user:', !!user, 'isLoading:', isLoading);
    
    if (!isLoading) {
      if (user) {
        console.log(' User authenticated, hiding auth modal');
        setShowAuthModal(false);
      } else {
        console.log(' No user found, ensuring auth modal is shown');
        setShowAuthModal(true);
      }
    }
  }, [user, isLoading]);

  const handleAuthSuccess = (accountData: any) => {
    console.log(' Payment authentication successful - accountData:', accountData);
    setShowAuthModal(false);
  
  };

  const handleAuthClose = () => {
    console.log(' Payment auth modal closed - redirecting to home');
    setShowAuthModal(false);
    window.location.href = '/';
  };

  const handleBack = () => {
    window.location.href = '/';
  };

  const handlePaymentComplete = () => {
    window.location.href = '/';
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show payment page
  if (user) {
    console.log(' Rendering PaymentPage with user:', user.userId, 'and nonce:', nonce);
    return (
      <PaymentPage 
        nonce={nonce || undefined}
        onBack={handleBack}
        onPaymentComplete={handlePaymentComplete}
      />
    );
  }

  // Show authentication requirement for payment
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Your Payment</h2>
          <p className="text-gray-600 mb-6">
            Please authenticate to process your payment.
          </p>
          {nonce && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500">Payment ID:</p>
              <p className="font-mono text-xs">{nonce}</p>
            </div>
          )}
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <p className="text-blue-700 text-sm">
              🔒 Your payment is secured by Hedera blockchain technology
            </p>
          </div>
          
          <button
            onClick={handleBack}
            className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Dedicated Payment Authentication Modal */}
      <PaymentAuthModal
        isOpen={showAuthModal}
        nonce={nonce || undefined}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};

function App() {
  console.log('🚀 App component rendering');
  
  return (
    <SessionProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/pay" element={<PaymentRouteWrapper />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </SessionProvider>
  );
}

// Wrapper component for payment route with debugging
const PaymentRouteWrapper: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const nonce = searchParams.get('nonce');
  
  console.log('🔗 PaymentRouteWrapper - Location:', location.pathname, location.search);
  console.log('🔗 PaymentRouteWrapper - Nonce:', nonce);
  
  return <PaymentRoute />;
};

export default App;