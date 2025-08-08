import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Globe, Smartphone, CreditCard, TrendingUp } from 'lucide-react';
import AuthModal from './AuthModal';

interface LandingPageProps {
  onGetStarted: (type: 'customer' | 'merchant') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<'customer' | 'merchant'>('customer');

  const handleGetStarted = (type: 'customer' | 'merchant') => {
    setSelectedAccountType(type);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (accountData: any) => {
    // Authentication successful - user state will be updated in SessionContext
    // Navigation will happen automatically via useEffect in App.tsx
    console.log('Authentication successful for:', selectedAccountType);
    // Mark that we just authenticated via the regular landing auth flow
    // so App.tsx can redirect to dashboard once, without affecting first-load behavior
    try { sessionStorage.setItem('justAuthenticated', '1'); } catch {}
    setIsAuthModalOpen(false);
  };
  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Zero Fees",
      description: "Gasless crypto payments with no hidden charges"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Mobile-First",
      description: "Simple QR code payments for the unbanked"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure",
      description: "Built on Hedera for enterprise-grade security"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "For Africa",
      description: "Designed specifically for African markets"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <motion.header 
        className="px-6 py-4 flex justify-between items-center"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">HederaPay</span>
          <span className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded-full">Africa</span>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.main 
        className="px-6 py-12 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="text-center mb-16">
          <motion.h1 
            className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
            variants={itemVariants}
          >
            Gasless Crypto Payments for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-500">
              Africa
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            variants={itemVariants}
          >
            Enable seamless USDC, USDT, and HBAR payments via QR codes. Built
            on Hedera for the unbanked, with zero fees and mobile-money simplicity.
          </motion.p>



          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={itemVariants}
          >
            <motion.button
              onClick={() => handleGetStarted('merchant')}
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Start Accepting Payments</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              onClick={() => handleGetStarted('customer')}
              className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-xl font-semibold border-2 border-gray-200 hover:border-primary-300 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Paying
            </motion.button>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16"
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              variants={itemVariants}
              whileHover={{ y: -5 }}
            >
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 text-primary-600">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
          variants={itemVariants}
        >
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">0%</div>
              <div className="text-gray-600">Transaction Fees</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">3</div>
              <div className="text-gray-600">Supported Tokens</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">54</div>
              <div className="text-gray-600">African Countries</div>
            </div>
          </div>
        </motion.div>

        {/* How it Works */}
        <motion.section 
          className="mt-20"
          variants={containerVariants}
        >
          <motion.h2 
            className="text-3xl font-bold text-center text-gray-900 mb-12"
            variants={itemVariants}
          >
            How It Works
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Create Account",
                description: "Quick setup with your mobile number"
              },
              {
                step: "2", 
                title: "Fund Wallet",
                description: "Add crypto via mobile money or bank transfer"
              },
              {
                step: "3",
                title: "Pay & Receive",
                description: "Scan QR codes for instant payments"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="text-center"
                variants={itemVariants}
              >
                <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </motion.main>

      {/* Footer */}
      <motion.footer 
        className="bg-gray-900 text-white py-12 mt-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">HederaPay Africa</span>
          </div>
          <p className="text-gray-400">
            Built on Hedera • Powering Africa's Financial Future
          </p>
        </div>
      </motion.footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        accountType={selectedAccountType}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default LandingPage;
