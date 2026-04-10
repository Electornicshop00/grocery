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
  const { cart, total, updateQuantity, removeFromCart } = useCart();
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">{t('emptyCart')}</h2>
        <p className="text-gray-500 max-w-md mx-auto">Looks like you haven't added anything to your cart yet. Start shopping to find fresh groceries!</p>
        <Link to="/shop" className="inline-block bg-gray-900 text-white px-8 py-3 rounded-full font-bold hover:bg-black transition-colors">
          {t('startShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2 md:gap-3">
        <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-gray-900" />
        {t('cart')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border overflow-hidden">
            <div className="divide-y">
              {cart.map(item => (
                <div key={item.id} className="p-3 md:p-6 flex gap-3 md:gap-6 items-center">
                  <img 
                    src={item.image || `https://picsum.photos/seed/${item.id}/200/200`} 
                    alt={item.name}
                    className="w-16 h-16 md:w-24 md:h-24 object-cover rounded-lg border"
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
                    <h3 className="font-bold text-gray-800 text-sm md:text-lg truncate">{item.name}</h3>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-1 md:mb-2">{item.category}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm md:text-lg">₹{item.price.toFixed(2)}</span>
                      <div className="flex items-center gap-2 md:gap-3 bg-gray-50 rounded-lg p-0.5 md:p-1 border">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-0.5 md:p-1 hover:bg-gray-200 rounded text-gray-600"
                        >
                          <Minus className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <span className="w-4 md:w-6 text-center text-xs md:text-base font-bold text-gray-800">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-0.5 md:p-1 hover:bg-gray-200 rounded text-gray-600"
                        >
                          <Plus className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border p-5 md:p-8 sticky top-24">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">Cart Summary</h2>
            
            <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="font-bold text-gray-800">₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery Fee</span>
                <span className="text-gray-900 font-bold">FREE</span>
              </div>
              <div className="border-t border-dashed pt-3 md:pt-4 flex justify-between text-xl md:text-2xl font-extrabold text-gray-800">
                <span>Total</span>
                <span className="text-gray-900">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {!user && (
                <div className="bg-blue-50 border border-blue-100 p-3 md:p-4 rounded-xl md:rounded-2xl mb-3 md:mb-4 flex items-start gap-2 md:gap-3">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] md:text-xs text-blue-700 leading-relaxed">
                    You need to be logged in to place an order. We'll save your cart for you!
                  </p>
                </div>
              )}
              {isAdmin && (
                <div className="bg-red-50 border border-red-100 p-3 md:p-4 rounded-xl md:rounded-2xl mb-3 md:mb-4 flex items-start gap-2 md:gap-3">
                  <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] md:text-xs text-red-700 leading-relaxed font-bold">
                    Admin accounts are for management only and cannot place orders.
                  </p>
                </div>
              )}
              <button 
                onClick={() => {
                  if (!user) {
                    showToast('Please login to place an order', 'info');
                    navigate('/auth', { state: { from: '/checkout' } });
                    return;
                  }
                  if (isAdmin) {
                    showToast('Admins cannot place orders', 'error');
                    return;
                  }
                  navigate('/checkout');
                }}
                disabled={isAdmin}
                className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                  isAdmin 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                    : 'text-white hover:opacity-90 shadow-gray-100'
                }`}
                style={!isAdmin ? { backgroundColor: 'rgb(39, 96, 27)' } : {}}
              >
                {t('proceedToCheckout')}
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            <div className="mt-6 md:mt-8 p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl text-center">
              <p className="text-[8px] md:text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1 md:mb-2">{t('secureCheckout')}</p>
              <div className="flex justify-center gap-3 md:gap-4 opacity-30 grayscale">
                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
