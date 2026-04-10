import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { ShoppingBag, MapPin, Phone, User, MapPinIcon, ChevronRight, ChevronLeft, CheckCircle2, Loader2, CreditCard, ShieldAlert } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

type CheckoutStep = 'details' | 'payment' | 'success';

export default function Checkout() {
  const { cart, total, clearCart } = useCart();
  const { user, profile, updateUserProfile, isAdmin } = useAuth();
  const { placeOrder } = useOrders();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [step, setStep] = useState<CheckoutStep>(location.state?.startStep || 'details');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'whatsapp' | 'upi'>('cod');
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    coords: null as { lat: number; lng: number } | null
  });

  useEffect(() => {
    if (cart.length === 0 && step !== 'success') {
      navigate('/cart');
    }
  }, [cart, step, navigate]);

  useEffect(() => {
    if (profile) {
      const nameParts = (profile.displayName || '').split(' ');
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: profile.phone || '',
        address: profile.address || '',
        coords: null
      });
    }
  }, [profile]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationStr = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
        setFormData(prev => ({
          ...prev,
          address: `${prev.address ? prev.address + '\n' : ''}Current Location: ${locationStr}`,
          coords: { lat: latitude, lng: longitude }
        }));
        setIsLocating(false);
        showToast(t('locationCaptured'), 'success');
      },
      (error) => {
        console.error("Error getting location:", error);
        let message = 'Could not get your location.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable it in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable. Please check your GPS/Network.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
        }
        
        showToast(`${message} Please enter it manually.`, 'error');
        setIsLocating(false);
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const validateDetails = () => {
    const nameRegex = /^[a-zA-Z]{2,30}$/;
    const phoneRegex = /^(\+91)?[6789]\d{9}$/;

    if (!formData.firstName.trim()) {
      showToast('Please enter your first name', 'error');
      return false;
    }
    if (!nameRegex.test(formData.firstName.trim())) {
      showToast('First name should be letters only (2-30 chars)', 'error');
      return false;
    }
    if (!formData.lastName.trim()) {
      showToast('Please enter your last name', 'error');
      return false;
    }
    if (!nameRegex.test(formData.lastName.trim())) {
      showToast('Last name should be letters only (2-30 chars)', 'error');
      return false;
    }
    if (!formData.phone.trim()) {
      showToast('Please enter your phone number', 'error');
      return false;
    }
    
    const cleanPhone = formData.phone.trim().replace(/[\s\-]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      showToast('Please enter a valid Indian phone number', 'error');
      return false;
    }
    
    if (!formData.address.trim()) {
      showToast('Please enter your delivery address', 'error');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (isAdmin) {
      showToast('Administrators cannot place orders', 'error');
      return;
    }

    if (!validateDetails()) return;

    setIsUploading(true);
    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      if (profile && (!profile.displayName || !profile.phone || !profile.address)) {
        await updateUserProfile({
          displayName: profile.displayName || fullName,
          phone: profile.phone || formData.phone,
          address: profile.address || formData.address
        });
      }

      await placeOrder(cart, total, {
        name: fullName,
        phone: formData.phone,
        address: formData.address,
        coords: formData.coords || undefined
      }, paymentMethod);
      
      // Emit socket event for real-time notification
      if (socket) {
        socket.emit('new-order', {
          customerName: fullName,
          total: total
        });
      }
      
      setStep('success');
      clearCart();
    } catch (error) {
      console.error("Error placing order:", error);
      showToast('Failed to place order. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto text-center py-10 md:py-20 space-y-6 md:space-y-8 px-4">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mx-auto text-white"
          style={{ backgroundColor: 'rgb(39, 96, 27)' }}
        >
          <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16" />
        </motion.div>
        <div className="space-y-2 md:space-y-4">
          <h2 className="text-2xl md:text-4xl font-bold text-gray-800">{t('orderConfirmed')}</h2>
          <p className="text-lg md:text-xl text-gray-500">{t('thankYou')}</p>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border shadow-sm space-y-4 md:space-y-6 text-left">
          <div className="flex justify-between items-center border-b pb-3 md:pb-4">
            <span className="text-gray-500 font-medium text-sm md:text-base">{t('orderStatus')}</span>
            <span className="bg-gray-100 text-gray-700 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-sm font-bold uppercase tracking-wider">{t('processing')}</span>
          </div>
          <div className="space-y-1 md:space-y-2">
            <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase">{t('deliveryTo')}</p>
            <p className="font-bold text-gray-800 text-sm md:text-base">{formData.firstName} {formData.lastName}</p>
            <p className="text-gray-600 text-sm md:text-base">{formData.address}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
          <Link 
            to="/orders" 
            className="text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:opacity-90 transition-colors text-center"
            style={{ backgroundColor: 'rgb(39, 96, 27)' }}
          >
            {t('viewOrders')}
          </Link>
          <Link to="/shop" className="bg-gray-100 text-gray-600 px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:bg-gray-200 transition-colors text-center">
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 -z-10"></div>
          <div 
            className={`absolute top-1/2 left-0 h-1 -translate-y-1/2 -z-10 transition-all duration-500`} 
            style={{ 
              width: step === 'details' ? '0%' : '100%',
              backgroundColor: 'rgb(39, 96, 27)'
            }}
          ></div>
          
          {[
            { id: 'details', label: t('deliveryDetails'), icon: User },
            { id: 'payment', label: t('paymentMethod'), icon: ShoppingBag }
          ].map((s, i) => {
            const isActive = step === s.id;
            const isCompleted = ['details', 'payment'].indexOf(step) > i;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1 md:gap-2">
                <div 
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 md:border-4 transition-all duration-300 ${
                    isActive ? 'bg-white scale-110' : 
                    isCompleted ? 'text-white' : 
                    'bg-white border-gray-200 text-gray-400'
                  }`}
                  style={
                    isActive ? { borderColor: 'rgb(39, 96, 27)', color: 'rgb(39, 96, 27)' } :
                    isCompleted ? { backgroundColor: 'rgb(39, 96, 27)', borderColor: 'rgb(39, 96, 27)' } :
                    {}
                  }
                >
                  <s.icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider text-center max-w-[80px] md:max-w-none ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6">
          {step === 'details' && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('deliveryDetails')}</h2>
              <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border shadow-sm space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-xs md:text-sm font-bold text-gray-700">{t('firstName')}</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5" style={{ color: 'rgb(39, 96, 27)' }} />
                      <input 
                        required
                        type="text" 
                        placeholder={t('firstName')}
                        className="w-full pl-9 md:pl-10 pr-4 py-3 md:py-4 border rounded-xl md:rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none text-sm md:text-base"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-xs md:text-sm font-bold text-gray-700">{t('lastName')}</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5" style={{ color: 'rgb(39, 96, 27)' }} />
                      <input 
                        required
                        type="text" 
                        placeholder={t('lastName')}
                        className="w-full pl-9 md:pl-10 pr-4 py-3 md:py-4 border rounded-xl md:rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none text-sm md:text-base"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-xs md:text-sm font-bold text-gray-700">{t('phoneNumber')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5" style={{ color: 'rgb(39, 96, 27)' }} />
                    <input 
                      required
                      type="tel" 
                      placeholder={t('phoneNumber')}
                      className="w-full pl-9 md:pl-10 pr-4 py-3 md:py-4 border rounded-xl md:rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none text-sm md:text-base"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-xs md:text-sm font-bold text-gray-700">{t('deliveryAddress')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-4 w-4 h-4 md:w-5 md:h-5" style={{ color: 'rgb(39, 96, 27)' }} />
                    <textarea 
                      required
                      placeholder={t('deliveryAddress')}
                      rows={4}
                      className="w-full pl-9 md:pl-10 pr-4 py-3 md:py-4 border rounded-xl md:rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none resize-none text-sm md:text-base"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={isLocating}
                      className="absolute right-3 bottom-3 md:right-4 md:bottom-4 bg-gray-50 text-gray-600 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold border border-gray-100"
                    >
                      {isLocating ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
                      ) : (
                        <MapPinIcon className="w-3 h-3" />
                      )}
                      {isLocating ? t('locating') : t('useGps')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('paymentMethod')}</h2>
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                <button 
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 text-left transition-all ${
                    paymentMethod === 'cod' ? 'border-gray-900 bg-gray-50 shadow-md' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div 
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 ${
                      paymentMethod === 'cod' ? 'text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                    style={paymentMethod === 'cod' ? { backgroundColor: 'rgb(39, 96, 27)' } : {}}
                  >
                    <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="font-bold text-base md:text-lg text-gray-800">{t('cod')}</h3>
                  <p className="text-xs md:text-sm text-gray-500">{t('payAtDelivery')}</p>
                </button>

                <button 
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 text-left transition-all ${
                    paymentMethod === 'upi' ? 'border-gray-900 bg-gray-50 shadow-md' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div 
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 ${
                      paymentMethod === 'upi' ? 'text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                    style={paymentMethod === 'upi' ? { backgroundColor: 'rgb(39, 96, 27)' } : {}}
                  >
                    <CreditCard className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="font-bold text-base md:text-lg text-gray-800">{t('upi')}</h3>
                  <p className="text-xs md:text-sm text-gray-500">{t('payOnline')}</p>
                </button>

                <AnimatePresence>
                  {paymentMethod === 'upi' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 border-gray-100 flex flex-col items-center gap-4 md:gap-6"
                    >
                      <div className="w-full space-y-3 md:space-y-4">
                        <div className="flex flex-col items-center gap-3 md:gap-4">
                          <p className="text-[10px] md:text-sm font-bold text-gray-800 uppercase tracking-wider">{t('scanToPay')}</p>
                          <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border shadow-sm">
                            <img 
                              src="https://roasted-lavender-h2bzsr9y86.edgeone.app/IMG_20260406_134936.png" 
                              alt="UPI QR Code"
                              className="w-36 h-36 md:w-48 md:h-48 object-contain"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=702986593@ybl&pn=FreshCart";
                              }}
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-xs md:text-sm font-bold text-gray-800">UPI ID: 702986593@ybl</p>
                            <p className="text-[10px] md:text-xs text-red-600 font-bold mt-1 md:mt-2 px-2 md:px-4 leading-tight">
                              After payment, click "Place Order" below. We will verify your payment manually.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border p-5 md:p-8 sticky top-24">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">Order Summary</h2>
            
            <div className="space-y-3 md:space-y-4 mb-3 md:mb-4 max-h-48 md:max-h-60 overflow-y-auto pr-2 scrollbar-hide">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-xs md:text-sm">
                  <span className="text-gray-600 truncate max-w-[120px] md:max-w-[150px]">{item.name} x {item.quantity}</span>
                  <span className="font-bold text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 border-t pt-3 md:pt-4">
              <div className="flex justify-between text-xs md:text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="font-bold text-gray-800">₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm text-gray-500">
                <span>Delivery Fee</span>
                <span className="text-gray-900 font-bold">FREE</span>
              </div>
              <div className="border-t border-dashed pt-3 md:pt-4 flex justify-between text-xl md:text-2xl font-extrabold text-gray-800">
                <span>Total</span>
                <span className="text-gray-900">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {step === 'details' && (
                <div className="flex flex-col gap-2 md:gap-3">
                  <button 
                    onClick={() => {
                      if (validateDetails()) {
                        setStep('payment');
                        window.scrollTo(0, 0);
                      }
                    }}
                    className="w-full text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-100"
                    style={{ backgroundColor: 'rgb(39, 96, 27)' }}
                  >
                    {t('nextPayment')}
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <Link to="/cart" className="flex items-center justify-center gap-2 text-gray-400 font-bold hover:text-gray-600 py-1 md:py-2 text-sm">
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                    {t('backToCart')}
                  </Link>
                </div>
              )}

              {step === 'payment' && (
                <div className="flex flex-col gap-4 md:gap-6">
                  <div className="flex flex-col gap-2 md:gap-3">
                    <button 
                      onClick={handlePlaceOrder}
                      disabled={isAdmin || isUploading}
                      className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isAdmin || isUploading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                          : 'text-white hover:opacity-90 shadow-gray-100'
                      }`}
                      style={!(isAdmin || isUploading) ? { backgroundColor: 'rgb(39, 96, 27)' } : {}}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                          {t('processing')}...
                        </>
                      ) : (
                        <>
                          {t('placeOrder')}
                          <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                        </>
                      )}
                    </button>
                    <button onClick={() => {
                      setStep('details');
                      window.scrollTo(0, 0);
                    }} className="flex items-center justify-center gap-2 text-gray-400 font-bold hover:text-gray-600 py-1 md:py-2 text-sm">
                      <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                      {t('backToDetails')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-2xl text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">{t('secureCheckout')}</p>
              <div className="flex justify-center gap-4 opacity-30 grayscale">
                <ShoppingBag className="w-6 h-6" />
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
