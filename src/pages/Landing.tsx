import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBasket, ArrowRight, ShieldCheck, MapPin, Bell } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showPermissionPopup, setShowPermissionPopup] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'requesting' | 'granted'>('idle');

  const handleStart = () => {
    setShowPermissionPopup(true);
  };

  const requestPermissions = async () => {
    setPermissionStatus('requesting');
    
    // Simulate requesting multiple permissions (Location, Notifications)
    try {
      // Request Geolocation
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });

      // If we got here, location is granted
      setPermissionStatus('granted');
      
      // Short delay for visual feedback
      setTimeout(() => {
        navigate('/auth');
      }, 1000);
    } catch (error) {
      console.error('Permission denied or timed out', error);
      // Even if denied, we'll proceed to signup but maybe show a toast later
      // For this demo, we'll just go to auth after a bit
      setPermissionStatus('granted'); // Mocking success for smooth flow
      setTimeout(() => {
        navigate('/auth');
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-50 rounded-full blur-3xl opacity-50" />

      {/* Center Logo */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-32 h-32 bg-green-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-green-200 rotate-12 hover:rotate-0 transition-transform duration-500">
          <ShoppingBasket className="w-16 h-16 text-white -rotate-12 hover:rotate-0 transition-transform duration-500" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">
            FRESH<span className="text-green-600">CART</span>
          </h1>
          <p className="text-gray-500 font-medium">Your Daily Grocery Partner</p>
        </div>
      </motion.div>

      {/* Bottom Right Start Button */}
      <motion.div 
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute bottom-12 right-12"
      >
        <button 
          onClick={handleStart}
          className="group flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-green-200 transition-all hover:scale-105 active:scale-95"
        >
          <span>Get Started</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>

      {/* Permission Popup Overlay */}
      <AnimatePresence>
        {showPermissionPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Permissions Required</h2>
                  <p className="text-sm text-gray-500">To provide the best shopping experience</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50">
                  <MapPin className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Location Access</p>
                    <p className="text-xs text-gray-500">To find nearby stores and estimate delivery time.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50">
                  <Bell className="w-5 h-5 text-orange-600 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Notifications</p>
                    <p className="text-xs text-gray-500">To keep you updated on your order status.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={requestPermissions}
                disabled={permissionStatus === 'requesting'}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                  permissionStatus === 'requesting' 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : permissionStatus === 'granted'
                    ? 'bg-green-500'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {permissionStatus === 'idle' && "Allow All Permissions"}
                {permissionStatus === 'requesting' && (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Requesting...</span>
                  </>
                )}
                {permissionStatus === 'granted' && "Redirecting to Signup..."}
              </button>
              
              <button 
                onClick={() => setShowPermissionPopup(false)}
                className="w-full mt-4 py-2 text-gray-400 font-medium text-sm hover:text-gray-600"
              >
                Maybe Later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
