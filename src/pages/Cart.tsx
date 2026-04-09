import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { Trash2, Plus, Minus, Send, ShoppingBag, MapPin, Phone, User, MapPinIcon, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, ShieldAlert, Loader2, CreditCard } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

type CheckoutStep = 'cart' | 'payment' | 'details' | 'success';

export default function Cart() {
  const { cart, total, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user, profile, updateUserProfile, isAdmin } = useAuth();
  const { placeOrder } = useOrders();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<CheckoutStep>(location.state?.startStep || 'cart');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'whatsapp' | 'upi'>('cod');
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.displayName || '',
        phone: profile.phone || '',
        address: profile.address || ''
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
          address: `${prev.address ? prev.address + '\n' : ''}Current Location: ${locationStr}`
        }));
        setIsLocating(false);
        showToast(t('locationCaptured'), 'success');
      },
      (error) => {
        console.error("Error getting location:", error);
        showToast('Could not get your location. Please enter it manually.', 'error');
        setIsLocating(false);
      }
    );
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (isAdmin) {
      showToast('Administrators cannot place orders. Please use a customer account.', 'error');
      return;
    }

    try {
      if (profile && (!profile.displayName || !profile.phone || !profile.address)) {
        await updateUserProfile({
          displayName: profile.displayName || formData.name,
          phone: profile.phone || formData.phone,
          address: profile.address || formData.address
        });
      }

      await placeOrder(cart, total, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address
      }, paymentMethod);
      
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
      <div className="max-w-2xl mx-auto text-center py-20 space-y-8">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-32 h-32 rounded-full flex items-center justify-center mx-auto text-white"
          style={{ backgroundColor: 'rgb(39, 96, 27)' }}
        >
          <CheckCircle2 className="w-16 h-16" />
        </motion.div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-gray-800">{t('orderConfirmed')}</h2>
          <p className="text-xl text-gray-500">{t('thankYou')}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6 text-left">
          <div className="flex justify-between items-center border-b pb-4">
            <span className="text-gray-500 font-medium">{t('orderStatus')}</span>
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">{t('processing')}</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-400 uppercase">{t('deliveryTo')}</p>
            <p className="font-bold text-gray-800">{formData.name}</p>
            <p className="text-gray-600">{formData.address}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/orders" 
            className="text-white px-8 py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-colors"
            style={{ backgroundColor: 'rgb(39, 96, 27)' }}
          >
            {t('viewOrders')}
          </Link>
          <Link to="/" className="bg-gray-100 text-gray-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-colors">
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">{t('emptyCart')}</h2>
        <p className="text-gray-500 max-w-md mx-auto">Looks like you haven't added anything to your cart yet. Start shopping to find fresh groceries!</p>
        <Link to="/" className="inline-block bg-gray-900 text-white px-8 py-3 rounded-full font-bold hover:bg-black transition-colors">
          {t('startShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {step !== 'cart' && (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {step === 'cart' && (
            <>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-gray-900" />
                {t('cart')}
              </h1>

              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="divide-y">
                  {cart.map(item => (
                    <div key={item.id} className="p-4 md:p-6 flex gap-4 md:gap-6 items-center">
                      <img 
                        src={item.image || `https://picsum.photos/seed/${item.id}/200/200`} 
                        alt={item.name}
                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg border"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== `https://picsum.photos/seed/${item.id}/200/200`) {
                            target.src = `https://picsum.photos/seed/${item.id}/200/200`;
                          } else {
                            target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200&h=200';
                          }
                        }}
                      />
                      <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-gray-800 md:text-lg truncate">{item.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 md:text-lg">₹{item.price.toFixed(2)}</span>
                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-gray-200 rounded text-gray-600"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-6 text-center font-bold text-gray-800">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-gray-200 rounded text-gray-600"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">{t('paymentMethod')}</h2>
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-6 rounded-3xl border-2 text-left transition-all ${
                    paymentMethod === 'cod' ? 'border-gray-900 bg-gray-50 shadow-md' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                      paymentMethod === 'cod' ? 'text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                    style={paymentMethod === 'cod' ? { backgroundColor: 'rgb(39, 96, 27)' } : {}}
                  >
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-800">{t('cod')}</h3>
                  <p className="text-sm text-gray-500">{t('payAtDelivery')}</p>
                </button>

                <button 
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-6 rounded-3xl border-2 text-left transition-all ${
                    paymentMethod === 'upi' ? 'border-gray-900 bg-gray-50 shadow-md' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                      paymentMethod === 'upi' ? 'text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                    style={paymentMethod === 'upi' ? { backgroundColor: 'rgb(39, 96, 27)' } : {}}
                  >
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-800">{t('upi')}</h3>
                  <p className="text-sm text-gray-500">{t('payOnline')}</p>
                </button>

                <AnimatePresence>
                  {paymentMethod === 'upi' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white p-6 rounded-3xl border-2 border-gray-100 flex flex-col items-center gap-6"
                    >
                      <div className="w-full space-y-4">
                        <a 
                          href={`upi://pay?pa=702986593@ybl&pn=FreshCart&am=${total}&cu=INR&tn=Order%20Payment`}
                          className="w-full text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98]"
                          style={{ backgroundColor: 'rgb(39, 96, 27)' }}
                        >
                          <CreditCard className="w-6 h-6" />
                          {t('payWithUpiApp')}
                        </a>
                        
                        <div className="relative flex items-center justify-center py-2">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-100"></div>
                          </div>
                          <span className="relative bg-white px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">OR</span>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                          <p className="text-sm font-bold text-gray-800 uppercase tracking-wider">{t('scanToPay')}</p>
                          <div className="bg-white p-4 rounded-2xl border shadow-sm">
                            <img 
                              src="https://roasted-lavender-h2bzsr9y86.edgeone.app/IMG_20260406_134936.png" 
                              alt="UPI QR Code"
                              className="w-48 h-48 object-contain"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=702986593@ybl&pn=FreshCart";
                              }}
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-gray-800">UPI ID: 702986593@ybl</p>
                            <p className="text-xs text-gray-500 mt-2 px-4">
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

          {step === 'details' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">{t('deliveryDetails')}</h2>
              <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">{t('fullName')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgb(39, 96, 27)' }} />
                    <input 
                      required
                      type="text" 
                      placeholder={t('fullName')}
                      className="w-full pl-10 pr-4 py-4 border rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">{t('phoneNumber')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgb(39, 96, 27)' }} />
                    <input 
                      required
                      type="tel" 
                      placeholder={t('phoneNumber')}
                      className="w-full pl-10 pr-4 py-4 border rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">{t('deliveryAddress')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-4 w-5 h-5" style={{ color: 'rgb(39, 96, 27)' }} />
                    <textarea 
                      required
                      placeholder={t('deliveryAddress')}
                      rows={4}
                      className="w-full pl-10 pr-4 py-4 border rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none resize-none"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={isLocating}
                      className="absolute right-4 bottom-4 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2 text-xs font-bold border border-gray-100"
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
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border p-8 sticky top-24">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-bold text-gray-800">₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery Fee</span>
                <span className="text-gray-900 font-bold">FREE</span>
              </div>
              <div className="border-t border-dashed pt-4 flex justify-between text-2xl font-extrabold text-gray-800">
                <span>Total</span>
                <span className="text-gray-900">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {step === 'cart' && (
                <>
                  {!user && (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-4 flex items-start gap-3">
                      <User className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                        You need to be logged in to place an order. We'll save your cart for you!
                      </p>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-4 flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 leading-relaxed font-bold">
                        Admin accounts are for management only and cannot place orders.
                      </p>
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      if (!user) {
                        showToast('Please login to place an order', 'info');
                        navigate('/auth', { state: { from: '/cart', startStep: 'details' } });
                        return;
                      }
                      if (isAdmin) {
                        showToast('Admins cannot place orders', 'error');
                        return;
                      }
                      setStep('details');
                    }}
                    disabled={isAdmin}
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                      isAdmin 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                        : 'text-white hover:opacity-90 shadow-gray-100'
                    }`}
                    style={!isAdmin ? { backgroundColor: 'rgb(39, 96, 27)' } : {}}
                  >
                    {t('proceedToCheckout')}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {step === 'details' && (
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      if (!formData.name || !formData.phone || !formData.address) {
                        showToast('Please fill all delivery details', 'error');
                        return;
                      }
                      setStep('payment');
                    }}
                    className="w-full text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-100"
                    style={{ backgroundColor: 'rgb(39, 96, 27)' }}
                  >
                    {t('nextPayment')}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button onClick={() => setStep('cart')} className="flex items-center justify-center gap-2 text-gray-400 font-bold hover:text-gray-600 py-2">
                    <ChevronLeft className="w-4 h-4" />
                    {t('backToCart')}
                  </button>
                </div>
              )}

              {step === 'payment' && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handlePlaceOrder}
                      disabled={isAdmin || isUploading}
                      className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isAdmin || isUploading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                          : 'text-white hover:opacity-90 shadow-gray-100'
                      }`}
                      style={!(isAdmin || isUploading) ? { backgroundColor: 'rgb(39, 96, 27)' } : {}}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          {t('processing')}...
                        </>
                      ) : (
                        <>
                          {t('placeOrder')}
                          <CheckCircle2 className="w-5 h-5" />
                        </>
                      )}
                    </button>
                    <button onClick={() => setStep('details')} className="flex items-center justify-center gap-2 text-gray-400 font-bold hover:text-gray-600 py-2">
                      <ChevronLeft className="w-4 h-4" />
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
